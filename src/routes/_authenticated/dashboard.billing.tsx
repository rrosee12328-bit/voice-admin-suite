import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { ExternalLink, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client-untyped";
import type { Invoice } from "@/integrations/supabase/app-types";
import { useMe } from "@/lib/me";
import { PLAN_LABEL, PLAN_PRICE } from "@/lib/plan-gating";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/dashboard/billing")({
  component: BillingPage,
});

const VEKTISS_FN = "https://hygmztvpmmyxuomjwrbt.supabase.co/functions/v1";

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
      const res = await fetch(`${VEKTISS_FN}/customer-portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Failed"));
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

  const invoices = invoicesQ.data ?? [];
  const minutesPct = minutesIncluded > 0
    ? Math.min(100, Math.round((minutesUsed / minutesIncluded) * 100))
    : 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">Plan, usage, and invoices</p>
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
              <span className="tabular-nums">{minutesUsed} / {minutesIncluded}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${minutesPct}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Invoices */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {invoicesQ.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            description="Invoices will appear here at the end of each billing cycle."
            icon={<Receipt className="h-8 w-8" />}
          />
        ) : (
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
        )}
      </div>
    </div>
  );
}
