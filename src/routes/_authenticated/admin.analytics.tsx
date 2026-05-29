import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Phone, DollarSign, Calendar, Activity, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { Tenant, Call } from "@/integrations/supabase/app-types";
import { PLAN_PRICE, PLAN_LABEL } from "@/lib/plan-gating";
import { PlanBadge } from "@/components/badges";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Platform Analytics — Vektiss Voice" },
      { name: "description", content: "Platform-wide usage and revenue analytics" },
    ],
  }),
  component: PlatformAnalytics,
});

function monthStart() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function PlatformAnalytics() {
  const since = monthStart();

  const tenantsQ = useQuery({
    queryKey: ["platform-analytics-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*");
      if (error) throw error;
      return (data ?? []) as Tenant[];
    },
  });

  const callsQ = useQuery({
    queryKey: ["platform-analytics-calls", since],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("calls")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const monthCallsQ = useQuery({
    queryKey: ["platform-analytics-calls-rows", since],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("tenant_id, duration_seconds")
        .gte("created_at", since);
      if (error) throw error;
      return (data ?? []) as Pick<Call, "tenant_id" | "duration_seconds">[];
    },
  });

  const recentCallsQ = useQuery({
    queryKey: ["platform-analytics-recent-calls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("id, tenant_id, caller_name, caller_phone, created_at, outcome, duration_seconds")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const tenants = tenantsQ.data ?? [];
  const totalClients = tenants.length;
  const activeClients = tenants.filter((t) => t.agent_status === "live" || t.agent_status === "active").length;
  const mrr = tenants.reduce((sum, t) => sum + (PLAN_PRICE[t.plan] || 0), 0);

  const tenantById: Record<string, Tenant> = {};
  for (const t of tenants) tenantById[t.id] = t;

  // Per-tenant aggregates from this month's calls
  const perTenant: Record<string, { calls: number; seconds: number }> = {};
  for (const c of monthCallsQ.data ?? []) {
    const t = perTenant[c.tenant_id] || { calls: 0, seconds: 0 };
    t.calls += 1;
    t.seconds += c.duration_seconds ?? 0;
    perTenant[c.tenant_id] = t;
  }
  const totalMinutes = Math.round(
    Object.values(perTenant).reduce((s, t) => s + t.seconds, 0) / 60,
  );

  const planBreakdown = tenants.reduce<Record<string, number>>((acc, t) => {
    const k = t.plan || "unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});


  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Platform Analytics</h1>
        <p className="text-sm text-muted-foreground">Aggregated usage and revenue across all clients</p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatBar label="Total Clients" value={totalClients} icon={<Users className="h-4 w-4" />} />
        <StatBar label="Active Agents" value={activeClients} icon={<Activity className="h-4 w-4" />} />
        <StatBar label="Calls This Month" value={callsQ.data ?? "—"} icon={<Phone className="h-4 w-4" />} />
        <StatBar
          label="MRR"
          value={`$${mrr.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={<DollarSign className="h-4 w-4" />}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Plan distribution</h2>
          </div>
          <div className="divide-y divide-border">
            {Object.keys(planBreakdown).length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No clients yet.</div>
            ) : (
              Object.entries(planBreakdown).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span>{PLAN_LABEL[plan as keyof typeof PLAN_LABEL] || plan}</span>
                  <span className="tabular-nums font-medium">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Recent calls across all clients</h2>
          </div>
          {recentCallsQ.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (recentCallsQ.data ?? []).length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No calls yet.</div>
          ) : (
            <ul className="divide-y divide-border">
              {(recentCallsQ.data ?? []).map((c) => {
                const t = tenantById[c.tenant_id];
                return (
                  <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{c.caller_name || c.caller_phone || "Unknown caller"}</div>
                      <div className="truncate text-xs text-muted-foreground">{t?.name ?? "—"}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatBar({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">{icon}</div>
    </div>
  );
}
