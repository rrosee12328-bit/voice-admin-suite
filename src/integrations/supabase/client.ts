import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { SUPABASE_URL, requireSupabasePublishableKey } from './config';

function getAuthStorage() {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function createSupabaseClient() {
  return createClient<Database>(SUPABASE_URL, requireSupabasePublishableKey(), {
    auth: {
      storage: getAuthStorage(),
      persistSession: true,
      autoRefreshToken: true,
    }
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client-untyped";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
