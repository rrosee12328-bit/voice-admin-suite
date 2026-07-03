import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const VEKTISS_SUPABASE_PROJECT_ID = "hygmztvpmmyxuomjwrbt";
const VEKTISS_SUPABASE_URL = `https://${VEKTISS_SUPABASE_PROJECT_ID}.supabase.co`;
const VEKTISS_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Z216dHZwbW15eHVvbWp3cmJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTU2MDgsImV4cCI6MjA5NTU3MTYwOH0.ZDH9dTK-Oih5-eTRF_wgllcQru2Xn4qsi6l7rlu670E";

function vektissEnv() {
  const configuredUrl = process.env.VEKTISS_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const configuredAnonKey =
    process.env.VEKTISS_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "";
  const matchesProduction = configuredUrl.includes(VEKTISS_SUPABASE_PROJECT_ID);

  return {
    baseUrl: matchesProduction && configuredUrl ? configuredUrl : VEKTISS_SUPABASE_URL,
    anonKey: matchesProduction && configuredAnonKey ? configuredAnonKey : VEKTISS_SUPABASE_ANON_KEY,
    serviceKey: process.env.VEKTISS_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

async function requireSuperAdmin(accessToken: string) {
  const { baseUrl, anonKey } = vektissEnv();
  if (!baseUrl) throw new Error("SUPABASE_URL is not configured");
  if (!anonKey) throw new Error("SUPABASE_PUBLISHABLE_KEY is not configured");

  const userRes = await fetch(`${baseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
  });
  if (!userRes.ok) throw new Error("Unauthorized: could not verify caller.");
  const user = (await userRes.json()) as { id?: string };
  if (!user.id) throw new Error("Unauthorized: could not verify caller.");

  const profRes = await fetch(
    `${baseUrl}/rest/v1/profiles?id=eq.${user.id}&select=role`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` } },
  );
  const rows = (await profRes.json()) as Array<{ role?: string }>;
  const role = rows?.[0]?.role;
  if (role !== "super_admin" && role !== "admin") {
    throw new Error("Forbidden: super admin role required.");
  }
  return user.id;
}

const ResetSchema = z.object({
  email: z.string().email().max(320),
  accessToken: z.string().min(10).max(4096),
  redirectTo: z.string().url().max(2048).optional(),
});

export const sendClientPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ResetSchema.parse(input))
  .handler(async ({ data }) => {
    await requireSuperAdmin(data.accessToken);
    const { baseUrl, anonKey } = vektissEnv();

    const body: Record<string, unknown> = { email: data.email };
    if (data.redirectTo) body.redirect_to = data.redirectTo;

    const res = await fetch(`${baseUrl}/auth/v1/recover`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Reset email failed (${res.status}): ${text.slice(0, 300)}`);
    }
    return { ok: true as const };
  });

const UpdateEmailSchema = z.object({
  userId: z.string().uuid(),
  newEmail: z.string().email().max(320),
  accessToken: z.string().min(10).max(4096),
});

export const updateClientEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => UpdateEmailSchema.parse(input))
  .handler(async ({ data }) => {
    await requireSuperAdmin(data.accessToken);
    const { baseUrl, anonKey, serviceKey } = vektissEnv();
    if (!serviceKey) {
      throw new Error(
        "Updating a client's email requires the Vektiss service-role key. Add VEKTISS_SUPABASE_SERVICE_ROLE_KEY in project secrets.",
      );
    }

    // Update auth.users email via Admin API
    const authRes = await fetch(`${baseUrl}/auth/v1/admin/users/${data.userId}`, {
      method: "PUT",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: data.newEmail, email_confirm: true }),
    });
    if (!authRes.ok) {
      const text = await authRes.text().catch(() => "");
      throw new Error(`Auth update failed (${authRes.status}): ${text.slice(0, 300)}`);
    }

    // Mirror to profiles.email (best-effort, ignore if column absent)
    await fetch(
      `${baseUrl}/rest/v1/profiles?id=eq.${data.userId}`,
      {
        method: "PATCH",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ email: data.newEmail }),
      },
    ).catch(() => {});

    // Trigger password reset so they can set a password for the new email
    await fetch(`${baseUrl}/auth/v1/recover`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.newEmail }),
    }).catch(() => {});

    return { ok: true as const };
  });

const UserIdSchema = z.object({
  userId: z.string().uuid(),
  accessToken: z.string().min(10).max(4096),
});

const TenantAccountSchema = z.object({
  tenantId: z.string().uuid(),
  accessToken: z.string().min(10).max(4096),
});

const UpsertTenantAccountSchema = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email().max(320),
  phone: z.string().trim().max(32).optional().default(""),
  name: z.string().trim().max(255).optional().default(""),
  accessToken: z.string().min(10).max(4096),
});

async function findAuthUserByEmail(baseUrl: string, serviceKey: string, email: string): Promise<{ id: string; email: string | null } | null> {
  const res = await fetch(`${baseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { users?: Array<{ id?: string; email?: string | null }> };
  const user = json.users?.find((item) => item.id && item.email?.toLowerCase() === email.toLowerCase());
  return user?.id ? { id: user.id, email: user.email ?? null } : null;
}

export const getClientAccountForTenant = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TenantAccountSchema.parse(input))
  .handler(async ({ data }) => {
    await requireSuperAdmin(data.accessToken);
    const { baseUrl, serviceKey } = vektissEnv();
    if (!serviceKey) {
      throw new Error(
        "Reading client account details requires VEKTISS_SUPABASE_SERVICE_ROLE_KEY in project secrets.",
      );
    }

    const profileRes = await fetch(
      `${baseUrl}/rest/v1/profiles?tenant_id=eq.${data.tenantId}&select=id,tenant_id,role,name,email&order=role.asc&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    if (!profileRes.ok) {
      const text = await profileRes.text().catch(() => "");
      throw new Error(`Profile read failed (${profileRes.status}): ${text.slice(0, 300)}`);
    }
    const profiles = (await profileRes.json()) as Array<{
      id: string;
      tenant_id: string | null;
      role: string | null;
      name: string | null;
      email: string | null;
    }>;
    const profile = profiles[0] ?? null;
    if (!profile?.id) return { profile: null, auth: null };

    const authRes = await fetch(`${baseUrl}/auth/v1/admin/users/${profile.id}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!authRes.ok) {
      return {
        profile: {
          id: profile.id,
          tenant_id: profile.tenant_id,
          role: profile.role ?? "client_admin",
          full_name: profile.name,
          name: profile.name,
          email: profile.email,
        },
        auth: null,
      };
    }
    const u = (await authRes.json()) as {
      email?: string | null;
      phone?: string | null;
      email_confirmed_at?: string | null;
      phone_confirmed_at?: string | null;
      last_sign_in_at?: string | null;
    };
    return {
      profile: {
        id: profile.id,
        tenant_id: profile.tenant_id,
        role: profile.role ?? "client_admin",
        full_name: profile.name,
        name: profile.name,
        email: profile.email,
      },
      auth: {
        email: u.email ?? profile.email ?? null,
        phone: u.phone ?? null,
        emailConfirmedAt: u.email_confirmed_at ?? null,
        phoneConfirmedAt: u.phone_confirmed_at ?? null,
        lastSignInAt: u.last_sign_in_at ?? null,
      },
    };
  });

export const createOrUpdateClientAccountForTenant = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => UpsertTenantAccountSchema.parse(input))
  .handler(async ({ data }) => {
    await requireSuperAdmin(data.accessToken);
    const { baseUrl, anonKey, serviceKey } = vektissEnv();
    if (!serviceKey) {
      throw new Error(
        "Creating or updating a client account requires VEKTISS_SUPABASE_SERVICE_ROLE_KEY in project secrets.",
      );
    }

    const cleanedPhone = data.phone.replace(/[^\d+]/g, "");
    if (cleanedPhone && !/^\+?\d{7,15}$/.test(cleanedPhone)) {
      throw new Error("Phone must be 7–15 digits, optionally starting with '+'.");
    }

    const profileRes = await fetch(
      `${baseUrl}/rest/v1/profiles?tenant_id=eq.${data.tenantId}&select=id&order=role.asc&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    const profiles = profileRes.ok ? ((await profileRes.json()) as Array<{ id: string }>) : [];
    let userId: string | null = profiles[0]?.id || null;

    if (!userId) {
      const existing = await findAuthUserByEmail(baseUrl, serviceKey, data.email);
      userId = existing?.id ?? null;
    }

    if (!userId) {
      const createBody: Record<string, unknown> = {
        email: data.email,
        email_confirm: true,
        user_metadata: data.name ? { name: data.name } : {},
      };
      if (cleanedPhone) {
        createBody.phone = cleanedPhone;
        createBody.phone_confirm = true;
      }
      const createRes = await fetch(`${baseUrl}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createBody),
      });
      if (!createRes.ok) {
        const existing = await findAuthUserByEmail(baseUrl, serviceKey, data.email);
        if (!existing?.id) {
          const text = await createRes.text().catch(() => "");
          throw new Error(`Account create failed (${createRes.status}): ${text.slice(0, 300)}`);
        }
        userId = existing.id;
      } else {
        const created = (await createRes.json()) as { id?: string };
        userId = created.id ?? null;
      }
    }

    if (!userId) throw new Error("Could not create or locate the client account.");

    const updateBody: Record<string, unknown> = { email: data.email, email_confirm: true };
    updateBody.phone = cleanedPhone || "";
    if (cleanedPhone) updateBody.phone_confirm = true;
    const authRes = await fetch(`${baseUrl}/auth/v1/admin/users/${userId}`, {
      method: "PUT",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateBody),
    });
    if (!authRes.ok) {
      const text = await authRes.text().catch(() => "");
      throw new Error(`Account update failed (${authRes.status}): ${text.slice(0, 300)}`);
    }

    const profilePayload = {
      id: userId,
      tenant_id: data.tenantId,
      role: "client_admin",
      email: data.email,
      name: data.name || null,
    };
    const upsertProfileRes = await fetch(`${baseUrl}/rest/v1/profiles?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(profilePayload),
    });
    if (!upsertProfileRes.ok) {
      const text = await upsertProfileRes.text().catch(() => "");
      throw new Error(`Profile update failed (${upsertProfileRes.status}): ${text.slice(0, 300)}`);
    }

    await fetch(`${baseUrl}/auth/v1/recover`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email }),
    }).catch(() => {});

    return {
      ok: true as const,
      profile: profilePayload,
      auth: { email: data.email, phone: cleanedPhone || null },
    };
  });

export const getClientAuthInfo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => UserIdSchema.parse(input))
  .handler(async ({ data }) => {
    await requireSuperAdmin(data.accessToken);
    const { baseUrl, serviceKey } = vektissEnv();
    if (!serviceKey) {
      throw new Error(
        "Reading auth details requires VEKTISS_SUPABASE_SERVICE_ROLE_KEY in project secrets.",
      );
    }
    const res = await fetch(`${baseUrl}/auth/v1/admin/users/${data.userId}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!res.ok) {
      return {
        email: null,
        phone: null,
        emailConfirmedAt: null,
        phoneConfirmedAt: null,
        lastSignInAt: null,
      };
    }
    const u = (await res.json()) as {
      email?: string | null;
      phone?: string | null;
      email_confirmed_at?: string | null;
      phone_confirmed_at?: string | null;
      last_sign_in_at?: string | null;
    };
    return {
      email: u.email ?? null,
      phone: u.phone ?? null,
      emailConfirmedAt: u.email_confirmed_at ?? null,
      phoneConfirmedAt: u.phone_confirmed_at ?? null,
      lastSignInAt: u.last_sign_in_at ?? null,
    };
  });

const UpdatePhoneSchema = z.object({
  userId: z.string().uuid(),
  newPhone: z.string().trim().max(32),
  accessToken: z.string().min(10).max(4096),
});

export const updateClientPhone = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => UpdatePhoneSchema.parse(input))
  .handler(async ({ data }) => {
    await requireSuperAdmin(data.accessToken);
    const { baseUrl, serviceKey } = vektissEnv();
    if (!serviceKey) {
      throw new Error(
        "Updating a client's phone requires VEKTISS_SUPABASE_SERVICE_ROLE_KEY in project secrets.",
      );
    }
    const cleaned = data.newPhone.replace(/[^\d+]/g, "");
    if (cleaned && !/^\+?\d{7,15}$/.test(cleaned)) {
      throw new Error("Phone must be 7–15 digits, optionally starting with '+'.");
    }
    const body: Record<string, unknown> = cleaned
      ? { phone: cleaned, phone_confirm: true }
      : { phone: "" };
    const res = await fetch(`${baseUrl}/auth/v1/admin/users/${data.userId}`, {
      method: "PUT",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Phone update failed (${res.status}): ${text.slice(0, 300)}`);
    }
    return { ok: true as const, phone: cleaned || null };
  });
