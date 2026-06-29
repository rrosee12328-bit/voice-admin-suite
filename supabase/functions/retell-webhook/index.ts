type JsonObject = Record<string, unknown>;

const PROJECT_ID = "hygmztvpmmyxuomjwrbt";
const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") || `https://${PROJECT_ID}.supabase.co`).replace(/\/$/, "");
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Deno.env.get("VEKTISS_SUPABASE_SERVICE_ROLE_KEY") ||
  "";
const RETELL_API_KEY = Deno.env.get("RETELL_API_KEY") || "";
const RETELL_WEBHOOK_TOKEN = Deno.env.get("RETELL_WEBHOOK_TOKEN") || "";
const DEFAULT_TENANT_ID = Deno.env.get("DEFAULT_TENANT_ID") || "";

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
    return constantTimeEqual(token, RETELL_WEBHOOK_TOKEN);
  }

  if (!RETELL_API_KEY) return true;
  const signature = req.headers.get("x-retell-signature");
  if (!signature) return false;

  const match = signature.match(/^v=(\d+),d=([a-f0-9]+)$/i);
  if (!match) return false;

  const timestamp = Number(match[1]);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) {
    return false;
  }

  const expected = await hmacHex(RETELL_API_KEY, rawBody + match[1]);
  return constantTimeEqual(expected, match[2].toLowerCase());
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

async function upsertCall(event: string, call: JsonObject, tenantId: string | null) {
  const retellCallId = asString(call.call_id);
  if (!retellCallId) return null;

  const patch = buildCallPatch(event, call, tenantId);
  const encodedId = encodeURIComponent(retellCallId);
  const existing = await rest<Array<{ id: string }>>(`calls?select=id&retell_call_id=eq.${encodedId}&limit=1`);

  if (existing[0]?.id) {
    const id = encodeURIComponent(existing[0].id);
    return rest(`calls?id=eq.${id}`, {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify(patch),
    });
  }

  return rest("calls", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({ ...patch, retell_call_id: retellCallId }),
  });
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
    await upsertCall(event, call, tenantId);

    return response(204);
  } catch (error) {
    console.error("retell-webhook failed", error);
    return response(500, { error: error instanceof Error ? error.message : "Unknown error" });
  }
});
