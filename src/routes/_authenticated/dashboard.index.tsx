import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Phone,
  UserPlus,
  CalendarCheck,
  PhoneForwarded,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { subDays, format, startOfDay } from "date-fns";
import { useMe } from "@/lib/me";
import { supabase } from "@/integrations/supabase/client-untyped";
import type { Call } from "@/integrations/supabase/app-types";
import { StatCard } from "@/components/stat-card";
import { StatusDot } from "@/components/badges";
import { EmptyState } from "@/components/empty-state";
import { UsageWidget } from "@/components/usage-widget";

import { SuperAdminDashboard } from "@/components/super-admin-dashboard";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: DashboardHome,
});

function DashboardHome() {
  const me = useMe();
  if (me.profile.role === "super_admin") {
    return <SuperAdminDashboard />;
  }
  const tenantId = me.tenant?.id;
  return (
    <DashboardView
      tenantId={tenantId ?? null}
      tenantName={me.tenant?.name ?? "Workspace"}
      agentStatus={me.tenant?.agent_status ?? null}
      minutesUsed={me.tenant?.minutes_used_this_month}
      minutesIncluded={me.tenant?.minutes_included}
      plan={me.tenant?.plan}
    />
  );
}


export function DashboardView({
  tenantId,
  tenantName,
  agentStatus,
  minutesUsed,
  minutesIncluded,
  plan,
}: {
  tenantId: string | null;
  tenantName: string;
  agentStatus: string | null;
  minutesUsed?: number | null;
  minutesIncluded?: number | null;
  plan?: string | null;
}) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-calls", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const since = subDays(new Date(), 21).toISOString();
      let q = supabase
        .from("calls")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q.returns<Call[]>();
      if (error) throw error;
      return data ?? [];
    },
  });

  const calls = data ?? [];
  const now = new Date();
  const weekAgo = subDays(now, 7);
  const twoWeeksAgo = subDays(now, 14);

  const thisWeek = calls.filter((c) => new Date(c.created_at) >= weekAgo);
  const lastWeek = calls.filter(
    (c) => new Date(c.created_at) >= twoWeeksAgo && new Date(c.created_at) < weekAgo,
  );

  const pct = (a: number, b: number) => (b === 0 ? (a > 0 ? 100 : 0) : ((a - b) / b) * 100);

  const totalThis = thisWeek.length;
  const newPatientsThis = thisWeek.filter((c) => c.is_new_patient).length;
  const bookedThis = thisWeek.filter((c) => c.appointment_booked).length;
  const transferredThis = thisWeek.filter((c) => c.transferred).length;

  const totalLast = lastWeek.length;
  const newPatientsLast = lastWeek.filter((c) => c.is_new_patient).length;
  const bookedLast = lastWeek.filter((c) => c.appointment_booked).length;
  const transferredLast = lastWeek.filter((c) => c.transferred).length;

  // 14-day daily volume
  const days: { date: string; calls: number; booked: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = startOfDay(subDays(now, i));
    const next = startOfDay(subDays(now, i - 1));
    const dayCalls = calls.filter((c) => {
      const t = new Date(c.created_at);
      return t >= d && t < next;
    });
    days.push({
      date: format(d, "MMM d"),
      calls: dayCalls.length,
      booked: dayCalls.filter((c) => c.appointment_booked).length,
    });
  }

  const sparkFor = (key: "all" | "new" | "booked" | "transferred") =>
    days.slice(-7).map((d) =>
      key === "all" ? d.calls : key === "booked" ? d.booked : 0,
    );

  // Outcomes donut (this week)
  const outcomes = thisWeek.reduce<Record<string, number>>((acc, c) => {
    const k = c.outcome || "unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const outcomeData = Object.entries(outcomes).map(([name, value]) => ({ name, value }));
  const OUTCOME_COLORS = [
    "var(--primary)",
    "var(--success)",
    "var(--warning)",
    "var(--chart-2)",
    "var(--destructive)",
    "var(--slate-badge)",
  ];

  // Top reasons (this week)
  const reasons = thisWeek.reduce<Record<string, number>>((acc, c) => {
    const k = c.call_reason || "unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const reasonData = Object.entries(reasons)
    .map(([name, count]) => ({ name: name.replace(/_/g, " "), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tenantName}</h1>
          <p className="text-sm text-muted-foreground">Call activity overview</p>
        </div>
        <StatusDot status={agentStatus} />
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Calls"
          value={totalThis}
          delta={pct(totalThis, totalLast)}
          trend={sparkFor("all")}
          icon={<Phone className="h-4 w-4" />}
          accent="blue"
        />
        <StatCard
          label="New Patient Calls"
          value={newPatientsThis}
          delta={pct(newPatientsThis, newPatientsLast)}
          trend={sparkFor("all")}
          icon={<UserPlus className="h-4 w-4" />}
          accent="purple"
        />
        <StatCard
          label="Appointments Booked"
          value={bookedThis}
          delta={pct(bookedThis, bookedLast)}
          trend={sparkFor("booked")}
          icon={<CalendarCheck className="h-4 w-4" />}
          accent="green"
        />
        <StatCard
          label="Transferred to Staff"
          value={transferredThis}
          delta={pct(transferredThis, transferredLast)}
          trend={sparkFor("all")}
          icon={<PhoneForwarded className="h-4 w-4" />}
          accent="orange"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <UsageWidget
            minutesUsed={minutesUsed}
            minutesIncluded={minutesIncluded}
            plan={plan}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Call Volume — Last 14 Days</h2>
          </div>
          <div className="h-64">
            {isLoading ? (
              <div className="h-full w-full animate-pulse rounded-md bg-muted" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={days}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="calls"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={false}
                    name="Calls"
                  />
                  <Line
                    type="monotone"
                    dataKey="booked"
                    stroke="var(--success)"
                    strokeWidth={2}
                    dot={false}
                    name="Booked"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Outcomes This Week</h2>
          <div className="h-64">
            {outcomeData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No calls yet this week
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={outcomeData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {outcomeData.map((_, i) => (
                      <Cell key={i} fill={OUTCOME_COLORS[i % OUTCOME_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Top Call Reasons This Week</h2>
        <div className="h-56">
          {reasonData.length === 0 ? (
            <EmptyState title="No call reasons yet" description="Reasons will appear as calls come in." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reasonData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={180} interval={0} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <div className="text-xs text-muted-foreground">
        <button
          className="underline-offset-2 hover:underline"
          onClick={() =>
            navigate({
              to: "/dashboard/calls",
              search: tenantId ? { tenantId } : {},
            })
          }
        >
          View full call log →
        </button>
      </div>
    </div>
  );
}
