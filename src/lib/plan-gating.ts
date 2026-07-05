import type { Plan } from "@/integrations/supabase/app-types";

export type Feature =
  | "recordings"
  | "basic_log"
  | "transcripts"
  | "analytics"
  | "intake_forms"
  | "lead_score"
  | "calendar"
  | "bilingual"
  | "auto_followup"
  | "caller_memory"
  | "white_label";

const PLAN_ORDER: Plan[] = ["phone_starter", "phone_email", "ai_front_office", "custom"];

const FEATURE_MIN: Record<Feature, Plan> = {
  recordings: "phone_starter",
  basic_log: "phone_starter",
  transcripts: "phone_email",
  analytics: "phone_email",
  intake_forms: "phone_email",
  lead_score: "ai_front_office",
  calendar: "ai_front_office",
  bilingual: "ai_front_office",
  auto_followup: "ai_front_office",
  caller_memory: "ai_front_office",
  white_label: "custom",
};

export function canUse(plan: Plan | null | undefined, feature: Feature): boolean {
  if (!plan) return false;
  const planIdx = PLAN_ORDER.indexOf(plan);
  const minIdx = PLAN_ORDER.indexOf(FEATURE_MIN[feature]);
  return planIdx >= minIdx;
}

export const PLAN_LABEL: Record<Plan, string> = {
  phone_starter: "Phone Starter",
  phone_email: "Phone + Email",
  ai_front_office: "Vektiss Voice Essentials", // ai_front_office = Essentials ($500/mo)
  custom: "Enterprise / Custom",
};

export const PLAN_PRICE: Record<Plan, number> = {
  phone_starter: 45.99,
  phone_email: 89.99,
  ai_front_office: 500, // Essentials: $500/mo + $1,500 setup
  custom: 0, // Enterprise = quoted
};

// Setup fees (one-time, charged before monthly billing starts)
export const PLAN_SETUP_FEE: Record<Plan, number> = {
  phone_starter: 0,
  phone_email: 0,
  ai_front_office: 1500, // Essentials setup fee
  custom: 0, // quoted
};

// Growth plan is not in the Plan enum (handled separately via Calendly)
export const GROWTH_MONTHLY_PRICE = 1000;
export const GROWTH_SETUP_FEE = 3000;

export function requiredPlanFor(feature: Feature): Plan {
  return FEATURE_MIN[feature];
}
