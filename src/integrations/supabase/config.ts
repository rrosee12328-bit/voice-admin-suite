const DEFAULT_SUPABASE_PROJECT_ID = "hygmztvpmmyxuomjwrbt";
const DEFAULT_SUPABASE_URL = `https://${DEFAULT_SUPABASE_PROJECT_ID}.supabase.co`;
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Z216dHZwbW15eHVvbWp3cmJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NTYwOCwiZXhwIjoyMDk1NTcxNjA4fQ.ZDH9dTK-Oih5-eTRF_wgllcQru2Xn4qsi6l7rlu670E";

function isProductionProjectUrl(value?: string) {
  return !!value && value.includes(DEFAULT_SUPABASE_PROJECT_ID);
}

const configuredProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const configuredUrl = import.meta.env.VITE_SUPABASE_URL;
const configuredKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const configuredMatchesProduction =
  configuredProjectId === DEFAULT_SUPABASE_PROJECT_ID ||
  isProductionProjectUrl(configuredUrl);

export const SUPABASE_URL =
  configuredMatchesProduction && configuredUrl ? configuredUrl : DEFAULT_SUPABASE_URL;

export const SUPABASE_PUBLISHABLE_KEY =
  configuredMatchesProduction && configuredKey ? configuredKey : DEFAULT_SUPABASE_PUBLISHABLE_KEY;

export const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1`;

export function requireSupabasePublishableKey() {
  if (!SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing VITE_SUPABASE_PUBLISHABLE_KEY. Connect the app to Supabase or add it to the environment.");
  }

  return SUPABASE_PUBLISHABLE_KEY;
}
