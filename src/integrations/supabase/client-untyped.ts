// Loose-typed re-export of the Supabase client. The auto-generated types.ts is empty
// (Lovable Cloud connection state), so we cast through a permissive Database type that
// (a) accepts any table name string and (b) still preserves function generics like
// `.maybeSingle<Call>()` and typed `.eq("col", val)` calls without forcing `any` everywhere.
import { supabase as typedSupabase } from "./client";
import type { SupabaseClient } from "@supabase/supabase-js";

type AnyRow = Record<string, any>;
type AnyTable = {
  Row: AnyRow;
  Insert: AnyRow;
  Update: AnyRow;
  Relationships: [];
};

type LooseDatabase = {
  public: {
    Tables: { [key: string]: AnyTable };
    Views: { [key: string]: AnyTable };
    Functions: { [key: string]: { Args: AnyRow; Returns: any } };
    Enums: { [key: string]: string };
    CompositeTypes: { [key: string]: AnyRow };
  };
};

export const supabase = typedSupabase as unknown as SupabaseClient<LooseDatabase, "public">;
