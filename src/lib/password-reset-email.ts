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

export async function deliverPasswordResetEmail(args: { email: string; redirectTo: string }) {
  const { baseUrl, serviceKey } = vektissEnv();
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!serviceKey) throw new Error("VEKTISS_SUPABASE_SERVICE_ROLE_KEY is not configured");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

  const linkRes = await fetch(`${baseUrl}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "recovery",
      email: args.email,
      options: { redirect_to: args.redirectTo },
    }),
  });

  if (!linkRes.ok) {
    const body = await linkRes.text().catch(() => "");
    throw new Error(`Could not create reset link (${linkRes.status}): ${body.slice(0, 300)}`);
  }

  const linkBody = (await linkRes.json()) as {
    action_link?: string;
    hashed_token?: string;
    properties?: { hashed_token?: string };
  };
  const tokenHash = linkBody.properties?.hashed_token || linkBody.hashed_token;
  if (!tokenHash) throw new Error("Supabase did not return a reset token.");

  const resetUrl = new URL(args.redirectTo);
  resetUrl.searchParams.set("token_hash", tokenHash);
  resetUrl.searchParams.set("type", "recovery");

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
