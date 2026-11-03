import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, subMonths } from "date-fns";
import { CalendarCheck, Clock3, Phone, PhoneForwarded } from "lucide-react";
import { supabase } from "@/integrations/supabase/client-untyped";
import type { Call, MonthlyUsage } from "@/integrations/supabase/app-types";

type HistoryCall = Pick<
  Call,
  | "created_at"
  | "duration_seconds"
  | "appointment_booked"
  | "transferred"
  | "is_new_patient"
  | "sms_sent"
>;

type MonthTotals = {
  key: string;
  label: string;
  calls: number;
  minutes: number;
  booked: number;
  transferred: number;
  newPatients: number;
  sms: number;
  averageSeconds: number;
  included: number | null;
  overage: number | null;
};

const fields =
  "created_at, duration_seconds, appointment_booked, transferred, is_new_patient, sms_sent";

export function MonthlyPerformance({ tenantId }: { tenantId: string | null }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["monthly-performance", tenantId],
    enabled: !!tenantId,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const since = startOfMonth(subMonths(new Date(), 11)).toISOString();
      const calls: HistoryCall[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data: page, error: callError } = await supabase
          .from("calls")
          .select(fields)
          .eq("tenant_id", tenantId!)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(offset, offset + 999)
          .returns<HistoryCall[]>();
        if (callError) throw callError;
        calls.push(...(page ?? []));
        if (!page || page.length < 1000) break;
      }

      const { data: usage, error: usageError } = await supabase
        .from("monthly_usage")
        .select("period_start, minutes_included, overage_minutes")
        .eq("tenant_id", tenantId!)
        .gte("period_start", since.slice(0, 10))
        .order("period_start", { ascending: false })
        .returns<Pick<MonthlyUsage, "period_start" | "minutes_included" | "overage_minutes">[]>();
      return { calls, usage: usageError ? [] : (usage ?? []) };
    },
  });

  const now = new Date();
  const months: MonthTotals[] = Array.from({ length: 12 }, (_, index) => {
    const month = startOfMonth(subMonths(now, index));
    const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    const monthCalls = (data?.calls ?? []).filter((call) => {
      const created = new Date(call.created_at);
      return created >= month && created < next;
    });
    const seconds = monthCalls.reduce((total, call) => total + (call.duration_seconds ?? 0), 0);
    const usage = data?.usage.find(
      (row) => row.period_start.slice(0, 7) === format(month, "yyyy-MM"),
    );
    return {
      key: format(month, "yyyy-MM"),
      label: format(month, "MMMM yyyy"),
      calls: monthCalls.length,
      minutes: Math.ceil(seconds / 60),
      booked: monthCalls.filter((call) => call.appointment_booked).length,
      transferred: monthCalls.filter((call) => call.transferred).length,
      newPatients: monthCalls.filter((call) => call.is_new_patient).length,
      sms: monthCalls.filter((call) => call.sms_sent).length,
      averageSeconds: monthCalls.length ? Math.round(seconds / monthCalls.length) : 0,
      included: usage?.minutes_included ?? null,
      overage: usage?.overage_minutes ?? null,
    };
  });

  const current = months[0];
  const previous = months[1];
  const metrics = [
    { label: "Calls", icon: Phone, value: current.calls, prior: previous.calls },
    { label: "Minutes used", icon: Clock3, value: current.minutes, prior: previous.minutes },
    { label: "Appointments", icon: CalendarCheck, value: current.booked, prior: previous.booked },
    {
      label: "Transfers",
      icon: PhoneForwarded,
      value: current.transferred,
      prior: previous.transferred,
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Performance
        </div>
        <h2 className="mt-1 text-lg font-semibold">Monthly call and usage history</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Compare this month with {previous.label}, then review the last 12 calendar months.
        </p>
      </div>

      {error ? (
        <p className="p-5 text-sm text-destructive">
          Monthly history could not be loaded. Please refresh the page.
        </p>
      ) : isLoading ? (
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map(({ label, icon: Icon, value, prior }) => (
              <div key={label} className="rounded-lg border border-border bg-background/70 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Icon className="h-4 w-4 text-primary" /> {label}
                </div>
                <div className="mt-2 text-2xl font-semibold tabular-nums">
                  {value.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {previous.label}:{" "}
                  <span className="font-medium text-foreground">{prior.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto border-t border-border">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Month</th>
                  <th className="px-3 py-3 text-right font-medium">Calls</th>
                  <th className="px-3 py-3 text-right font-medium">Minutes</th>
                  <th className="px-3 py-3 text-right font-medium">Avg call</th>
                  <th className="px-3 py-3 text-right font-medium">New callers</th>
                  <th className="px-3 py-3 text-right font-medium">Booked</th>
                  <th className="px-3 py-3 text-right font-medium">Transferred</th>
                  <th className="px-5 py-3 text-right font-medium">SMS</th>
                </tr>
              </thead>
              <tbody>
                {months.map((month, index) => (
                  <tr key={month.key} className="border-t border-border/60 hover:bg-muted/20">
                    <td className="whitespace-nowrap px-5 py-3 font-medium">
                      {month.label}
                      {index === 0 && (
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          Current
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {month.calls.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {month.minutes.toLocaleString()}
                      {month.included !== null && (
                        <span className="block text-xs text-muted-foreground">
                          of {month.included.toLocaleString()} included
                        </span>
                      )}
                      {!!month.overage && (
                        <span className="block text-xs text-destructive">
                          +{month.overage} overage
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {Math.floor(month.averageSeconds / 60)}:
                      {String(month.averageSeconds % 60).padStart(2, "0")}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {month.newPatients.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {month.booked.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {month.transferred.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {month.sms.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
            Minutes are rounded up from total recorded call duration for each month. Plan allowances
            and overages appear when a billing record is available.
          </p>
        </>
      )}
    </section>
  );
}
