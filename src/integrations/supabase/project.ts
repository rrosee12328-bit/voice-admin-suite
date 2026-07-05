export const VEKTISS_SUPABASE_PROJECT_ID = "hygmztvpmmyxuomjwrbt";
export const VEKTISS_SUPABASE_URL = `https://${VEKTISS_SUPABASE_PROJECT_ID}.supabase.co`;
export const VEKTISS_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Z216dHZwbW15eHVvbWp3cmJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTU2MDgsImV4cCI6MjA5NTU3MTYwOH0.ZDH9dTK-Oih5-eTRF_wgllcQru2Xn4qsi6l7rlu670E";

export function isVektissSupabaseUrl(value?: string | null) {
  return !!value && value.includes(VEKTISS_SUPABASE_PROJECT_ID);
}

export function resolveVektissSupabaseUrl(configuredUrl?: string | null) {
  return configuredUrl && isVektissSupabaseUrl(configuredUrl)
    ? configuredUrl
    : VEKTISS_SUPABASE_URL;
}

export function resolveVektissPublishableKey(
  configuredUrl?: string | null,
  configuredKey?: string | null,
) {
  return configuredUrl && isVektissSupabaseUrl(configuredUrl) && configuredKey
    ? configuredKey
    : VEKTISS_SUPABASE_PUBLISHABLE_KEY;
}
