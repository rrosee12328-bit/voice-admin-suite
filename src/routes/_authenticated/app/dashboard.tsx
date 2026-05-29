import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/DashboardShell";
import { startOfTodayISO, startOfWeekISO } from "@/lib/format";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/dashboard")({
  component: ClientDashboard,
});

function ClientDashboard() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const { data, isLoading, error } = useQuery({
    enabled: !!tenantId,
    queryKey: ["client", "dashboard", tenantId],
    queryFn: async () => {
      const todayStart = startOfTodayISO();
      const weekStart = startOfWeekISO();
      const [todayRes, weekRes, bookedRes] = await Promise.all([
        supabase
          .from("calls")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId!)
          .gte("started_at", todayStart),
        supabase
          .from("calls")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId!)
          .gte("started_at", weekStart),
        supabase
          .from("calls")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId!)
          .eq("appointment_booked", true)
          .gte("started_at", weekStart),
      ]);
      if (todayRes.error) throw todayRes.error;
      if (weekRes.error) throw weekRes.error;
      if (bookedRes.error) throw bookedRes.error;
      return {
        today: todayRes.count ?? 0,
        week: weekRes.count ?? 0,
        booked: bookedRes.count ?? 0,
      };
    },
  });

  return (
    <div>
      <PageHeader title="Dashboard" description="Your AI receptionist at a glance." />
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive">Failed to load: {(error as Error).message}</p>
      )}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Calls today" value={data.today} />
          <StatCard label="Calls this week" value={data.week} />
          <StatCard
            label="Appointments booked"
            value={data.booked}
            hint="This week"
          />
        </div>
      )}
    </div>
  );
}
