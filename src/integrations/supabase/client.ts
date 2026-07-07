import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { SUPABASE_URL, requireSupabasePublishableKey } from './config';

type AuthStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const memoryStorage = new Map<string, string>();

const fallbackStorage: AuthStorage = {
  getItem: (key) => memoryStorage.get(key) ?? null,
  setItem: (key, value) => {
    memoryStorage.set(key, value);
  },
  removeItem: (key) => {
    memoryStorage.delete(key);
  },
};

function getAuthStorage() {
  if (typeof window === 'undefined') return fallbackStorage;
  try {
    const storage = window.localStorage;
    const testKey = "vektiss-auth-storage-test";
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return storage;
  } catch {
    return fallbackStorage;
  }
}

function createSupabaseClient() {
  return createClient<Database>(SUPABASE_URL, requireSupabasePublishableKey(), {
    auth: {
      storage: getAuthStorage(),
      storageKey: 'vektiss-voice-auth-v2',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
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
