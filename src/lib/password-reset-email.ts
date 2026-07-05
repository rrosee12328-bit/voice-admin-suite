const VEKTISS_SUPABASE_PROJECT_ID = "hygmztvpmmyxuomjwrbt";
const VEKTISS_SUPABASE_URL = `https://${VEKTISS_SUPABASE_PROJECT_ID}.supabase.co`;

function vektissEnv() {
  const configuredUrl = process.env.VEKTISS_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const matchesProduction = configuredUrl.includes(VEKTISS_SUPABASE_PROJECT_ID);

  return {
    baseUrl: matchesProduction && configuredUrl ? configuredUrl : VEKTISS_SUPABASE_URL,
    serviceKey: process.env.VEKTISS_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function stringToBase64Url(value: string) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64UrlToString(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function createResetToken(args: { email: string; userId: string; serviceKey: string }) {
  const payload = stringToBase64Url(
    JSON.stringify({
      email: args.email,
      userId: args.userId,
      exp: Date.now() + 30 * 60 * 1000,
    }),
  );
  const signature = await sign(payload, args.serviceKey);
  return `${payload}.${signature}`;
}

async function verifyResetToken(token: string, serviceKey: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) throw new Error("Invalid password reset token.");

  const expected = await sign(payload, serviceKey);
  if (!timingSafeEqual(signature, expected)) throw new Error("Invalid password reset token.");

  const parsed = JSON.parse(base64UrlToString(payload)) as {
    email?: string;
    userId?: string;
    exp?: number;
  };
  if (!parsed.email || !parsed.userId || !parsed.exp) throw new Error("Invalid password reset token.");
  if (Date.now() > parsed.exp) throw new Error("This password reset link has expired.");

  return { email: parsed.email, userId: parsed.userId };
}

async function findAuthUserByEmail(baseUrl: string, serviceKey: string, email: string) {
  const encodedEmail = encodeURIComponent(email);
  const res = await fetch(
    `${baseUrl}/rest/v1/profiles?select=id,email&email=eq.${encodedEmail}&limit=1`,
    {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Could not look up account (${res.status}): ${body.slice(0, 300)}`);
  }
  const rows = (await res.json()) as Array<{ id?: string; email?: string | null }>;
  const profile = rows.find((row) => row.id && row.email?.toLowerCase() === email.toLowerCase());
  return profile ? { id: profile.id, email: profile.email } : null;
}

export async function deliverPasswordResetEmail(args: { email: string; redirectTo: string }) {
  const { baseUrl, serviceKey } = vektissEnv();
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!serviceKey) throw new Error("VEKTISS_SUPABASE_SERVICE_ROLE_KEY is not configured");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

  const user = await findAuthUserByEmail(baseUrl, serviceKey, args.email);
  if (!user?.id || !user.email) throw new Error("No Vektiss account found for that email.");

  const resetToken = await createResetToken({
    email: user.email,
    userId: user.id,
    serviceKey,
  });

  const resetUrl = new URL(args.redirectTo);
  resetUrl.searchParams.set("reset_token", resetToken);

  const from = process.env.RESEND_FROM || "Vektiss Support <support@support.vektiss.com>";
  const subject = "Reset your Vektiss Voice password";
  const safeEmail = escapeHtml(args.email);
  const safeResetUrl = escapeHtml(resetUrl.toString());
  const html = `
<!doctype html>
<html>
  <body style="margin:0;background:#f4f7fb;color:#0f172a;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:32px 18px;">
      <div style="background:#0d6efd;border-radius:16px 16px 0 0;padding:24px 28px;color:#ffffff;">
        <div style="font-size:22px;font-weight:700;letter-spacing:0.2px;">VEKTISS</div>
        <div style="margin-top:6px;font-size:14px;opacity:0.9;">Vektiss Voice account recovery</div>
      </div>
      <div style="background:#ffffff;border:1px solid #dbe4f0;border-top:0;border-radius:0 0 16px 16px;padding:28px;">
        <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;">Reset your password</h1>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#475569;">
          We received a request to reset the password for <strong>${safeEmail}</strong>.
        </p>
        <p style="margin:24px 0;">
          <a href="${safeResetUrl}"
             style="background:#0d6efd;color:#ffffff;padding:13px 20px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700;">
            Set a new password
          </a>
        </p>
        <p style="margin:0 0 18px;font-size:13px;line-height:1.5;color:#64748b;">
          If you did not request this, you can ignore this email.
        </p>
        <p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:#64748b;word-break:break-all;">
          Or open this link: ${safeResetUrl}
        </p>
      </div>
    </div>
  </body>
</html>`.trim();

  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify({
      from,
      to: [args.email],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${body.slice(0, 300)}`);
  }

  return { ok: true as const };
}

export async function updatePasswordWithResetToken(args: { resetToken: string; password: string }) {
  const { baseUrl, serviceKey } = vektissEnv();
  if (!serviceKey) throw new Error("VEKTISS_SUPABASE_SERVICE_ROLE_KEY is not configured");

  const verified = await verifyResetToken(args.resetToken, serviceKey);
  const authRes = await fetch(`${baseUrl}/auth/v1/admin/users/${verified.userId}`, {
    method: "PUT",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password: args.password, email_confirm: true }),
  });

  if (!authRes.ok) {
    const body = await authRes.text().catch(() => "");
    throw new Error(`Password update failed (${authRes.status}): ${body.slice(0, 300)}`);
  }

  return { ok: true as const, email: verified.email };
}
