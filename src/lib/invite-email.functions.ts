import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  recipientEmail: z.string().email().max(320),
  businessName: z.string().max(255).nullable().optional(),
  plan: z.string().min(1).max(64),
  intakeUrl: z.string().url().max(2048),
  accessToken: z.string().min(10).max(4096),
});

const PLAN_LABELS: Record<string, string> = {
  phone_starter: "Phone Starter",
  phone_email: "Phone + Email",
  ai_front_office: "AI Front Office",
};

// The app's users sign in against the Vektiss Voice backend (same project as
// src/integrations/supabase/client.ts). Token validation MUST happen against
// that same project — validating against any other project always fails.
const VEKTISS_URL = "https://hygmztvpmmyxuomjwrbt.supabase.co";
const VEKTISS_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Z216dHZwbW15eHVvbWp3cmJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTU2MDgsImV4cCI6MjA5NTU3MTYwOH0.ZDH9dTK-Oih5-eTRF_wgllcQru2Xn4qsi6l7rlu670E";

export const sendInviteEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const baseUrl = process.env.VEKTISS_SUPABASE_URL || VEKTISS_URL;
    const anonKey = process.env.VEKTISS_SUPABASE_ANON_KEY || VEKTISS_ANON_KEY;

    // Verify the caller's identity against the SAME auth backend that issued
    // the token (the Vektiss Voice project), via a direct Auth API call.
    const userRes = await fetch(`${baseUrl}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${data.accessToken}`,
      },
    });
    if (!userRes.ok) {
      const body = await userRes.text().catch(() => "");
      console.error(`[sendInviteEmail] auth check failed (${userRes.status}): ${body.slice(0, 300)}`);
      throw new Error("Unauthorized: could not verify caller identity.");
    }
    const user = (await userRes.json()) as { id?: string };
    if (!user?.id) {
      throw new Error("Unauthorized: could not verify caller identity.");
    }

    // Check the admin role in the same project's profiles table, acting as
    // the caller (RLS applies as that user).
    const profileRes = await fetch(
      `${baseUrl}/rest/v1/profiles?id=eq.${user.id}&select=role`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${data.accessToken}`,
        },
      },
    );
    if (!profileRes.ok) {
      const body = await profileRes.text().catch(() => "");
      throw new Error(`Authorization check failed (${profileRes.status}): ${body.slice(0, 300)}`);
    }
    const rows = (await profileRes.json()) as Array<{ role?: string }>;
    const role = rows?.[0]?.role;
    if (role !== "admin" && role !== "super_admin") {
      throw new Error("Forbidden: admin role required to send invites.");
    }

    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const from = process.env.RESEND_FROM || "Vektiss Support <support@support.vektiss.com>";
    const planLabel = PLAN_LABELS[data.plan] || data.plan;
    const greetingName = data.businessName ? ` ${data.businessName}` : "";

    const subject = `Your Vektiss ${planLabel} setup link`;
    const html = `
<!doctype html>
<html><body style="font-family:Arial,sans-serif;background:#ffffff;color:#111;padding:24px;">
  <div style="max-width:560px;margin:0 auto;">
    <h2 style="margin:0 0 12px;">Welcome${greetingName}!</h2>
    <p>You've been invited to set up your <strong>${planLabel}</strong> plan with Vektiss.</p>
    <p>Click below to complete your intake, review your plan, accept the terms, and finish payment:</p>
    <p style="margin:24px 0;">
      <a href="${data.intakeUrl}"
         style="background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">
        Start setup
      </a>
    </p>
    <p style="font-size:12px;color:#666;word-break:break-all;">Or open this link: ${data.intakeUrl}</p>
  </div>
</body></html>`.trim();

    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from,
        to: [data.recipientEmail],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Resend send failed (${res.status}): ${body.slice(0, 300)}`);
    }
    return { ok: true as const };
  });
