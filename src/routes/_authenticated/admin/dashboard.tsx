import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/DashboardShell";
import { formatCurrency, planPrice, startOfMonthISO } from "@/lib/format";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const [tenantsRes, callsRes] = await Promise.all([
        supabase
          .from("tenants")
          .select("id, plan, minutes_used_this_month"),
        supabase
          .from("calls")
          .select("id", { count: "exact", head: true })
          .gte("started_at", startOfMonthISO()),
      ]);
      if (tenantsRes.error) throw tenantsRes.error;
      if (callsRes.error) throw callsRes.error;

      const tenants = tenantsRes.data ?? [];
      const totalClients = tenants.length;
      const mrr = tenants.reduce((sum, t) => sum + planPrice(t.plan), 0);
      const totalMinutes = tenants.reduce(
        (sum, t) => sum + (t.minutes_used_this_month ?? 0),
        0,
      );
      return {
        totalClients,
        callsThisMonth: callsRes.count ?? 0,
        mrr,
        totalMinutes,
      };
    },
  });

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Platform-wide metrics across all clients this month."
      />
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive">Failed to load: {(error as Error).message}</p>
      )}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total clients" value={data.totalClients} />
          <StatCard label="Calls this month" value={data.callsThisMonth.toLocaleString()} />
          <StatCard label="MRR" value={formatCurrency(data.mrr)} hint="Derived from plan" />
          <StatCard
            label="Platform minutes used"
            value={Math.round(data.totalMinutes).toLocaleString()}
            hint="This billing cycle"
          />
        </div>
      )}
    </div>
  );
}
