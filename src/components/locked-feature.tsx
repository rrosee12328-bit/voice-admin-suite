import { Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PLAN_LABEL, requiredPlanFor, type Feature } from "@/lib/plan-gating";

export function LockedFeature({ feature, compact }: { feature: Feature; compact?: boolean }) {
  const plan = requiredPlanFor(feature);
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        {PLAN_LABEL[plan]}
      </span>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Lock className="h-5 w-5" />
      </div>
      <div className="text-sm font-medium">This feature is locked</div>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        Upgrade to <span className="text-primary font-medium">{PLAN_LABEL[plan]}</span> to unlock this feature.
      </p>
      <Link
        to="/dashboard/settings"
        className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
      >
        Upgrade plan
      </Link>
    </div>
  );
}
