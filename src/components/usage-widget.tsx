"use client";

import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface UsageWidgetProps {
  minutesUsed: number | null | undefined;
  minutesIncluded: number | null | undefined;
  plan: string | null | undefined;
}

export function UsageWidget({ minutesUsed, minutesIncluded, plan }: UsageWidgetProps) {
  const navigate = useNavigate();

  const isCustom = plan === "custom";

  const used = minutesUsed ?? 0;
  const included = minutesIncluded ?? 0;
  const pct = isCustom ? 0 : included > 0 ? Math.min((used / included) * 100, 100) : 0;
  const rawPct = isCustom ? 0 : included > 0 ? (used / included) * 100 : 0;

  const barColor = useMemo(() => {
    if (isCustom) return "bg-primary";
    if (rawPct >= 100) return "bg-[#EF4444]";
    if (rawPct >= 80) return "bg-[#F59E0B]";
    return "bg-primary";
  }, [isCustom, rawPct]);

  const warningText = useMemo(() => {
    if (isCustom) return null;
    if (rawPct >= 100) return "Plan limit exceeded";
    if (rawPct >= 80) return "Approaching your plan limit";
    return null;
  }, [isCustom, rawPct]);

  const warningColor = rawPct >= 100 ? "text-[#EF4444]" : "text-[#F59E0B]";

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Usage This Month
        </div>

        {isCustom ? (
          <div className="mt-2 text-2xl font-semibold tabular-nums">Unlimited</div>
        ) : (
          <>
            <div className="mt-2 text-2xl font-semibold tabular-nums">
              {used} / {included} min used
            </div>

            <div className="mt-3">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20">
                <div
                  className={cn("h-full transition-all duration-500", barColor)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {warningText && (
              <div className={cn("mt-2 flex items-center gap-1 text-xs font-medium", warningColor)}>
                <AlertTriangle className="h-3 w-3" />
                {warningText}
              </div>
            )}

            <div className="mt-2 text-xs text-muted-foreground">
              Resets on the 1st of next month
            </div>
          </>
        )}
      </div>

      {!isCustom && rawPct >= 100 && (
        <div className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 p-4">
          <p className="text-sm font-medium text-[#EF4444]">
            You've exceeded your plan limit. Overages are billed at $0.13/min.
          </p>
          <Button
            size="sm"
            className="mt-3 bg-[#EF4444] text-white hover:bg-[#EF4444]/90"
            onClick={() => navigate({ to: "/dashboard/billing" })}
          >
            Upgrade Plan
          </Button>
        </div>
      )}
    </div>
  );
}
