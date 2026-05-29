import { createFileRoute } from "@tanstack/react-router";
import { useMe } from "@/lib/me";
import { canUse } from "@/lib/plan-gating";
import { LockedFeature } from "@/components/locked-feature";
import { DashboardView } from "./dashboard.index";

export const Route = createFileRoute("/_authenticated/dashboard/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const me = useMe();
  const plan = me.tenant?.plan ?? "phone_starter";

  if (!canUse(plan, "analytics")) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Deeper insights into your call activity</p>
        <div className="mt-6">
          <LockedFeature feature="analytics" />
        </div>
      </div>
    );
  }

  return (
    <DashboardView
      tenantId={me.tenant?.id ?? null}
      tenantName={`${me.tenant?.name ?? "Workspace"} — Analytics`}
      agentStatus={me.tenant?.agent_status ?? null}
    />
  );
}
