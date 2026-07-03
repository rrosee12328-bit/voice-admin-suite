type JsonObject = Record<string, unknown>;

const PROJECT_ID = "hygmztvpmmyxuomjwrbt";
const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") || `https://${PROJECT_ID}.supabase.co`).replace(/\/$/, "");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Deno.env.get("VEKTISS_SUPABASE_SERVICE_ROLE_KEY") ||
  "";

const TEKMETRIC_ENVIRONMENT = Deno.env.get("TEKMETRIC_BASE_URL") || Deno.env.get("TEKMETRIC_ENVIRONMENT") || "";
const TEKMETRIC_BASE_URL = (TEKMETRIC_ENVIRONMENT
  ? /^https?:\/\//i.test(TEKMETRIC_ENVIRONMENT)
    ? TEKMETRIC_ENVIRONMENT
    : `https://${TEKMETRIC_ENVIRONMENT}`
  : ""
).replace(/\/$/, "");
const TEKMETRIC_CLIENT_ID = Deno.env.get("TEKMETRIC_CLIENT_ID") || "";
const TEKMETRIC_CLIENT_SECRET = Deno.env.get("TEKMETRIC_CLIENT_SECRET") || "";
const TEKMETRIC_SHOP_ID = Deno.env.get("TEKMETRIC_SHOP_ID") || "";
const TEKMETRIC_TOKEN_PATH = Deno.env.get("TEKMETRIC_TOKEN_PATH") || "";
const TEKMETRIC_REPAIR_ORDERS_PATH = Deno.env.get("TEKMETRIC_REPAIR_ORDERS_PATH") || "";
const TEKMETRIC_CUSTOMERS_PATH = Deno.env.get("TEKMETRIC_CUSTOMERS_PATH") || "";
const TEKMETRIC_WRITEBACK_PATH_TEMPLATE = Deno.env.get("TEKMETRIC_WRITEBACK_PATH_TEMPLATE") || "";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};
const jsonHeaders = { "content-type": "application/json", ...corsHeaders };

function response(status: number, body?: JsonObject) {
  return new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: body ? jsonHeaders : corsHeaders,
  });
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const object = asObject(value);
  for (const key of ["data", "items", "results", "content", "records", "repairOrders", "customers"]) {
    const nested = object[key];
    if (Array.isArray(nested)) return nested;
  }
  return [];
}

function asString(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function asDate(value: unknown): Date | null {
  const text = asString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const text = asString(value);
    if (text) return text;
  }
  return null;
}

function cleanPhone(value: unknown) {
  const text = asString(value);
  if (!text) return "";
  const digits = text.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return text;
}

function restHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: SERVICE_ROLE_KEY,
    authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "content-type": "application/json",
    ...extra,
  };
}

async function rest<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  if (!SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: restHeaders((init.headers as Record<string, string>) || {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text}`);
  return text ? JSON.parse(text) as T : null as T;
}

async function getUser(req: Request) {
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;

  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY || SERVICE_ROLE_KEY,
      authorization,
    },
  });
  if (!res.ok) return null;
  const user = await res.json() as JsonObject;
  return asString(user.id);
}

async function assertTenantAccess(req: Request, tenantId: string) {
  const userId = await getUser(req);
  if (!userId) throw new Error("Unauthorized");

  const rows = await rest<Array<{ tenant_id: string | null; role: string | null }>>(
    `profiles?select=tenant_id,role&id=eq.${encodeURIComponent(userId)}&limit=1`,
  );
  const profile = rows[0];
  if (!profile) throw new Error("Unauthorized");
  if (profile.role === "super_admin") return;
  if (profile.tenant_id === tenantId) return;
  throw new Error("Forbidden");
}

function buildUrl(path: string, params: Record<string, string | number | null | undefined> = {}) {
  const url = new URL(path.startsWith("http") ? path : `${TEKMETRIC_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function fetchJson(url: string, init: RequestInit = {}) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 500) };
  }
  if (!res.ok) {
    throw new Error(`Tekmetric ${res.status}: ${JSON.stringify(body).slice(0, 500)}`);
  }
  return body;
}

async function getTekmetricToken() {
  if (!TEKMETRIC_BASE_URL || !TEKMETRIC_CLIENT_ID || !TEKMETRIC_CLIENT_SECRET) {
    throw new Error("Tekmetric secrets are not configured");
  }

  const paths = [
    TEKMETRIC_TOKEN_PATH,
    "/oauth/token",
    "/oauth2/token",
    "/api/oauth/token",
    "/api/v1/oauth/token",
  ].filter(Boolean);
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: TEKMETRIC_CLIENT_ID,
    client_secret: TEKMETRIC_CLIENT_SECRET,
  });
  const basic = btoa(`${TEKMETRIC_CLIENT_ID}:${TEKMETRIC_CLIENT_SECRET}`);
  const errors: string[] = [];

  for (const path of paths) {
    for (const headers of [
      { "content-type": "application/x-www-form-urlencoded" },
      { "content-type": "application/x-www-form-urlencoded", authorization: `Basic ${basic}` },
    ]) {
      try {
        const token = await fetchJson(buildUrl(path), {
          method: "POST",
          headers,
          body,
        }) as JsonObject;
        const accessToken = firstString(token.access_token, token.token);
        if (accessToken) return accessToken;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "Token request failed");
      }
    }
  }

  throw new Error(`Tekmetric token request failed. ${errors.slice(0, 2).join(" ")}`);
}

async function tekmetricGet(path: string, token: string, params: Record<string, string | number | null | undefined> = {}) {
  return await fetchJson(buildUrl(path, params), {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
    },
  });
}

function candidatePaths(kind: "repair_orders" | "customers") {
  if (kind === "repair_orders") {
    return [
      TEKMETRIC_REPAIR_ORDERS_PATH,
      "/api/v1/repair-orders",
      "/api/v1/repairorders",
      "/api/v1/repairOrders",
      "/api/v1/repair-orders/search",
    ].filter(Boolean);
  }
  return [
    TEKMETRIC_CUSTOMERS_PATH,
    "/api/v1/customers",
    "/api/v1/customer",
    "/api/v1/clients",
  ].filter(Boolean);
}

function getCustomerObject(record: JsonObject) {
  return asObject(record.customer || record.client || record.owner || record.customerInfo);
}

function getVehicleObject(record: JsonObject) {
  return asObject(record.vehicle || record.vehicleInfo || record.car);
}

function normalizeRecord(record: unknown) {
  const raw = asObject(record);
  const customer = getCustomerObject(raw);
  const vehicle = getVehicleObject(raw);
  const firstName = firstString(customer.firstName, customer.first_name, raw.firstName, raw.first_name, raw.first);
  const lastName = firstString(customer.lastName, customer.last_name, raw.lastName, raw.last_name, raw.last);
  const phone = cleanPhone(firstString(
    customer.phone,
    customer.phoneNumber,
    customer.mobilePhone,
    customer.cellPhone,
    raw.phone,
    raw.phoneNumber,
    raw.mobilePhone,
  ));
  const lastService = asDate(firstString(
    raw.completedDate,
    raw.completed_at,
    raw.closedDate,
    raw.invoiceDate,
    raw.updatedDate,
    raw.createdDate,
    raw.lastServiceDate,
    customer.lastServiceDate,
  ));
  const externalId = firstString(
    raw.id,
    raw.repairOrderId,
    raw.roNumber,
    customer.id,
    customer.customerId,
  );
  const vehicleInfo = [
    firstString(vehicle.year, raw.vehicleYear),
    firstString(vehicle.make, raw.vehicleMake),
    firstString(vehicle.model, raw.vehicleModel),
  ].filter(Boolean).join(" ");
  const notes = firstString(raw.serviceWriter, raw.serviceAdvisor, raw.concern, raw.description, raw.memo);

  return {
    first_name: firstName || "",
    last_name: lastName || "",
    phone,
    email: firstString(customer.email, raw.email) || "",
    last_service_date: lastService ? lastService.toISOString().slice(0, 10) : "",
    vehicle_info: vehicleInfo,
    notes: notes || "",
    external_source: "tekmetric",
    external_id: externalId || "",
    due_reason: lastService ? `Last service ${lastService.toISOString().slice(0, 10)}` : "Past Tekmetric customer",
    source_payload: raw,
  };
}

async function fetchTekmetricRecords(token: string, monthsSinceService: number, limit: number) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsSinceService);
  const from = new Date(cutoff);
  from.setMonth(from.getMonth() - 18);

  const params = {
    shopId: TEKMETRIC_SHOP_ID,
    startDate: from.toISOString().slice(0, 10),
    endDate: cutoff.toISOString().slice(0, 10),
    fromDate: from.toISOString().slice(0, 10),
    toDate: cutoff.toISOString().slice(0, 10),
    limit: Math.min(Math.max(limit, 1), 500),
    size: Math.min(Math.max(limit, 1), 500),
  };
  const errors: string[] = [];

  for (const path of candidatePaths("repair_orders")) {
    try {
      const body = await tekmetricGet(path, token, params);
      const records = asArray(body);
      return records;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Repair-order fetch failed");
    }
  }

  for (const path of candidatePaths("customers")) {
    try {
      const body = await tekmetricGet(path, token, {
        shopId: TEKMETRIC_SHOP_ID,
        limit: Math.min(Math.max(limit, 1), 500),
        size: Math.min(Math.max(limit, 1), 500),
      });
      const records = asArray(body);
      return records;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Customer fetch failed");
    }
  }

  throw new Error(`Tekmetric returned no records. ${errors.slice(0, 3).join(" ")}`);
}

async function upsertTekmetricIntegration(input: {
  tenantId: string;
  status: "connected" | "error";
  monthsSinceService: number;
  error?: string | null;
}) {
  const settings: JsonObject = {
    shop_id: TEKMETRIC_SHOP_ID || null,
    months_since_service: input.monthsSinceService,
  };
  if (input.error) {
    settings.last_error = input.error.slice(0, 500);
    settings.last_error_at = new Date().toISOString();
  }

  await rest("tenant_integrations", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      tenant_id: input.tenantId,
      provider: "tekmetric",
      status: input.status,
      environment_url: TEKMETRIC_BASE_URL,
      settings,
      last_synced_at: input.status === "connected" ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
    }),
  }).catch((error) => console.error("Failed to upsert tenant integration", error));
}

async function previewDueCustomers(req: Request, payload: JsonObject) {
  const tenantId = asString(payload.tenant_id);
  if (!tenantId) return response(400, { error: "Missing tenant_id" });
  await assertTenantAccess(req, tenantId);

  const monthsSinceService = Math.min(Math.max(Number(payload.months_since_service || 3), 1), 36);
  const limit = Math.min(Math.max(Number(payload.limit || 100), 1), 500);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsSinceService);

  let records: unknown[] = [];
  try {
    const token = await getTekmetricToken();
    records = await fetchTekmetricRecords(token, monthsSinceService, limit);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tekmetric sync failed";
    console.error("Tekmetric preview failed", message);
    await upsertTekmetricIntegration({
      tenantId,
      status: "error",
      monthsSinceService,
      error: message,
    });
    return response(200, {
      ok: false,
      provider: "tekmetric",
      months_since_service: monthsSinceService,
      cutoff_date: cutoff.toISOString().slice(0, 10),
      count: 0,
      contacts: [],
      error: message,
      fallback: true,
    });
  }
  const seenPhones = new Set<string>();
  const contacts = records
    .map(normalizeRecord)
    .filter((contact) => {
      if (!contact.phone) return false;
      if (contact.last_service_date) {
        const serviceDate = new Date(contact.last_service_date);
        if (serviceDate > cutoff) return false;
      }
      const key = contact.phone.replace(/\D/g, "");
      if (seenPhones.has(key)) return false;
      seenPhones.add(key);
      return true;
    })
    .slice(0, limit);

  await upsertTekmetricIntegration({
    tenantId,
    status: "connected",
    monthsSinceService,
  });

  return response(200, {
    ok: true,
    provider: "tekmetric",
    months_since_service: monthsSinceService,
    cutoff_date: cutoff.toISOString().slice(0, 10),
    count: contacts.length,
    contacts,
  });
}

async function writeCallResult(req: Request, payload: JsonObject) {
  const tenantId = asString(payload.tenant_id);
  if (!tenantId) return response(400, { error: "Missing tenant_id" });
  await assertTenantAccess(req, tenantId);

  const externalId = asString(payload.external_id);
  const callStatus = asString(payload.call_status) || "completed";
  const callOutcome = asString(payload.call_outcome) || "";
  const note = asString(payload.note) ||
    `Vektiss Voice outbound call: ${callStatus}${callOutcome ? ` - ${callOutcome}` : ""}`;
  if (!externalId) return response(400, { error: "Missing external_id" });

  if (!TEKMETRIC_WRITEBACK_PATH_TEMPLATE) {
    return response(200, {
      ok: true,
      skipped: "Missing TEKMETRIC_WRITEBACK_PATH_TEMPLATE",
    });
  }

  const token = await getTekmetricToken();
  const path = TEKMETRIC_WRITEBACK_PATH_TEMPLATE
    .replaceAll("{externalId}", encodeURIComponent(externalId))
    .replaceAll("{customerId}", encodeURIComponent(externalId))
    .replaceAll("{repairOrderId}", encodeURIComponent(externalId));

  const result = await fetchJson(buildUrl(path), {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      note,
      message: note,
      text: note,
      customerId: externalId,
      repairOrderId: externalId,
      source: "Vektiss Voice",
      call_status: callStatus,
      call_outcome: callOutcome || null,
    }),
  });

  return response(200, { ok: true, result: asObject(result) });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return response(204);
  if (req.method !== "POST") return response(405, { error: "Method not allowed" });

  try {
    const payload = await req.json() as JsonObject;
    const action = asString(payload.action) || "preview_due_customers";
    if (action === "preview_due_customers") return await previewDueCustomers(req, payload);
    if (action === "write_call_result") return await writeCallResult(req, payload);
    return response(400, { error: "Unknown action" });
  } catch (error) {
    console.error("tekmetric-sync failed", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return response(status, { error: message });
  }
});
