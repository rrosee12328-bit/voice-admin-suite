export type Role = "super_admin" | "client_admin" | "client_user" | string;

export type Plan =
  | "phone_starter"
  | "phone_email"
  | "ai_front_office"
  | "custom";

export type Tenant = {
  id: string;
  name: string;
  slug: string | null;
  plan: Plan;
  client_number: string | null;
  minutes_used_this_month: number | null;
  minutes_included: number | null;
  stripe_subscription_status: string | null;
  stripe_customer_id: string | null;
  agent_status: string | null;
  retell_phone_number: string | null;
  branding_logo_url: string | null;
  branding_name: string | null;
  branding_primary_color: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  tenant_id: string | null;
  role: Role;
  full_name: string | null;
  name: string | null;
  email: string | null;
};

export type Call = {
  id: string;
  tenant_id: string;
  caller_name: string | null;
  caller_phone: string | null;
  caller_email: string | null;
  call_reason: string | null;
  outcome: string | null;
  appointment_booked: boolean | null;
  is_new_patient: boolean | null;
  transferred: boolean | null;
  duration_seconds: number | null;
  transcript: string | null;
  recording_url: string | null;
  started_at: string;
  created_at: string;
  status: string | null;
  notes: string | null;
  lead_score: number | null;
  sms_sent: boolean | null;
  sms_message: string | null;
};

export type Invoice = {
  id: string;
  tenant_id: string;
  invoice_number: string | null;
  amount_cents: number;
  currency: string | null;
  status: string | null;
  period_start: string | null;
  period_end: string | null;
  pdf_url: string | null;
  created_at: string;
};

export type MonthlyUsage = {
  id: string;
  tenant_id: string;
  period_start: string;
  period_end: string;
  minutes_included: number;
  minutes_used: number;
  overage_minutes: number;
  overage_amount_cents: number;
  call_count: number;
  new_patient_calls: number;
  appointments_booked: number;
  transferred_calls: number;
  plan: string;
  created_at: string;
  updated_at: string;
};
