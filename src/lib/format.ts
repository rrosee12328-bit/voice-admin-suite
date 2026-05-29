export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds < 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Simple plan -> monthly USD price map for MRR derivation.
const PLAN_PRICES: Record<string, number> = {
  starter: 99,
  pro: 299,
  growth: 599,
  scale: 999,
  enterprise: 1999,
};

export function planPrice(plan: string | null | undefined): number {
  if (!plan) return 0;
  return PLAN_PRICES[plan.toLowerCase()] ?? 0;
}

export function formatCurrency(n: number): string {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function startOfMonthISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export function startOfTodayISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
}

export function startOfWeekISO(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sun
  const diff = (day + 6) % 7; // make Monday the first day
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
  return start.toISOString();
}

export function nextMonthFirstLabel(): string {
  const d = new Date();
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return next.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}
