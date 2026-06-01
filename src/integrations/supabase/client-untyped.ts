// Re-exports the generated Supabase client but loosens the typing so app code can reference
// tables (tenants, calls, profiles, invoices, etc.) that live in the original Vektiss database
// while the auto-generated types.ts is empty (Lovable Cloud connection state).
import { supabase as typedSupabase } from "./client";
import type { SupabaseClient } from "@supabase/supabase-js";

export const supabase = typedSupabase as unknown as SupabaseClient<any, "public", any>;
