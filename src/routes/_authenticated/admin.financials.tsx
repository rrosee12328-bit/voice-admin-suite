import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, Users, CircleAlert, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client-untyped";
import type { Tenant } from "@/integrations/supabase/app-types";
import { PLAN_LABEL, PLAN_PRICE } from "@/lib/plan-gating";
import { PlanBadge } from "@/components/badges";
import { SpotlightCard } from "@/components/spotlight-card";

export const Route = createFileRoute("/_authenticated/admin/financials")({
  head: () => ({ meta: [{ title: "Financials — Vektiss Voice" }] }),
  component: Financials,
});

const money = (amount: number) =>
  amount.toLocaleString(undefined, { style: "currency", currency: "USD" });

function Financials() {
  const tenantsQ = useQuery({
    queryKey: ["platform-financials-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Tenant[];
    },
  });
  const tenants = tenantsQ.data ?? [];
  const listedValue = tenants.reduce((sum, tenant) => sum + (PLAN_PRICE[tenant.plan] ?? 0), 0);
  const activeSubscriptions = tenants.filter(
    (tenant) => tenant.stripe_subscription_status === "active",
  ).length;
  const needsAttention = tenants.filter((tenant) =>
    ["past_due", "unpaid", "incomplete"].includes(tenant.stripe_subscription_status ?? ""),
  ).length;
  const plans = Object.entries(
    tenants.reduce<Record<string, number>>((counts, tenant) => {
      counts[tenant.plan] = (counts[tenant.plan] ?? 0) + 1;
      return counts;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Platform Control
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Financials</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Plan catalog values and subscription status across client workspaces.
        </p>
      </header>

      {tenantsQ.error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          Financial data could not be loaded. Refresh the page to try again.
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <SpotlightCard className="p-5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Listed plan value estimate <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-5 text-4xl font-semibold tabular-nums">
            {tenantsQ.isLoading ? "…" : money(listedValue)}
            <span className="text-sm font-normal text-muted-foreground">/mo</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Catalog prices across {tenants.length} workspaces. This is not collected revenue; custom
            plans are excluded from the estimate.
          </p>
        </SpotlightCard>
        <SpotlightCard className="p-5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Active subscriptions <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-5 text-4xl font-semibold tabular-nums">
            {tenantsQ.isLoading ? "…" : activeSubscriptions}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Based on each workspace’s stored subscription status.
          </p>
        </SpotlightCard>
        <SpotlightCard className="p-5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Needs attention <CircleAlert className="h-4 w-4 text-warning" />
          </div>
          <div className="mt-5 text-4xl font-semibold tabular-nums">
            {tenantsQ.isLoading ? "…" : needsAttention}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Past due, unpaid, or incomplete subscriptions.
          </p>
        </SpotlightCard>
      </section>

      <SpotlightCard className="p-5">
        <h2 className="text-sm font-semibold">Plan distribution</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map(([plan, count]) => (
            <div key={plan} className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="text-xs text-muted-foreground">
                {PLAN_LABEL[plan as keyof typeof PLAN_LABEL] ?? plan}
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">{count}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {money((PLAN_PRICE[plan as keyof typeof PLAN_PRICE] ?? 0) * count)}/mo listed
              </div>
            </div>
          ))}
          {!tenantsQ.isLoading && plans.length === 0 && (
            <p className="text-sm text-muted-foreground">No client plans yet.</p>
          )}
        </div>
      </SpotlightCard>

      <SpotlightCard>
        <div className="border-b border-border/60 p-5">
          <h2 className="text-sm font-semibold">Client plans</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Open a client for billing and subscription details.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium">Listed monthly value</th>
                <th className="px-5 py-3 font-medium">Subscription</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="border-b border-border/40 hover:bg-muted/30">
                  <td className="px-5 py-3 font-medium">
                    {tenant.slug ? (
                      <Link
                        to="/admin/clients/$slug"
                        params={{ slug: tenant.slug }}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        {tenant.name}
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    ) : (
                      tenant.name
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <PlanBadge plan={tenant.plan} />
                  </td>
                  <td className="px-5 py-3 tabular-nums">
                    {tenant.plan === "custom" ? "Quoted" : money(PLAN_PRICE[tenant.plan] ?? 0)}
                  </td>
                  <td className="px-5 py-3 capitalize text-muted-foreground">
                    {tenant.stripe_subscription_status?.replaceAll("_", " ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!tenantsQ.isLoading && tenants.length === 0 && (
            <p className="p-5 text-sm text-muted-foreground">No clients yet.</p>
          )}
        </div>
      </SpotlightCard>
    </div>
  );
}
