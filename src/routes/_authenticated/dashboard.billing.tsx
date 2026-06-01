import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client-untyped";
import type { Invoice } from "@/integrations/supabase/app-types";
import { useMe } from "@/lib/me";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/dashboard/billing")({
  component: BillingPage,
});

function BillingPage() {
  const me = useMe();
  const tenantId = me.tenant?.id ?? null;
  const clientNumber = me.tenant?.client_number ?? null;

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

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">Invoices and account number</p>
        </div>
        {clientNumber && (
          <div className="rounded-lg border border-border bg-card px-4 py-2 text-right">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Client #</div>
            <div className="font-mono text-sm font-semibold tabular-nums">{clientNumber}</div>
          </div>
        )}
      </header>

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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
