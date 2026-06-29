import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import {
  ExternalLink,
  Loader2,
  Receipt,
  BarChart3,
  Phone,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client-untyped";
import { SUPABASE_FUNCTIONS_URL, requireSupabasePublishableKey } from "@/integrations/supabase/config";
import type { Invoice, MonthlyUsage } from "@/integrations/supabase/app-types";
import { useMe } from "@/lib/me";
import { PLAN_LABEL, PLAN_PRICE } from "@/lib/plan-gating";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/dashboard/billing")({
  component: BillingPage,
});

function UsageBar({ used, included }: { used: number; included: number }) {
  const pct = included > 0 ? Math.min(100, Math.round((used / included) * 100)) : 0;
  const isOver = used > included;
  return (
    <div className="mt-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full transition-all ${isOver ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MonthlyUsageRow({ row }: { row: MonthlyUsage }) {
  const [expanded, setExpanded] = useState(false);
  const isCurrentMonth =
    row.period_start.slice(0, 7) === new Date().toISOString().slice(0, 7);
  const hasOverage = row.overage_minutes > 0;

  return (
    <>
      <tr
        className="border-b border-border/60 hover:bg-muted/20 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-3 font-medium">
          <div className="flex items-center gap-2">
            {format(new Date(row.period_start + "T00:00:00"), "MMMM yyyy")}
            {isCurrentMonth && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
                Current
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 tabular-nums text-sm">
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            {row.call_count}
          </div>
        </td>
        <td className="px-4 py-3 tabular-nums text-sm">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className={hasOverage ? "text-destructive font-medium" : ""}>
                {row.minutes_used}
              </span>
              <span className="text-muted-foreground">/ {row.minutes_included} min</span>
            </div>
            <UsageBar used={row.minutes_used} included={row.minutes_included} />
          </div>
        </td>
        <td className="px-4 py-3 text-sm">
          {hasOverage ? (
            <div className="flex items-center gap-1.5 text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="font-medium">
                +{row.overage_minutes} min (${(row.overage_amount_cents / 100).toFixed(2)})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="text-xs">Within plan</span>
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-right text-muted-foreground">
          {expanded ? (
            <ChevronUp className="h-4 w-4 inline" />
          ) : (
            <ChevronDown className="h-4 w-4 inline" />
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border/40 bg-muted/10">
          <td colSpan={5} className="px-4 py-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Calls</div>
                <div className="text-xl font-semibold tabular-nums">{row.call_count}</div>
              </div>
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">New Patients</div>
                <div className="text-xl font-semibold tabular-nums">{row.new_patient_calls}</div>
              </div>
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Appointments</div>
                <div className="text-xl font-semibold tabular-nums">{row.appointments_booked}</div>
              </div>
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Transferred</div>
                <div className="text-xl font-semibold tabular-nums">{row.transferred_calls}</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Period: {format(new Date(row.period_start + "T00:00:00"), "MMM d")} – {format(new Date(row.period_end + "T00:00:00"), "MMM d, yyyy")}
              {" · "}Plan: {PLAN_LABEL[row.plan as keyof typeof PLAN_LABEL] ?? row.plan}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function BillingPage() {
  const me = useMe();
  const tenant = me.tenant;
  const tenantId = tenant?.id ?? null;
  const clientNumber = tenant?.client_number ?? null;
  const plan = tenant?.plan ?? "phone_starter";
  const subStatus = tenant?.stripe_subscription_status ?? null;
  const minutesUsed = tenant?.minutes_used_this_month ?? 0;
  const minutesIncluded = tenant?.minutes_included ?? 0;

  const [portalLoading, setPortalLoading] = useState(false);

  const handleManageBilling = async () => {
    if (!tenantId) return toast.error("No tenant found.");
    setPortalLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) {
        toast.error("Your session has expired. Please sign in again.");
        return;
      }
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/customer-portal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: requireSupabasePublishableKey(),
        },
        body: JSON.stringify({ tenant_id: tenantId }),
      });
      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        let msg = raw || `Request failed (${res.status})`;
        try {
          const parsed = JSON.parse(raw);
          msg = parsed.error || parsed.message || msg;
        } catch {}
        if (/no stripe customer/i.test(msg)) {
          msg = "No Stripe customer linked to this account yet. Complete a checkout to set up billing.";
        }
        throw new Error(msg);
      }
      const data = await res.json();
      if (!data?.url) throw new Error("No portal URL returned.");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open portal.");
    } finally {
      setPortalLoading(false);
    }
  };

  const invoicesQ = useQuery({
    queryKey: ["invoices", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("period_start", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invoice[];
    },
  });

  const monthlyUsageQ = useQuery({
    queryKey: ["monthly_usage", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_usage")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("period_start", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MonthlyUsage[];
    },
  });

  const invoices = invoicesQ.data ?? [];
  const monthlyUsage = monthlyUsageQ.data ?? [];
  const minutesPct = minutesIncluded > 0
    ? Math.min(100, Math.round((minutesUsed / minutesIncluded) * 100))
    : 0;
  const isOverLimit = minutesUsed > minutesIncluded && minutesIncluded > 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">Plan, usage, and monthly records</p>
        </div>
        {clientNumber && (
          <div className="rounded-lg border border-border bg-card px-4 py-2 text-right">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Client #</div>
            <div className="font-mono text-sm font-semibold tabular-nums">{clientNumber}</div>
          </div>
        )}
      </header>

      {/* Subscription summary */}
      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Current plan</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-semibold">{PLAN_LABEL[plan] ?? plan}</span>
              {PLAN_PRICE[plan] != null && (
                <span className="text-sm text-muted-foreground">${PLAN_PRICE[plan]}/mo</span>
              )}
            </div>
            {subStatus && (
              <div className="mt-1 text-xs">
                <span className="rounded-full bg-muted px-2 py-0.5 capitalize">{subStatus.replace(/_/g, " ")}</span>
              </div>
            )}
          </div>
          <Button onClick={handleManageBilling} disabled={portalLoading || !tenantId}>
            {portalLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening…</>
            ) : (
              <><ExternalLink className="mr-2 h-4 w-4" /> Manage subscription</>
            )}
          </Button>
        </div>

        {minutesIncluded > 0 && (
          <div className="mt-5">
            <div className="mb-1 flex items-baseline justify-between text-xs text-muted-foreground">
              <span>Minutes used this month</span>
              <span className={`tabular-nums font-medium ${isOverLimit ? "text-destructive" : ""}`}>
                {minutesUsed} / {minutesIncluded} min
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all ${isOverLimit ? "bg-destructive" : "bg-primary"}`}
                style={{ width: `${minutesPct}%` }}
              />
            </div>
            {isOverLimit && (
              <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Plan limit exceeded — overages billed at $0.13/min. Resets on the 1st of next month.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Monthly Usage History */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Monthly Usage History</h2>
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {monthlyUsageQ.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : monthlyUsage.length === 0 ? (
            <EmptyState
              title="No usage records yet"
              description="Monthly usage records will appear here as calls come in."
              icon={<BarChart3 className="h-8 w-8" />}
            />
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Month</th>
                  <th className="px-4 py-2 text-left font-medium">Calls</th>
                  <th className="px-4 py-2 text-left font-medium">Minutes</th>
                  <th className="px-4 py-2 text-left font-medium">Overage</th>
                  <th className="px-4 py-2 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {monthlyUsage.map((row) => (
                  <MonthlyUsageRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Invoices */}
      {invoices.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Invoices</h2>
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Invoice #</th>
                  <th className="px-4 py-2 text-left font-medium">Period</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/60 hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {inv.period_start ? format(new Date(inv.period_start), "MMM d, yyyy") : "—"} – {inv.period_end ? format(new Date(inv.period_end), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{inv.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      ${(inv.amount_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.pdf_url ? (
                        <a
                          href={inv.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          PDF <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
