// Loose-typed re-export of the Supabase client. The generated types.ts is empty
// (Lovable Cloud connection state), so we cast to `any` to let app code reference
// real Vektiss tables (tenants, calls, profiles, invoices, etc.) without TS errors.
import { supabase as typedSupabase } from "./client";

export const supabase: any = typedSupabase;
