import { cn } from "@/lib/utils";
import { PLAN_LABEL } from "@/lib/plan-gating";
import type { Plan } from "@/integrations/supabase/app-types";

export function PlanBadge({ plan }: { plan: Plan }) {
  const styles: Record<Plan, string> = {
    phone_starter: "bg-slate-badge text-slate-badge-foreground",
    phone_email: "bg-info/15 text-info border border-info/30",
    ai_front_office: "bg-primary/15 text-primary border border-primary/30",
    custom: "bg-warning/15 text-warning border border-warning/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        styles[plan],
      )}
    >
      {PLAN_LABEL[plan]}
    </span>
  );
}

export function StatusDot({ status }: { status: string | null | undefined }) {
  const isLive = (status || "").toLowerCase() === "live";
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          isLive ? "bg-success pulse-dot" : "bg-muted-foreground/50",
        )}
      />
      <span className="text-xs font-medium">
        {isLive ? "Live" : "Paused"}
      </span>
    </div>
  );
}

export function OutcomeBadge({ outcome }: { outcome: string | null }) {
  if (!outcome) return <span className="text-xs text-muted-foreground">—</span>;
  const key = outcome.toLowerCase();
  const map: Record<string, string> = {
    appointment_booked: "bg-success/15 text-success border border-success/30",
    booked: "bg-success/15 text-success border border-success/30",
    resolved: "bg-success/15 text-success border border-success/30",
    unresolved: "bg-destructive/15 text-destructive border border-destructive/30",
    needs_followup: "bg-warning/15 text-warning border border-warning/30",
    needs_follow_up: "bg-warning/15 text-warning border border-warning/30",
    transferred: "bg-info/15 text-info border border-info/30",
    general_question: "bg-slate-badge text-slate-badge-foreground",
  };
  const cls = map[key] || "bg-slate-badge text-slate-badge-foreground";
  return (
    <span className={cn("inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize", cls)}>
      {outcome.replace(/_/g, " ")}
    </span>
  );
}

export function ReasonBadge({ reason }: { reason: string | null }) {
  if (!reason) return <span className="text-xs text-muted-foreground">—</span>;
  const key = reason.toLowerCase().replace(/[_-]+/g, " ").trim();
  const has = (...needles: string[]) => needles.some((needle) => key.includes(needle));
  const map: Record<string, string> = {
    "new patient": "bg-info/15 text-info border border-info/30",
    appointment: "bg-primary/15 text-primary border border-primary/30",
    "general question": "bg-slate-badge text-slate-badge-foreground",
  };
  const cls = map[key] || "bg-slate-badge text-slate-badge-foreground";
  const label = has("new patient", "newpt")
    ? "New"
    : has("reschedul")
      ? "Move"
      : has("cancel")
        ? "Cancel"
        : has("appointment", "booking", "schedule", "book")
          ? "Appt"
          : has("billing", "invoice", "payment", "insurance", "cost", "price")
            ? "Bill"
            : has("prescription", "refill", "medication", "rx")
              ? "Rx"
              : has("result", "lab", "test")
                ? "Lab"
                : has("referral")
                  ? "Ref"
                  : has("hours", "location", "address", "directions")
                    ? "Loc"
                    : has("question", "info", "inquiry", "general")
                      ? "Info"
                      : key.length > 8
                        ? `${key.slice(0, 7)}…`
                        : key;
  return (
    <span className={cn("inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize whitespace-nowrap", cls)}>
      {label}
    </span>
  );
}

export function JourneyBadge({ call }: { call: { is_new_patient?: boolean | null; appointment_booked?: boolean | null; transferred?: boolean | null } }) {
  const items: { label: string; cls: string }[] = [];
  if (call.is_new_patient) items.push({ label: "New Patient", cls: "bg-info/15 text-info border border-info/30" });
  if (call.appointment_booked) items.push({ label: "Booked", cls: "bg-success/15 text-success border border-success/30" });
  if (call.transferred) items.push({ label: "Transferred", cls: "bg-warning/15 text-warning border border-warning/30" });
  if (items.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((i) => (
        <span key={i.label} className={cn("inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium", i.cls)}>
          {i.label}
        </span>
      ))}
    </div>
  );
}

export function LeadScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="text-xs text-muted-foreground">—</span>;
  const cls =
    score >= 80
      ? "bg-success/15 text-success border border-success/30"
      : score >= 50
        ? "bg-warning/15 text-warning border border-warning/30"
        : "bg-slate-badge text-slate-badge-foreground";
  return (
    <span className={cn("inline-flex rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums", cls)}>
      {score}
    </span>
  );
}
