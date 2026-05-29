import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hygmztvpmmyxuomjwrbt.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Z216dHZwbW15eHVvbWp3cmJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTU2MDgsImV4cCI6MjA5NTU3MTYwOH0.ZDH9dTK-Oih5-eTRF_wgllcQru2Xn4qsi6l7rlu670E";

const isBrowser = typeof window !== "undefined";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: isBrowser,
    autoRefreshToken: isBrowser,
    detectSessionInUrl: isBrowser,
    storage: isBrowser ? window.localStorage : undefined,
  },
});

export type Tenant = {
  id: string;
  name: string;
  plan: string | null;
  minutes_used_this_month: number | null;
  minutes_included: number | null;
  stripe_subscription_status: string | null;
  stripe_customer_id: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  tenant_id: string | null;
  role: "super_admin" | "client_admin" | string;
  full_name: string | null;
  email: string | null;
};

export type Call = {
  id: string;
  tenant_id: string;
  caller_name: string | null;
  caller_phone: string | null;
  call_reason: string | null;
  outcome: string | null;
  appointment_booked: boolean | null;
  is_new_patient: boolean | null;
  transferred: boolean | null;
  duration_seconds: number | null;
  transcript: string | null;
  recording_url: string | null;
  started_at: string;
  status: string | null;
};
