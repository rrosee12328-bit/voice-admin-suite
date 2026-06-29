type EmailPayload = {
  to?: string | string[];
  to_email?: string;
  to_name?: string | null;
  from?: string;
  subject?: string;
  html?: string;
  body_html?: string;
  text?: string;
  body_text?: string;
  tenant_id?: string | null;
  call_id?: string | null;
  email_type?: string;
  call_reason?: string | null;
  outcome?: string | null;
};

const PROJECT_ID = "hygmztvpmmyxuomjwrbt";
const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") || `https://${PROJECT_ID}.supabase.co`).replace(/\/$/, "");
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Deno.env.get("VEKTISS_SUPABASE_SERVICE_ROLE_KEY") ||
  "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = Deno.env.get("RESEND_FROM") || "Vektiss Voice <noreply@vektiss.com>";

const jsonHeaders = { "content-type": "application/json" };

function response(status: number, body?: Record<string, unknown>) {
  return new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: body ? jsonHeaders : undefined,
  });
}

function firstEmail(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function logEmail(payload: EmailPayload, status: string, resendId: string | null, errorMessage: string | null) {
  if (!SERVICE_ROLE_KEY) return;

  const toEmail = payload.to_email || firstEmail(payload.to);
  if (!toEmail) return;

  await fetch(`${SUPABASE_URL}/rest/v1/email_messages`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify({
      tenant_id: payload.tenant_id || null,
      call_id: payload.call_id || null,
      to_email: toEmail,
      to_name: payload.to_name || null,
      from_email: payload.from || FROM_EMAIL,
      subject: payload.subject || "",
      body_html: payload.html || payload.body_html || null,
      body_text: payload.text || payload.body_text || null,
      email_type: payload.email_type || "custom",
      status,
      resend_id: resendId,
      call_reason: payload.call_reason || null,
      outcome: payload.outcome || null,
      error_message: errorMessage,
    }),
  }).catch((error) => console.error("Failed to log email", error));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return response(204);
  if (req.method !== "POST") return response(405, { error: "Method not allowed" });
  if (!RESEND_API_KEY) return response(500, { error: "Missing RESEND_API_KEY" });

  const payload = await req.json() as EmailPayload;
  const to = payload.to || payload.to_email;
  const subject = payload.subject;
  const html = payload.html || payload.body_html;
  const text = payload.text || payload.body_text;

  if (!to || !subject || (!html && !text)) {
    return response(400, { error: "Missing to, subject, and html/text" });
  }

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: payload.from || FROM_EMAIL,
      to,
      subject,
      html,
      text,
    }),
  });

  const textBody = await resendRes.text();
  let result: Record<string, unknown> = {};
  try {
    result = textBody ? JSON.parse(textBody) : {};
  } catch {
    result = { raw: textBody };
  }

  if (!resendRes.ok) {
    await logEmail(payload, "failed", null, textBody.slice(0, 500));
    return response(resendRes.status, { error: "Resend send failed", details: result });
  }

  await logEmail(payload, "sent", typeof result.id === "string" ? result.id : null, null);
  return response(200, { ok: true, resend: result });
});
