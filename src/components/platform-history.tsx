import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format, startOfMonth, subMonths } from "date-fns";
import { CalendarCheck, Clock3, Phone, PhoneForwarded } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client-untyped";
import type { Call, Tenant } from "@/integrations/supabase/app-types";
import { PlanBadge } from "@/components/badges";

type HistoryCall = Pick<
  Call,
  | "id"
  | "tenant_id"
  | "created_at"
  | "duration_seconds"
  | "appointment_booked"
  | "transferred"
  | "is_new_patient"
  | "sms_sent"
>;

function totals(calls: HistoryCall[]) {
  const seconds = calls.reduce((sum, call) => sum + (call.duration_seconds ?? 0), 0);
  return {
    calls: calls.length,
    minutes: Math.ceil(seconds / 60),
    booked: calls.filter((call) => call.appointment_booked).length,
    transferred: calls.filter((call) => call.transferred).length,
    newCallers: calls.filter((call) => call.is_new_patient).length,
    sms: calls.filter((call) => call.sms_sent).length,
  };
}

export function PlatformHistory({ tenants }: { tenants: Tenant[] }) {
  const [selectedMonth, setSelectedMonth] = useState(0);
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, index) => startOfMonth(subMonths(now, index)));
  const firstMonth = format(months[11], "yyyy-MM");

  const historyQ = useQuery({
    queryKey: ["platform-history", firstMonth],
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const calls: HistoryCall[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase
          .from("calls")
          .select(
            "id, tenant_id, created_at, duration_seconds, appointment_booked, transferred, is_new_patient, sms_sent",
          )
          .gte("created_at", months[11].toISOString())
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(offset, offset + 999)
          .returns<HistoryCall[]>();
        if (error) throw error;
        calls.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      return calls;
    },
  });

  const lifetimeQ = useQuery({
    queryKey: ["platform-lifetime-call-count"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("calls")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const calls = historyQ.data ?? [];
  const monthRows = months.map((month) => {
    const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    const matching = calls.filter((call) => {
      const created = new Date(call.created_at);
      return created >= month && created < next;
    });
    return {
      key: format(month, "yyyy-MM"),
      label: format(month, "MMMM yyyy"),
      short: format(month, "MMM yy"),
      ...totals(matching),
    };
  });
  const selected = monthRows[selectedMonth];
  const previous = monthRows[selectedMonth + 1];
  const start = months[selectedMonth];
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  const selectedCalls = calls.filter((call) => {
    const created = new Date(call.created_at);
    return created >= start && created < end;
  });
  const clientRows = tenants
    .map((tenant) => ({
      tenant,
      ...totals(selectedCalls.filter((call) => call.tenant_id === tenant.id)),
    }))
    .sort((a, b) => b.calls - a.calls);
  const year = totals(calls);
  const metrics = [
    { label: "Calls", icon: Phone, value: selected.calls, prior: previous?.calls },
    { label: "Minutes used", icon: Clock3, value: selected.minutes, prior: previous?.minutes },
    { label: "Appointments", icon: CalendarCheck, value: selected.booked, prior: previous?.booked },
    {
      label: "Transfers",
      icon: PhoneForwarded,
      value: selected.transferred,
      prior: previous?.transferred,
    },
  ];

  return (
    <div className="space-y-5">
      {(historyQ.error || lifetimeQ.error) && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          Historical calls could not be loaded. Refresh the page to try again.
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Lifetime calls</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {lifetimeQ.isLoading ? "…" : (lifetimeQ.data ?? 0).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">All recorded workspaces</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Calls · last 12 months</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {historyQ.isLoading ? "…" : year.calls.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Across every client</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Minutes · last 12 months</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {historyQ.isLoading ? "…" : year.minutes.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Recorded call duration</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Monthly performance
            </p>
            <h2 className="mt-1 text-lg font-semibold">{selected.label}</h2>
            <p className="text-xs text-muted-foreground">
              Platform totals, with the previous month alongside.
            </p>
          </div>
          <label className="text-xs font-medium text-muted-foreground">
            Month{" "}
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(Number(event.target.value))}
              className="ml-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {monthRows.map((row, index) => (
                <option key={row.key} value={index}>
                  {row.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(({ label, icon: Icon, value, prior }) => (
            <div key={label} className="rounded-lg border border-border bg-background/70 p-4">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="h-4 w-4 text-primary" />
                {label}
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {historyQ.isLoading ? "…" : value.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {previous
                  ? `${previous.label}: ${(prior ?? 0).toLocaleString()}`
                  : "Recorded across clients"}
              </p>
            </div>
          ))}
        </div>
        <div className="grid gap-3 border-t border-border px-5 py-4 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">New callers</span>
            <strong className="ml-2 tabular-nums">{selected.newCallers.toLocaleString()}</strong>
          </div>
          <div>
            <span className="text-muted-foreground">SMS follow-ups</span>
            <strong className="ml-2 tabular-nums">{selected.sms.toLocaleString()}</strong>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Call and minute trend</h2>
        <p className="mb-5 text-xs text-muted-foreground">Last 12 calendar months · all clients</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[...monthRows].reverse()}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="short" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="calls" fill="var(--primary)" radius={[3, 3, 0, 0]} name="Calls" />
              <Bar dataKey="minutes" fill="var(--chart-2)" radius={[3, 3, 0, 0]} name="Minutes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Client usage · {selected.label}</h2>
          <p className="text-xs text-muted-foreground">
            Every workspace, including clients with zero calls.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-3 py-3 font-medium">Plan</th>
                <th className="px-3 py-3 text-right font-medium">Calls</th>
                <th className="px-3 py-3 text-right font-medium">Minutes</th>
                <th className="px-3 py-3 text-right font-medium">Booked</th>
                <th className="px-3 py-3 text-right font-medium">Transfers</th>
                <th className="px-5 py-3 text-right font-medium">New callers</th>
              </tr>
            </thead>
            <tbody>
              {clientRows.map((row) => (
                <tr key={row.tenant.id} className="border-t border-border/60 hover:bg-muted/20">
                  <td className="px-5 py-3 font-medium">{row.tenant.name}</td>
                  <td className="px-3 py-3">
                    <PlanBadge plan={row.tenant.plan} />
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {row.calls.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {row.minutes.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {row.booked.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {row.transferred.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {row.newCallers.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
          Minutes are rounded up from recorded call duration. Billing adjustments may differ.
        </p>
      </section>
    </div>
  );
}
