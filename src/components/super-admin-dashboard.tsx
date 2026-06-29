import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Phone,
  Users,
  DollarSign,
  Clock,
  CalendarCheck,
  PhoneForwarded,
  AlertTriangle,
  Activity,
  TrendingUp,
  ArrowUpRight,
  Trophy,
} from "lucide-react";
import { subDays, startOfDay, startOfMonth, format } from "date-fns";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client-untyped";
import type { Tenant, Call } from "@/integrations/supabase/app-types";
import { PLAN_PRICE, PLAN_LABEL } from "@/lib/plan-gating";
import { SpotlightCard } from "@/components/spotlight-card";
import { CountUp } from "@/components/count-up";
import { PlanBadge } from "@/components/badges";
import { cn } from "@/lib/utils";

const secondsToBillableMinutes = (seconds: number) => Math.ceil(seconds / 60);

export function SuperAdminDashboard() {
  const queryClient = useQueryClient();
  const monthStartISO = startOfMonth(new Date()).toISOString();
  const since30 = subDays(new Date(), 30).toISOString();

  const tenantsQ = useQuery({
    queryKey: ["sa-tenants"],
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*");
      if (error) throw error;
      return (data ?? []) as Tenant[];
    },
  });

  const callsQ = useQuery({
    queryKey: ["sa-calls-30d"],
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("id, tenant_id, created_at, duration_seconds, outcome, appointment_booked, transferred, is_new_patient")
        .gte("created_at", since30)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<
        Pick<
          Call,
          | "id"
          | "tenant_id"
          | "created_at"
          | "duration_seconds"
          | "outcome"
          | "appointment_booked"
          | "transferred"
          | "is_new_patient"
        >
      >;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("super-admin-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["sa-calls-30d"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tenants" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["sa-tenants"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const tenants = tenantsQ.data ?? [];
  const calls = callsQ.data ?? [];
  const isLoading = tenantsQ.isLoading || callsQ.isLoading;

  const tenantById: Record<string, Tenant> = {};
  for (const t of tenants) tenantById[t.id] = t;

  const now = new Date();
  const weekAgo = subDays(now, 7);
  const twoWeeksAgo = subDays(now, 14);
  const monthStart = new Date(monthStartISO);

  const thisWeek = calls.filter((c) => new Date(c.created_at) >= weekAgo);
  const lastWeek = calls.filter(
    (c) => new Date(c.created_at) >= twoWeeksAgo && new Date(c.created_at) < weekAgo,
  );
  const thisMonth = calls.filter((c) => new Date(c.created_at) >= monthStart);

  const pct = (a: number, b: number) => (b === 0 ? (a > 0 ? 100 : 0) : ((a - b) / b) * 100);

  const totalCallsMonth = thisMonth.length;
  const totalMinutesMonth = secondsToBillableMinutes(
    thisMonth.reduce((s, c) => s + (c.duration_seconds ?? 0), 0),
  );
  const avgDurationSec = thisMonth.length
    ? Math.round(thisMonth.reduce((s, c) => s + (c.duration_seconds ?? 0), 0) / thisMonth.length)
    : 0;

  const bookedMonth = thisMonth.filter((c) => c.appointment_booked).length;
  const transferredMonth = thisMonth.filter((c) => c.transferred).length;
  const bookingRate = thisMonth.length ? (bookedMonth / thisMonth.length) * 100 : 0;
  const transferRate = thisMonth.length ? (transferredMonth / thisMonth.length) * 100 : 0;

  const totalCallsThisWeek = thisWeek.length;
  const totalCallsLastWeek = lastWeek.length;
  const wowDelta = pct(totalCallsThisWeek, totalCallsLastWeek);

  const activeAgents = tenants.filter(
    (t) => (t.agent_status ?? "").toLowerCase() === "live" ||
      (t.agent_status ?? "").toLowerCase() === "active",
  ).length;
  const mrr = tenants.reduce((s, t) => s + (PLAN_PRICE[t.plan] || 0), 0);
  const arr = mrr * 12;

  // 14-day volume across all tenants
  const days: { date: string; calls: number; minutes: number }[] = [];
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
      minutes: secondsToBillableMinutes(dayCalls.reduce((s, c) => s + (c.duration_seconds ?? 0), 0)),
    });
  }

  // Top tenants by call volume (this month)
  const perTenant: Record<string, { calls: number; seconds: number }> = {};
  for (const c of thisMonth) {
    const t = perTenant[c.tenant_id] || { calls: 0, seconds: 0 };
    t.calls += 1;
    t.seconds += c.duration_seconds ?? 0;
    perTenant[c.tenant_id] = t;
  }
  const topTenants = Object.entries(perTenant)
    .map(([id, agg]) => ({ tenant: tenantById[id], ...agg }))
    .filter((r) => r.tenant)
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 5);
  const maxTopCalls = topTenants[0]?.calls || 1;

  // Attention list: over-limit, paused, no calls this month
  const attention = tenants
    .map((t) => {
      const agg = perTenant[t.id] ?? { calls: 0, seconds: 0 };
      const minutesUsed = secondsToBillableMinutes(agg.seconds);
      const minutesIncl = t.minutes_included ?? 0;
      const over = minutesIncl > 0 && minutesUsed > minutesIncl;
      const paused = !["live", "active"].includes((t.agent_status ?? "").toLowerCase());
      const stale = agg.calls === 0;
      const reasons: { label: string; tone: "destructive" | "warning" | "muted" }[] = [];
      if (over) reasons.push({ label: `Over limit (${minutesUsed}/${minutesIncl})`, tone: "destructive" });
      if (paused) reasons.push({ label: "Agent paused", tone: "warning" });
      if (stale && !paused) reasons.push({ label: "No calls this month", tone: "muted" });
      return { tenant: t, reasons };
    })
    .filter((r) => r.reasons.length > 0)
    .sort((a, b) => {
      const score = (rs: typeof a.reasons) =>
        rs.reduce((s, r) => s + (r.tone === "destructive" ? 3 : r.tone === "warning" ? 2 : 1), 0);
      return score(b.reasons) - score(a.reasons);
    })
    .slice(0, 6);

  // Outcome donut
  const outcomeCounts = thisMonth.reduce<Record<string, number>>((acc, c) => {
    const k = c.outcome || "unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const outcomeData = Object.entries(outcomeCounts)
    .map(([name, value]) => ({ name: name.replace(/_/g, " "), value }))
    .sort((a, b) => b.value - a.value);
  const OUTCOME_COLORS = [
    "var(--primary)",
    "var(--success)",
    "var(--warning)",
    "var(--info)",
    "var(--destructive)",
    "var(--slate-badge-foreground)",
  ];

  return (
    <div className="relative flex flex-col gap-6 p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.3]"
        style={{
          backgroundImage:
            "radial-gradient(color-mix(in oklab, var(--foreground) 10%, transparent) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)",
        }}
      />

      <header className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" />
            Operator Console
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Platform Pulse</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time view of every workspace, agent, and dollar moving through the platform.
          </p>
        </div>
        <Link
          to="/admin/analytics"
          className="hidden items-center gap-1 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground sm:inline-flex"
        >
          Deep analytics <ArrowUpRight className="h-3 w-3" />
        </Link>
      </header>

      {/* TOP KPI ROW */}
      <section className="grid grid-cols-12 gap-4">
        <KpiTile
          className="col-span-12 sm:col-span-6 lg:col-span-3"
          label="Calls · 30 days"
          icon={<Phone className="h-4 w-4" />}
          delta={wowDelta}
          deltaLabel="vs last week"
        >
          <CountUp value={calls.length} className="text-3xl font-semibold tabular-nums" />
        </KpiTile>

        <KpiTile
          className="col-span-12 sm:col-span-6 lg:col-span-3"
          label="Minutes · Month"
          icon={<Clock className="h-4 w-4" />}
          tone="info"
        >
          <CountUp value={totalMinutesMonth} className="text-3xl font-semibold tabular-nums" />
          <p className="mt-1 text-xs text-muted-foreground">
            avg {Math.floor(avgDurationSec / 60)}:{String(avgDurationSec % 60).padStart(2, "0")} /call
          </p>
        </KpiTile>

        <KpiTile
          className="col-span-12 sm:col-span-6 lg:col-span-3"
          label="Active Agents"
          icon={<Activity className="h-4 w-4" />}
          tone="success"
        >
          <div className="flex items-baseline gap-2">
            <CountUp value={activeAgents} className="text-3xl font-semibold tabular-nums" />
            <span className="text-sm text-muted-foreground">/ {tenants.length}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">workspaces live right now</p>
        </KpiTile>

        <KpiTile
          className="col-span-12 sm:col-span-6 lg:col-span-3"
          label="MRR"
          icon={<DollarSign className="h-4 w-4" />}
          tone="primary"
        >
          <CountUp value={mrr} prefix="$" className="text-3xl font-semibold tabular-nums" />
          <p className="mt-1 text-xs text-muted-foreground">
            ${arr.toLocaleString(undefined, { maximumFractionDigits: 0 })} ARR
          </p>
        </KpiTile>
      </section>

      {/* SECONDARY ROW: Conversion + Transfer + New Patients */}
      <section className="grid grid-cols-12 gap-4">
        <KpiTile
          className="col-span-12 sm:col-span-4"
          label="Booking Rate · Month"
          icon={<CalendarCheck className="h-4 w-4" />}
          tone="success"
        >
          <div className="flex items-baseline gap-2">
            <CountUp
              value={bookingRate}
              decimals={1}
              suffix="%"
              className="text-3xl font-semibold tabular-nums"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {bookedMonth.toLocaleString()} of {totalCallsMonth.toLocaleString()} calls
          </p>
        </KpiTile>

        <KpiTile
          className="col-span-12 sm:col-span-4"
          label="Transfer Rate · Month"
          icon={<PhoneForwarded className="h-4 w-4" />}
          tone="warning"
        >
          <CountUp
            value={transferRate}
            decimals={1}
            suffix="%"
            className="text-3xl font-semibold tabular-nums"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {transferredMonth.toLocaleString()} transferred to staff
          </p>
        </KpiTile>

        <KpiTile
          className="col-span-12 sm:col-span-4"
          label="Clients"
          icon={<Users className="h-4 w-4" />}
        >
          <CountUp value={tenants.length} className="text-3xl font-semibold tabular-nums" />
          <p className="mt-1 text-xs text-muted-foreground">
            {Object.keys(perTenant).length} active this month
          </p>
        </KpiTile>
      </section>

      {/* CHART + OUTCOME + TOP TENANTS */}
      <section className="grid grid-cols-12 gap-4">
        {/* Volume chart */}
        <SpotlightCard className="col-span-12 lg:col-span-8" radius={420}>
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Platform call volume · 14 days</h2>
              <p className="text-xs text-muted-foreground">Aggregate across every workspace</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Calls</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> Minutes</span>
            </div>
          </div>
          <div className="h-64 p-2">
            {isLoading ? (
              <div className="h-full w-full animate-pulse rounded bg-muted" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={days} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gMin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--success)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="calls" stroke="var(--primary)" strokeWidth={2} fill="url(#gCalls)" />
                  <Area type="monotone" dataKey="minutes" stroke="var(--success)" strokeWidth={2} fill="url(#gMin)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </SpotlightCard>

        {/* Outcome donut */}
        <SpotlightCard className="col-span-12 lg:col-span-4" radius={320}>
          <div className="border-b border-border/60 px-5 py-4">
            <h2 className="text-sm font-semibold">Outcome mix · Month</h2>
            <p className="text-xs text-muted-foreground">Across {totalCallsMonth} calls</p>
          </div>
          <div className="h-64 p-2">
            {outcomeData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No calls this month
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={outcomeData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {outcomeData.map((_, i) => (
                      <Cell key={i} fill={OUTCOME_COLORS[i % OUTCOME_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </SpotlightCard>
      </section>

      {/* TOP TENANTS + ATTENTION */}
      <section className="grid grid-cols-12 gap-4">
        <SpotlightCard className="col-span-12 lg:col-span-7" radius={360}>
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-warning" />
              <div>
                <h2 className="text-sm font-semibold">Top tenants by volume</h2>
                <p className="text-xs text-muted-foreground">This month</p>
              </div>
            </div>
            <Link to="/admin" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              All clients <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {topTenants.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No calls yet this month.</div>
          ) : (
            <ul className="divide-y divide-border/60">
              {topTenants.map((row, idx) => {
                const minutes = secondsToBillableMinutes(row.seconds);
                const widthPct = (row.calls / maxTopCalls) * 100;
                return (
                  <li key={row.tenant.id} className="group/row relative px-5 py-3 transition-colors hover:bg-muted/40">
                    <div
                      aria-hidden
                      className="absolute inset-y-0 left-0 bg-primary/[0.06] transition-all"
                      style={{ width: `${widthPct}%` }}
                    />
                    <div className="relative flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
                          idx === 0 ? "bg-warning/20 text-warning" :
                          idx === 1 ? "bg-slate-badge text-slate-badge-foreground" :
                          "bg-muted text-muted-foreground",
                        )}>
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{row.tenant.name}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <PlanBadge plan={row.tenant.plan} />
                            <span className="tabular-nums">{minutes.toLocaleString()} min</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold tabular-nums">{row.calls.toLocaleString()}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">calls</div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SpotlightCard>

        <SpotlightCard className="col-span-12 lg:col-span-5" radius={320}>
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <div>
                <h2 className="text-sm font-semibold">Needs attention</h2>
                <p className="text-xs text-muted-foreground">{attention.length} workspace{attention.length === 1 ? "" : "s"} flagged</p>
              </div>
            </div>
          </div>
          {attention.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">
                <TrendingUp className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium">All clear</p>
              <p className="text-xs text-muted-foreground">Every workspace is healthy.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {attention.map((row) => (
                <li key={row.tenant.id} className="px-5 py-3 transition-colors hover:bg-muted/40">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{row.tenant.name}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {row.reasons.map((r) => (
                          <span
                            key={r.label}
                            className={cn(
                              "inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                              r.tone === "destructive" && "bg-destructive/15 text-destructive border border-destructive/30",
                              r.tone === "warning" && "bg-warning/15 text-warning border border-warning/30",
                              r.tone === "muted" && "bg-slate-badge text-slate-badge-foreground",
                            )}
                          >
                            {r.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    {row.tenant.slug && (
                      <Link
                        to="/admin/clients/$slug"
                        params={{ slug: row.tenant.slug }}
                        className="shrink-0 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Open
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SpotlightCard>
      </section>
    </div>
  );
}

function KpiTile({
  className,
  label,
  icon,
  children,
  tone = "neutral",
  delta,
  deltaLabel,
}: {
  className?: string;
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning" | "info";
  delta?: number;
  deltaLabel?: string;
}) {
  const toneStyles: Record<string, string> = {
    neutral: "bg-muted text-foreground",
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    info: "bg-info/15 text-info",
  };
  const isPositive = (delta ?? 0) >= 0;
  return (
    <SpotlightCard className={className}>
      <div className="flex h-full flex-col p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </div>
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", toneStyles[tone])}>
            {icon}
          </div>
        </div>
        <div className="flex-1">{children}</div>
        {delta !== undefined && (
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium tabular-nums",
                isPositive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
              )}
            >
              {isPositive ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}%
            </span>
            {deltaLabel && <span className="text-muted-foreground">{deltaLabel}</span>}
          </div>
        )}
      </div>
    </SpotlightCard>
  );
}

// Suppress unused import in some builds
void PLAN_LABEL;
