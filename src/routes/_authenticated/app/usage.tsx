import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase, type Tenant } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/DashboardShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { nextMonthFirstLabel } from "@/lib/format";
import { AlertTriangle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/usage")({
  component: ClientUsage,
});

function ClientUsage() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const { data, isLoading, error } = useQuery({
    enabled: !!tenantId,
    queryKey: ["client", "usage", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, plan, minutes_used_this_month, minutes_included, stripe_subscription_status, stripe_customer_id, created_at")
        .eq("id", tenantId!)
        .maybeSingle();
      if (error) throw error;
      return data as Tenant | null;
    },
  });

  const used = Math.round(data?.minutes_used_this_month ?? 0);
  const included = data?.minutes_included ?? 0;
  const pct = included > 0 ? (used / included) * 100 : 0;
  const overage = used > included && included > 0;

  let barColor = "bg-primary";
  if (pct >= 100) barColor = "bg-destructive";
  else if (pct >= 80) barColor = "bg-warning";

  return (
    <div>
      <PageHeader title="Usage" description="Minutes consumed this billing cycle." />

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive">Failed to load: {(error as Error).message}</p>
      )}

      {data && (
        <div className="space-y-6">
          {overage && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Plan limit exceeded</AlertTitle>
              <AlertDescription>
                You've used {used} of {included} included minutes. Overage charges may apply.
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-xl border border-border/60 bg-card p-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Minutes used
                </div>
                <div className="mt-2 text-3xl font-semibold tracking-tight">
                  {used.toLocaleString()}{" "}
                  <span className="text-base font-normal text-muted-foreground">
                    / {included.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="font-medium text-foreground">
                  {Math.min(pct, 999).toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground capitalize">
                  {data.plan ?? "—"} plan
                </div>
              </div>
            </div>

            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full ${barColor} transition-all`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Resets on {nextMonthFirstLabel()}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
