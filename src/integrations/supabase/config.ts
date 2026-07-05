import { resolveVektissPublishableKey, resolveVektissSupabaseUrl } from "./project";

const configuredUrl = import.meta.env.VITE_SUPABASE_URL;
const configuredKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const SUPABASE_URL = resolveVektissSupabaseUrl(configuredUrl);

export const SUPABASE_PUBLISHABLE_KEY = resolveVektissPublishableKey(configuredUrl, configuredKey);

export const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1`;

export function requireSupabasePublishableKey() {
  if (!SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing VITE_SUPABASE_PUBLISHABLE_KEY. Connect the app to Supabase or add it to the environment.");
  }

  return SUPABASE_PUBLISHABLE_KEY;
}
