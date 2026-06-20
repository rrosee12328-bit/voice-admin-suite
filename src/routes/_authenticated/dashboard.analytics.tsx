import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMe } from "@/lib/me";
import { canUse } from "@/lib/plan-gating";
import { LockedFeature } from "@/components/locked-feature";
import { supabase } from "@/integrations/supabase/client-untyped";
import { subDays, startOfDay, format, eachDayOfInterval } from "date-fns";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Phone,
  TrendingUp,
  Clock,
  CalendarCheck,
  UserPlus,
  PhoneForwarded,
  Zap,
  BarChart2,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SpotlightCard } from "@/components/spotlight-card";
import { CountUp } from "@/components/count-up";

export const Route = createFileRoute("/_authenticated/dashboard/analytics")({
  component: AnalyticsPage,
});

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
];

function AnalyticsPage() {
  const me = useMe();
  const isSuperAdmin = me.profile.role === "super_admin";
  const plan = me.tenant?.plan ?? "phone_starter";

  if (!isSuperAdmin && !canUse(plan, "analytics")) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Deeper insights into your call activity
        </p>
        <div className="mt-6">
          <LockedFeature feature="analytics" />
        </div>
      </div>
    );
  }

  return (
    <AnalyticsDashboard
      tenantId={me.tenant?.id ?? null}
      isSuperAdmin={isSuperAdmin}
    />
  );
}

function AnalyticsDashboard({
  tenantId,
  isSuperAdmin,
}: {
  tenantId: string | null;
  isSuperAdmin: boolean;
}) {
  const since30 = subDays(new Date(), 30).toISOString();
  const since7 = subDays(new Date(), 7).toISOString();
  const since90 = subDays(new Date(), 90).toISOString();
  const prev30Start = subDays(new Date(), 60).toISOString();

  const callsQ = useQuery({
    queryKey: ["analytics-calls", tenantId, isSuperAdmin],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any)
        .from("calls")
        .select(
          "id, tenant_id, created_at, duration_seconds, outcome, appointment_booked, transferred, is_new_patient, call_reason, sms_sent"
        )
        .gte("created_at", since90)
        .order("created_at", { ascending: true });
      if (!isSuperAdmin && tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []) as any[];
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calls: any[] = callsQ.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calls30 = calls.filter((c: any) => c.created_at >= since30);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calls7 = calls.filter((c: any) => c.created_at >= since7);
  const callsPrev30 = calls.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c: any) => c.created_at >= prev30Start && c.created_at < since30
  );

  const totalCalls30 = calls30.length;
  const prevTotal = callsPrev30.length;
  const callGrowth =
    prevTotal > 0
      ? Math.round(((totalCalls30 - prevTotal) / prevTotal) * 100)
      : 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const booked30 = calls30.filter((c: any) => c.appointment_booked).length;
  const bookingRate =
    totalCalls30 > 0 ? Math.round((booked30 / totalCalls30) * 100) : 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const newPatients30 = calls30.filter((c: any) => c.is_new_patient).length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transferred30 = calls30.filter((c: any) => c.transferred).length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const smsSent30 = calls30.filter((c: any) => c.sms_sent).length;
  const avgDuration30 =
    calls30.length > 0
      ? Math.round(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          calls30.reduce((s: number, c: any) => s + (c.duration_seconds ?? 0), 0) /
            calls30.length
        )
      : 0;
  const hoursHandled = Math.round(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    calls30.reduce((s: number, c: any) => s + (c.duration_seconds ?? 0), 0) / 3600
  );
  const laborSaved = Math.round(hoursHandled * 18);
  const estimatedRevenue = booked30 * 150;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterHoursCalls = calls30.filter((c: any) => {
    const h = new Date(c.created_at).getHours();
    return h < 8 || h >= 18;
  }).length;

  const days = eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date(),
  });
  const dailyData = days.map((day: Date) => {
    const dayStr = format(day, "MMM d");
    const dayStart = startOfDay(day).toISOString();
    const dayEnd = startOfDay(subDays(day, -1)).toISOString();
    const dayCalls = calls30.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) => c.created_at >= dayStart && c.created_at < dayEnd
    );
    return {
      date: dayStr,
      calls: dayCalls.length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      booked: dayCalls.filter((c: any) => c.appointment_booked).length,
    };
  });

  const weeklyData = Array.from({ length: 12 }, (_, i) => {
    const weekEnd = subDays(new Date(), i * 7);
    const weekStart = subDays(weekEnd, 7);
    const wCalls = calls.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) =>
        c.created_at >= weekStart.toISOString() &&
        c.created_at < weekEnd.toISOString()
    );
    return {
      week: `W${12 - i}`,
      calls: wCalls.length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      booked: wCalls.filter((c: any) => c.appointment_booked).length,
    };
  }).reverse();

  const hourlyMap: Record<number, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  calls30.forEach((c: any) => {
    const h = new Date(c.created_at).getHours();
    hourlyMap[h] = (hourlyMap[h] ?? 0) + 1;
  });
  const hourlyData = Array.from({ length: 24 }, (_, h) => ({
    hour:
      h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`,
    calls: hourlyMap[h] ?? 0,
  }));

  const outcomeMap: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  calls30.forEach((c: any) => {
    const o = c.outcome ?? "unknown";
    outcomeMap[o] = (outcomeMap[o] ?? 0) + 1;
  });
  const outcomeData = Object.entries(outcomeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));

  const reasonMap: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  calls30.forEach((c: any) => {
    const r = c.call_reason ?? "other";
    const normalized =
      r.length > 40 ? "general inquiry" : r.replace(/_/g, " ");
    reasonMap[normalized] = (reasonMap[normalized] ?? 0) + 1;
  });
  const topReasons = Object.entries(reasonMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  if (callsQ.isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Last 30 days · All times in local timezone
        </p>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <Zap className="h-3.5 w-3.5" />
          AI Receptionist ROI — Last 30 Days
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <div className="text-2xl font-bold tabular-nums">
              ${estimatedRevenue.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Est. revenue from bookings
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tabular-nums">
              ${laborSaved.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Receptionist labor saved
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tabular-nums">
              {hoursHandled}h
            </div>
            <div className="text-xs text-muted-foreground">
              Calls handled by AI
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tabular-nums">24/7</div>
            <div className="text-xs text-muted-foreground">
              Coverage — no sick days
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Total Calls (30d)"
          icon={<Phone className="h-4 w-4" />}
          tone="primary"
          delta={callGrowth}
          deltaLabel="vs prev 30d"
        >
          <CountUp value={totalCalls30} className="text-3xl font-bold tabular-nums" />
        </KpiCard>
        <KpiCard
          label="Appointments Booked"
          icon={<CalendarCheck className="h-4 w-4" />}
          tone="success"
          delta={bookingRate}
          deltaLabel="booking rate"
        >
          <CountUp value={booked30} className="text-3xl font-bold tabular-nums" />
        </KpiCard>
        <KpiCard
          label="New Patients / Leads"
          icon={<UserPlus className="h-4 w-4" />}
          tone="info"
        >
          <CountUp value={newPatients30} className="text-3xl font-bold tabular-nums" />
        </KpiCard>
        <KpiCard
          label="Avg Duration"
          icon={<Clock className="h-4 w-4" />}
          tone="neutral"
        >
          <span className="text-3xl font-bold tabular-nums">
            {Math.floor(avgDuration30 / 60)}:
            {String(avgDuration30 % 60).padStart(2, "0")}
          </span>
        </KpiCard>
        <KpiCard
          label="Calls This Week"
          icon={<TrendingUp className="h-4 w-4" />}
          tone="primary"
        >
          <CountUp value={calls7.length} className="text-3xl font-bold tabular-nums" />
        </KpiCard>
        <KpiCard
          label="Transfers Completed"
          icon={<PhoneForwarded className="h-4 w-4" />}
          tone="neutral"
        >
          <CountUp value={transferred30} className="text-3xl font-bold tabular-nums" />
        </KpiCard>
        <KpiCard
          label="SMS Follow-ups"
          icon={<MessageSquare className="h-4 w-4" />}
          tone="info"
        >
          <CountUp value={smsSent30} className="text-3xl font-bold tabular-nums" />
        </KpiCard>
        <KpiCard
          label="Booking Rate"
          icon={<BarChart2 className="h-4 w-4" />}
          tone="success"
        >
          <span className="text-3xl font-bold tabular-nums">{bookingRate}%</span>
        </KpiCard>
      </div>

      <SpotlightCard>
        <div className="border-b border-border/60 px-5 py-4">
          <h2 className="text-sm font-semibold">
            Daily Call Volume — Last 30 Days
          </h2>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="calls" stroke="hsl(var(--primary))" fill="url(#cg)" strokeWidth={2} name="Total Calls" />
              <Area type="monotone" dataKey="booked" stroke="hsl(var(--success))" fill="url(#bg2)" strokeWidth={2} name="Booked" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SpotlightCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SpotlightCard>
          <div className="border-b border-border/60 px-5 py-4">
            <h2 className="text-sm font-semibold">Weekly Trend — Last 12 Weeks</h2>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Calls" />
                <Bar dataKey="booked" fill="hsl(var(--success))" radius={[3, 3, 0, 0]} name="Booked" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SpotlightCard>

        <SpotlightCard>
          <div className="border-b border-border/60 px-5 py-4">
            <h2 className="text-sm font-semibold">Peak Call Hours</h2>
            <p className="text-xs text-muted-foreground">When callers are most active</p>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="calls" fill="hsl(var(--info))" radius={[3, 3, 0, 0]} name="Calls" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SpotlightCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SpotlightCard>
          <div className="border-b border-border/60 px-5 py-4">
            <h2 className="text-sm font-semibold">Call Outcomes</h2>
          </div>
          <div className="flex items-center justify-center p-5">
            {outcomeData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No outcome data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={outcomeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    dataKey="value"
                    label={({ name, percent }: { name: string; percent: number }) =>
                      `${name} ${Math.round(percent * 100)}%`
                    }
                    labelLine={false}
                    fontSize={10}
                  >
                    {outcomeData.map((_: unknown, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </SpotlightCard>

        <SpotlightCard>
          <div className="border-b border-border/60 px-5 py-4">
            <h2 className="text-sm font-semibold">Top Call Reasons</h2>
          </div>
          <div className="p-5">
            {topReasons.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-3">
                {topReasons.map(
                  (r: { name: string; value: number }, i: number) => {
                    const max = topReasons[0].value;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="capitalize text-foreground">{r.name}</span>
                          <span className="tabular-nums text-muted-foreground">{r.value}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${(r.value / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </SpotlightCard>
      </div>

      <SpotlightCard>
        <div className="border-b border-border/60 px-5 py-4">
          <h2 className="text-sm font-semibold">Value Delivered This Month</h2>
          <p className="text-xs text-muted-foreground">
            What your AI receptionist accomplished — no human needed
          </p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border/60 md:grid-cols-4">
          {[
            { label: "Calls Answered", value: totalCalls30.toString(), sub: "zero hold time" },
            { label: "Appts Booked", value: booked30.toString(), sub: `${bookingRate}% conversion` },
            { label: "Hours Covered", value: `${hoursHandled}h`, sub: "by AI, not staff" },
            { label: "After-Hours Calls", value: afterHoursCalls.toString(), sub: "captured, not missed" },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center justify-center px-4 py-6 text-center">
              <div className="text-2xl font-bold tabular-nums">{item.value}</div>
              <div className="mt-0.5 text-xs font-medium">{item.label}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">{item.sub}</div>
            </div>
          ))}
        </div>
      </SpotlightCard>
    </div>
  );
}

function KpiCard({
  label,
  icon,
  tone = "neutral",
  delta,
  deltaLabel,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  tone?: string;
  delta?: number;
  deltaLabel?: string;
  children: React.ReactNode;
}) {
  const toneIcon: Record<string, string> = {
    neutral: "bg-muted text-foreground",
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    info: "bg-info/15 text-info",
    warning: "bg-warning/15 text-warning",
  };
  return (
    <SpotlightCard>
      <div className="flex h-full flex-col p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </div>
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full",
              toneIcon[tone] ?? toneIcon.neutral
            )}
          >
            {icon}
          </div>
        </div>
        <div className="flex-1">{children}</div>
        {delta !== undefined && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
            <span
              className={cn(
                "font-medium",
                delta >= 0 ? "text-success" : "text-destructive"
              )}
            >
              {delta >= 0 ? "+" : ""}
              {delta}%
            </span>
            <span>{deltaLabel}</span>
          </div>
        )}
      </div>
    </SpotlightCard>
  );
}
