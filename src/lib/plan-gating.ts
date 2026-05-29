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
  ai_front_office: "AI Front Office",
  custom: "Custom",
};

export const PLAN_PRICE: Record<Plan, number> = {
  phone_starter: 45.99,
  phone_email: 89.99,
  ai_front_office: 199,
  custom: 0, // custom = quoted
};

export function requiredPlanFor(feature: Feature): Plan {
  return FEATURE_MIN[feature];
}
