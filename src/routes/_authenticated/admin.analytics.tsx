import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Phone,
  DollarSign,
  Calendar,
  Activity,
  Clock,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client-untyped";
import type { Tenant, Call } from "@/integrations/supabase/app-types";
import { PLAN_PRICE, PLAN_LABEL } from "@/lib/plan-gating";
import { PlanBadge } from "@/components/badges";
import { SpotlightCard } from "@/components/spotlight-card";
import { cn } from "@/lib/utils";
import { PlatformHistory } from "@/components/platform-history";

const secondsToBillableMinutes = (seconds: number) => Math.ceil(seconds / 60);

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
      const calls: Pick<Call, "id" | "tenant_id" | "duration_seconds">[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase
          .from("calls")
          .select("id, tenant_id, duration_seconds")
          .gte("created_at", since)
          .order("id", { ascending: false })
          .range(offset, offset + 999);
        if (error) throw error;
        calls.push(...((data ?? []) as typeof calls));
        if (!data || data.length < 1000) break;
      }
      return calls;
    },
  });

  const recentCallsQ = useQuery({
    queryKey: ["platform-analytics-recent-calls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("id, tenant_id, caller_name, caller_phone, created_at, outcome, duration_seconds")
        .order("created_at", { ascending: false })
        .limit(8)
        .returns<
          Pick<
            Call,
            | "id"
            | "tenant_id"
            | "caller_name"
            | "caller_phone"
            | "created_at"
            | "outcome"
            | "duration_seconds"
          >[]
        >();
      if (error) throw error;
      return data ?? [];
    },
  });

  const tenants = tenantsQ.data ?? [];
  const totalClients = tenants.length;
  const activeClients = tenants.filter(
    (t) => t.agent_status === "live" || t.agent_status === "active",
  ).length;
  const mrr = tenants.reduce((sum, t) => sum + (PLAN_PRICE[t.plan] || 0), 0);

  const tenantById: Record<string, Tenant> = {};
  for (const t of tenants) tenantById[t.id] = t;

  const perTenant: Record<string, { calls: number; seconds: number }> = {};
  for (const c of monthCallsQ.data ?? []) {
    const t = perTenant[c.tenant_id] || { calls: 0, seconds: 0 };
    t.calls += 1;
    t.seconds += c.duration_seconds ?? 0;
    perTenant[c.tenant_id] = t;
  }
  const totalMinutes = secondsToBillableMinutes(
    Object.values(perTenant).reduce((s, t) => s + t.seconds, 0),
  );

  const planBreakdown = tenants.reduce<Record<string, number>>((acc, t) => {
    const k = t.plan || "unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  const overLimitCount = tenants.filter((t) => {
    const used = secondsToBillableMinutes(perTenant[t.id]?.seconds ?? 0);
    return (t.minutes_included ?? 0) > 0 && used > (t.minutes_included ?? 0);
  }).length;

  return (
    <div className="relative flex flex-col gap-6 p-6">
      {/* ambient backdrop grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
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
            Platform Control
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Platform Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live call and minute totals across every client workspace.
          </p>
        </div>
        <Link
          to="/dashboard/calls"
          search={{ tenantId: undefined }}
          className="hidden items-center gap-1 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground sm:inline-flex"
        >
          Unified call log <ArrowUpRight className="h-3 w-3" />
        </Link>
      </header>

      {(tenantsQ.error || callsQ.error || monthCallsQ.error) && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          Some platform totals could not be loaded. Refresh the page to try again.
        </div>
      )}

      {/* BENTO GRID */}
      <section className="grid auto-rows-[minmax(0,_1fr)] grid-cols-12 gap-4">
        {/* Hero: MRR */}
        <KpiTile
          className="col-span-12 sm:col-span-6 lg:col-span-5 lg:row-span-2"
          label="Listed plan value estimate"
          icon={<DollarSign className="h-4 w-4" />}
          tone="primary"
          large
        >
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-semibold tracking-tight tabular-nums">
              {tenantsQ.isLoading ? "…" : `$${mrr.toLocaleString()}`}
            </span>
            <span className="text-sm text-muted-foreground">/mo</span>
          </div>
          <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-success">
              <TrendingUp className="h-3 w-3" /> live
            </span>
            <span>Catalog prices across {totalClients} workspaces; not collected revenue</span>
          </div>
          <PlanBars planBreakdown={planBreakdown} tenants={tenants} />
        </KpiTile>

        <KpiTile
          className="col-span-6 lg:col-span-4"
          label="Total Clients"
          icon={<Users className="h-4 w-4" />}
          onClick={() =>
            document.getElementById("platform-client-usage")?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <span className="text-3xl font-semibold tabular-nums">
            {tenantsQ.isLoading ? "…" : totalClients.toLocaleString()}
          </span>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeClients} active · {totalClients - activeClients} paused
          </p>
        </KpiTile>

        <KpiTile
          className="col-span-6 lg:col-span-3"
          label="Active Agents"
          icon={<Activity className="h-4 w-4" />}
          tone="success"
          onClick={() =>
            document.getElementById("platform-client-usage")?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <span className="text-3xl font-semibold tabular-nums">
            {tenantsQ.isLoading ? "…" : activeClients.toLocaleString()}
          </span>
          <p className="mt-1 text-xs text-muted-foreground">Live receptionists right now</p>
        </KpiTile>

        <KpiTile
          className="col-span-6 lg:col-span-4"
          label="Calls This Month"
          icon={<Phone className="h-4 w-4" />}
          onClick={() =>
            document.getElementById("platform-monthly")?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <span className="text-3xl font-semibold tabular-nums">
            {callsQ.isLoading ? "…" : (callsQ.data ?? 0).toLocaleString()}
          </span>
          <p className="mt-1 text-xs text-muted-foreground">
            Since{" "}
            {new Date(since).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </p>
        </KpiTile>

        <KpiTile
          className="col-span-6 lg:col-span-3"
          label="Minutes Used"
          icon={<Clock className="h-4 w-4" />}
          tone={overLimitCount > 0 ? "warning" : "info"}
          onClick={() =>
            document.getElementById("platform-monthly")?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <span className="text-3xl font-semibold tabular-nums">
            {monthCallsQ.isLoading ? "…" : totalMinutes.toLocaleString()}
          </span>
          <p className="mt-1 text-xs text-muted-foreground">
            {overLimitCount > 0 ? (
              <span className="text-destructive">
                {overLimitCount} tenant{overLimitCount > 1 ? "s" : ""} over limit
              </span>
            ) : (
              "All tenants within plan limits"
            )}
          </p>
        </KpiTile>

        {/* Per-tenant usage — wide tile */}
        <SpotlightCard className="col-span-12 lg:col-span-8" radius={420}>
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Per-tenant usage</h2>
              <p className="text-xs text-muted-foreground">
                Minutes consumed this month · rows over limit highlighted
              </p>
            </div>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              hover rows to spotlight
            </span>
          </div>
          {tenants.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No clients yet.</div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card/95 backdrop-blur text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border/60">
                    <th className="px-5 py-2 text-left font-medium">Tenant</th>
                    <th className="px-3 py-2 text-left font-medium">Plan</th>
                    <th className="px-3 py-2 text-left font-medium">Minutes</th>
                    <th className="px-3 py-2 text-left font-medium">Calls</th>
                    <th className="px-5 py-2 text-left font-medium">Subscription</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => {
                    const agg = perTenant[t.id] ?? { calls: 0, seconds: 0 };
                    const minutesUsed = secondsToBillableMinutes(agg.seconds);
                    const minutesIncl = t.minutes_included ?? 0;
                    const pct =
                      minutesIncl > 0 ? Math.min(150, (minutesUsed / minutesIncl) * 100) : 0;
                    const over = minutesIncl > 0 && minutesUsed > minutesIncl;
                    return (
                      <tr
                        key={t.id}
                        className={cn(
                          "group border-b border-border/40 transition-colors hover:bg-muted/40",
                          over && "bg-destructive/[0.06] hover:bg-destructive/[0.1]",
                        )}
                      >
                        <td className="px-5 py-3 font-medium">
                          {t.slug ? (
                            <Link
                              to="/admin/clients/$slug"
                              params={{ slug: t.slug }}
                              className="text-primary hover:underline"
                            >
                              {t.name} →
                            </Link>
                          ) : (
                            t.name
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <PlanBadge plan={t.plan} />
                        </td>
                        <td className="px-3 py-3 w-[200px]">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "tabular-nums text-xs",
                                over ? "font-semibold text-destructive" : "text-muted-foreground",
                              )}
                            >
                              {minutesUsed.toLocaleString()}
                              <span className="text-muted-foreground/60">
                                /{minutesIncl > 0 ? minutesIncl.toLocaleString() : "∞"}
                              </span>
                            </div>
                          </div>
                          {minutesIncl > 0 && (
                            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-700",
                                  over ? "bg-destructive" : pct > 80 ? "bg-warning" : "bg-primary",
                                )}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 tabular-nums text-muted-foreground">
                          {agg.calls}
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground capitalize">
                          {t.stripe_subscription_status || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SpotlightCard>

        {/* Recent calls feed */}
        <SpotlightCard className="col-span-12 lg:col-span-4" radius={320}>
          <div className="flex items-center gap-2 border-b border-border/60 px-5 py-4">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Recent calls</h2>
          </div>
          {recentCallsQ.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (recentCallsQ.data ?? []).length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No calls yet.</div>
          ) : (
            <ul className="divide-y divide-border/60">
              {(recentCallsQ.data ?? []).map((c) => {
                const t = tenantById[c.tenant_id];
                return (
                  <li
                    key={c.id}
                    className="group/row flex items-center justify-between px-5 py-3 text-sm transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <Link
                        to="/dashboard/calls/$id"
                        params={{ id: c.id }}
                        search={{ tenantId: c.tenant_id }}
                        className="truncate font-medium text-primary hover:underline"
                      >
                        {c.caller_name || c.caller_phone || "Unknown caller"} →
                      </Link>
                      <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                        <span className="h-1 w-1 rounded-full bg-primary/60" />
                        {t?.name ?? "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      </div>
                      {c.duration_seconds != null && (
                        <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                          {Math.floor(c.duration_seconds / 60)}:
                          {String(c.duration_seconds % 60).padStart(2, "0")}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SpotlightCard>
      </section>
      <PlatformHistory tenants={tenants} />
    </div>
  );
}

function KpiTile({
  className,
  label,
  icon,
  children,
  tone = "neutral",
  large = false,
  onClick,
}: {
  className?: string;
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning" | "info";
  large?: boolean;
  onClick?: () => void;
}) {
  const toneStyles: Record<string, string> = {
    neutral: "bg-muted text-foreground",
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    info: "bg-info/15 text-info",
  };

  return (
    <SpotlightCard className={className}>
      <div
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={
          onClick
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        className={cn(
          "flex h-full flex-col p-5",
          large && "p-6",
          onClick &&
            "cursor-pointer transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </div>
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              toneStyles[tone],
            )}
          >
            {icon}
          </div>
        </div>
        <div className="flex-1">{children}</div>
        {onClick && <span className="mt-2 text-xs font-medium text-primary">View details ↓</span>}
      </div>
    </SpotlightCard>
  );
}

function PlanBars({
  planBreakdown,
  tenants,
}: {
  planBreakdown: Record<string, number>;
  tenants: Tenant[];
}) {
  const total = tenants.length || 1;
  const entries = Object.entries(planBreakdown).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  const colorFor: Record<string, string> = {
    phone_starter: "bg-slate-badge",
    phone_email: "bg-info",
    ai_front_office: "bg-primary",
    custom: "bg-warning",
  };

  return (
    <div className="mt-6 space-y-3 border-t border-border/60 pt-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Plan distribution
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        {entries.map(([plan, count]) => (
          <div
            key={plan}
            className={cn("h-full transition-all", colorFor[plan] || "bg-muted-foreground/40")}
            style={{ width: `${(count / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="space-y-1.5 text-xs">
        {entries.map(([plan, count]) => (
          <li key={plan} className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className={cn("h-2 w-2 rounded-full", colorFor[plan] || "bg-muted-foreground/40")}
              />
              {PLAN_LABEL[plan as keyof typeof PLAN_LABEL] || plan}
            </span>
            <span className="tabular-nums font-medium">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
