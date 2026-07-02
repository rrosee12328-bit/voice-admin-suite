type JsonObject = Record<string, unknown>;

const PROJECT_ID = "hygmztvpmmyxuomjwrbt";
const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") || `https://${PROJECT_ID}.supabase.co`).replace(/\/$/, "");
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Deno.env.get("VEKTISS_SUPABASE_SERVICE_ROLE_KEY") ||
  "";
const RETELL_API_KEY = Deno.env.get("RETELL_API_KEY") || "";
const RETELL_API_KEYS = [
  RETELL_API_KEY,
  ...((Deno.env.get("RETELL_API_KEYS") || "")
    .split(/[\n,]/)
    .map((key) => key.trim())
    .filter(Boolean)),
].filter((key, index, keys) => key && keys.indexOf(key) === index);
const RETELL_WEBHOOK_TOKEN = Deno.env.get("RETELL_WEBHOOK_TOKEN") || "";
const DEFAULT_TENANT_ID = Deno.env.get("DEFAULT_TENANT_ID") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = Deno.env.get("RESEND_FROM") || "Vektiss Voice <noreply@vektiss.com>";
const DASHBOARD_URL = (Deno.env.get("DASHBOARD_URL") || Deno.env.get("SITE_URL") || "https://voice.vektiss.com").replace(/\/$/, "");

const jsonHeaders = { "content-type": "application/json" };

function response(status: number, body?: JsonObject) {
  return new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: body ? jsonHeaders : undefined,
  });
}

function supabaseHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: SERVICE_ROLE_KEY,
    authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "content-type": "application/json",
    ...extra,
  };
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function asString(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "y", "1", "booked"].includes(normalized)) return true;
    if (["false", "no", "n", "0", "not_booked"].includes(normalized)) return false;
  }
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const text = asString(value);
    if (text) return text;
  }
  return null;
}

function normalizePhone(value: unknown) {
  const text = asString(value);
  if (!text) return null;
  const digits = text.replace(/\D/g, "");
  if (!digits) return null;
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function phonesMatch(left: unknown, right: unknown) {
  const a = normalizePhone(left);
  const b = normalizePhone(right);
  return !!a && !!b && a === b;
}

function stringsMatch(left: unknown, right: unknown) {
  const a = asString(left);
  const b = asString(right);
  return !!a && !!b && a === b;
}

async function hmacHex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let i = 0; i < left.length; i++) result |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return result === 0;
}

async function verifyRequest(req: Request, rawBody: string) {
  if (RETELL_WEBHOOK_TOKEN) {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const token = url.searchParams.get("token") || parts[parts.length - 1] || "";
    if (constantTimeEqual(token, RETELL_WEBHOOK_TOKEN)) return true;
  }

  if (RETELL_API_KEYS.length === 0) return !RETELL_WEBHOOK_TOKEN;
  const signature = req.headers.get("x-retell-signature");
  if (!signature) return false;

  const match = signature.match(/^v=(\d+),d=([a-f0-9]+)$/i);
  if (!match) return false;

  const timestamp = Number(match[1]);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) {
    return false;
  }

  const provided = match[2].toLowerCase();
  for (const apiKey of RETELL_API_KEYS) {
    const expected = await hmacHex(apiKey, rawBody + match[1]);
    if (constantTimeEqual(expected, provided)) return true;
  }
  return false;
}

async function rest<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  if (!SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: supabaseHeaders((init.headers as Record<string, string>) || {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text}`);
  return text ? JSON.parse(text) as T : null as T;
}

async function sendEmail(payload: {
  to: string;
  toName?: string | null;
  tenantId?: string | null;
  callId?: string | null;
  subject: string;
  html: string;
  text: string;
  callReason?: string | null;
  outcome?: string | null;
}) {
  if (!RESEND_API_KEY) {
    console.warn("Skipping call notification email: missing RESEND_API_KEY");
    return;
  }

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  const body = await resendRes.text();
  let resendId: string | null = null;
  try {
    const parsed = body ? JSON.parse(body) as JsonObject : {};
    resendId = asString(parsed.id);
  } catch {
    // Keep the raw body for the email log below.
  }

  await rest("email_messages", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      tenant_id: payload.tenantId || null,
      call_id: payload.callId || null,
      to_email: payload.to,
      to_name: payload.toName || null,
      from_email: FROM_EMAIL,
      subject: payload.subject,
      body_html: payload.html,
      body_text: payload.text,
      email_type: "custom",
      status: resendRes.ok ? "sent" : "failed",
      resend_id: resendId,
      call_reason: payload.callReason || null,
      outcome: payload.outcome || null,
      error_message: resendRes.ok ? null : body.slice(0, 500),
    }),
  });

  if (!resendRes.ok) throw new Error(`Resend ${resendRes.status}: ${body.slice(0, 500)}`);
}

async function findTenant(call: JsonObject) {
  const metadata = asObject(call.metadata);
  const dynamic = asObject(call.retell_llm_dynamic_variables);
  const tenantHint = firstString(metadata.tenant_id, dynamic.tenant_id, DEFAULT_TENANT_ID);
  if (tenantHint) return tenantHint;

  const tenants = await rest<Array<{
    id: string;
    retell_agent_id: string | null;
    retell_agent_ids: string[] | null;
    retell_phone_number: string | null;
    retell_phone_numbers: string[] | null;
  }>>("tenants?select=id,retell_agent_id,retell_agent_ids,retell_phone_number,retell_phone_numbers&limit=1000");

  const agentId = call.agent_id;
  const toNumber = call.to_number;
  const fromNumber = call.from_number;

  const byAgent = tenants.find((tenant) =>
    stringsMatch(tenant.retell_agent_id, agentId) ||
    (tenant.retell_agent_ids || []).some((id) => stringsMatch(id, agentId))
  );
  if (byAgent) return byAgent.id;

  const byPhone = tenants.find((tenant) =>
    phonesMatch(tenant.retell_phone_number, toNumber) ||
    phonesMatch(tenant.retell_phone_number, fromNumber) ||
    (tenant.retell_phone_numbers || []).some((phone) => phonesMatch(phone, toNumber) || phonesMatch(phone, fromNumber))
  );
  return byPhone?.id || null;
}

async function getTenantName(tenantId: string | null) {
  if (!tenantId) return "Unknown workspace";
  const rows = await rest<Array<{ name: string | null }>>(
    `tenants?select=name&id=eq.${encodeURIComponent(tenantId)}&limit=1`,
  );
  return rows[0]?.name || "Unknown workspace";
}

function durationSeconds(call: JsonObject) {
  const direct = asNumber(call.duration_seconds) ?? asNumber(call.duration_sec);
  if (direct != null) return Math.round(direct);

  const durationMs = asNumber(call.duration_ms);
  if (durationMs != null) return Math.round(durationMs / 1000);

  const start = asNumber(call.start_timestamp);
  const end = asNumber(call.end_timestamp);
  if (start != null && end != null && end >= start) return Math.round((end - start) / 1000);

  return null;
}

function buildCallPatch(event: string, call: JsonObject, tenantId: string | null) {
  const metadata = asObject(call.metadata);
  const dynamic = asObject(call.retell_llm_dynamic_variables);
  const analysis = asObject(call.call_analysis);
  const custom = asObject(analysis.custom_analysis_data);
  const direction = asString(call.direction);
  const callStatus = firstString(call.call_status, event);
  const outcome = firstString(custom.outcome, custom.call_outcome) ||
    (callStatus === "ended" ? "completed" : callStatus);

  const callerPhone = direction === "outbound"
    ? firstString(call.to_number, metadata.caller_phone, dynamic.caller_phone)
    : firstString(call.from_number, metadata.caller_phone, dynamic.caller_phone);

  return {
    ...(tenantId ? { tenant_id: tenantId } : {}),
    retell_call_id: firstString(call.call_id),
    caller_name: firstString(
      custom.caller_name,
      custom.customer_name,
      dynamic.caller_name,
      dynamic.customer_name,
      dynamic.name,
      metadata.caller_name,
      metadata.customer_name,
    ),
    caller_phone: callerPhone,
    caller_email: firstString(custom.caller_email, custom.email, dynamic.caller_email, dynamic.email, metadata.caller_email, metadata.email),
    call_reason: firstString(custom.call_reason, custom.reason, custom.intent, dynamic.call_reason, dynamic.reason, metadata.call_reason),
    outcome,
    call_summary: firstString(custom.call_summary, analysis.call_summary),
    is_new_patient: asBoolean(custom.is_new_patient ?? custom.new_patient ?? dynamic.is_new_patient ?? metadata.is_new_patient),
    appointment_booked: asBoolean(custom.appointment_booked ?? custom.appointment_scheduled ?? custom.booked ?? dynamic.appointment_booked),
    transferred: event.startsWith("transfer_") || asBoolean(custom.transferred ?? dynamic.transferred) || false,
    duration_seconds: durationSeconds(call),
    recording_url: firstString(call.recording_url),
    transcript: firstString(call.transcript),
    lead_score: asNumber(custom.lead_score ?? custom.score ?? dynamic.lead_score),
    status: event === "call_started" ? "in_progress" : "needs_follow_up",
    updated_at: new Date().toISOString(),
  };
}

type StoredCall = {
  id: string;
  tenant_id: string | null;
  caller_name: string | null;
  caller_phone: string | null;
  caller_email: string | null;
  call_reason: string | null;
  outcome: string | null;
  call_summary: string | null;
  duration_seconds: number | null;
  recording_url: string | null;
  transcript: string | null;
  retell_call_id: string | null;
  created_at: string;
};

async function upsertCall(event: string, call: JsonObject, tenantId: string | null) {
  const retellCallId = asString(call.call_id);
  if (!retellCallId) return null;

  const patch = buildCallPatch(event, call, tenantId);
  const encodedId = encodeURIComponent(retellCallId);
  const existing = await rest<Array<{ id: string }>>(`calls?select=id&retell_call_id=eq.${encodedId}&limit=1`);

  if (existing[0]?.id) {
    const id = encodeURIComponent(existing[0].id);
    const rows = await rest<StoredCall[]>(`calls?id=eq.${id}`, {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify(patch),
    });
    return rows[0] || null;
  }

  const rows = await rest<StoredCall[]>("calls", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({ ...patch, retell_call_id: retellCallId }),
  });
  return rows[0] || null;
}

function isCallNotificationReady(event: string, call: JsonObject, storedCall: StoredCall | null) {
  if (!storedCall?.id) return false;
  if (event === "call_started") return false;

  const status = firstString(call.call_status, event)?.toLowerCase() || "";
  const hasCallContent = !!(storedCall.call_summary || storedCall.transcript || storedCall.recording_url);
  return event.toLowerCase().includes("analy") || status === "ended" || status === "completed" || hasCallContent;
}

async function getNotificationRecipients(tenantId: string | null) {
  const recipients = new Map<string, { email: string; name: string | null }>();
  const addProfiles = (profiles: Array<{ email: string | null; name: string | null }>) => {
    for (const profile of profiles) {
      const email = asString(profile.email)?.toLowerCase();
      if (email && !recipients.has(email)) recipients.set(email, { email, name: profile.name || null });
    }
  };

  const superAdmins = await rest<Array<{ email: string | null; name: string | null }>>(
    "profiles?select=email,name&role=eq.super_admin",
  );
  addProfiles(superAdmins);

  if (tenantId) {
    const clientProfiles = await rest<Array<{ email: string | null; name: string | null }>>(
      `profiles?select=email,name&tenant_id=eq.${encodeURIComponent(tenantId)}`,
    );
    addProfiles(clientProfiles);
  }

  return Array.from(recipients.values());
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds < 1) return "Unknown";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return minutes ? `${minutes}m ${remaining}s` : `${remaining}s`;
}

function buildNotificationEmail(tenantName: string, call: StoredCall) {
  const caller = call.caller_name || call.caller_phone || "Unknown caller";
  const subject = `New ${tenantName} call: ${caller}`;
  const callUrl = `${DASHBOARD_URL}/dashboard/calls/${call.id}`;
  const summary = call.call_summary || "No call summary is available yet.";
  const transcriptPreview = call.transcript ? call.transcript.slice(0, 1200) : "";

  const text = [
    `New call for ${tenantName}`,
    "",
    `Caller: ${caller}`,
    call.caller_phone ? `Phone: ${call.caller_phone}` : null,
    call.caller_email ? `Email: ${call.caller_email}` : null,
    `Duration: ${formatDuration(call.duration_seconds)}`,
    call.outcome ? `Outcome: ${call.outcome}` : null,
    call.call_reason ? `Reason: ${call.call_reason}` : null,
    "",
    "Summary:",
    summary,
    transcriptPreview ? "" : null,
    transcriptPreview ? "Transcript preview:" : null,
    transcriptPreview || null,
    "",
    `Open in dashboard: ${callUrl}`,
    call.recording_url ? `Recording: ${call.recording_url}` : null,
  ].filter(Boolean).join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
      <h2 style="margin:0 0 12px">New call for ${escapeHtml(tenantName)}</h2>
      <p><strong>Caller:</strong> ${escapeHtml(caller)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(call.caller_phone || "Unknown")}</p>
      ${call.caller_email ? `<p><strong>Email:</strong> ${escapeHtml(call.caller_email)}</p>` : ""}
      <p><strong>Duration:</strong> ${escapeHtml(formatDuration(call.duration_seconds))}</p>
      ${call.outcome ? `<p><strong>Outcome:</strong> ${escapeHtml(call.outcome)}</p>` : ""}
      ${call.call_reason ? `<p><strong>Reason:</strong> ${escapeHtml(call.call_reason)}</p>` : ""}
      <h3 style="margin:18px 0 8px">Summary</h3>
      <p>${escapeHtml(summary)}</p>
      ${transcriptPreview ? `<h3 style="margin:18px 0 8px">Transcript Preview</h3><pre style="white-space:pre-wrap;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px">${escapeHtml(transcriptPreview)}</pre>` : ""}
      <p style="margin-top:18px"><a href="${escapeHtml(callUrl)}">Open this call in the dashboard</a></p>
      ${call.recording_url ? `<p><a href="${escapeHtml(call.recording_url)}">Listen to the recording</a></p>` : ""}
    </div>
  `;

  return { subject, text, html };
}

async function notifyCallComplete(event: string, callPayload: JsonObject, storedCall: StoredCall | null) {
  if (!isCallNotificationReady(event, callPayload, storedCall)) return;

  const tenantId = storedCall.tenant_id;
  const tenantName = await getTenantName(tenantId);
  const recipients = await getNotificationRecipients(tenantId);
  if (recipients.length === 0) return;

  const email = buildNotificationEmail(tenantName, storedCall);
  for (const recipient of recipients) {
    const existing = await rest<Array<{ id: string }>>(
      `email_messages?select=id&call_id=eq.${encodeURIComponent(storedCall.id)}&to_email=eq.${encodeURIComponent(recipient.email)}&limit=1`,
    );
    if (existing[0]?.id) continue;

    try {
      await sendEmail({
        to: recipient.email,
        toName: recipient.name,
        tenantId,
        callId: storedCall.id,
        subject: email.subject,
        html: email.html,
        text: email.text,
        callReason: storedCall.call_reason,
        outcome: storedCall.outcome,
      });
    } catch (error) {
      console.error("Call notification email failed", error);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return response(204);
  if (req.method !== "POST") return response(405, { error: "Method not allowed" });

  const rawBody = await req.text();
  try {
    const verified = await verifyRequest(req, rawBody);
    if (!verified) return response(401, { error: "Invalid Retell webhook authentication" });

    const payload = JSON.parse(rawBody) as JsonObject;
    const event = asString(payload.event) || "unknown";
    const call = asObject(payload.call);

    if (!call.call_id) {
      return response(200, { ok: true, ignored: "missing call_id", event });
    }

    const tenantId = await findTenant(call);
    const storedCall = await upsertCall(event, call, tenantId);
    await notifyCallComplete(event, call, storedCall);

    return response(204);
  } catch (error) {
    console.error("retell-webhook failed", error);
    return response(500, { error: error instanceof Error ? error.message : "Unknown error" });
  }
});
