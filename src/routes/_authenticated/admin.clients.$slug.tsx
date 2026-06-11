import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Eye, ExternalLink, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client-untyped";
import type { Tenant, Profile, Invoice } from "@/integrations/supabase/app-types";
import { DashboardView } from "./dashboard.index";
import { PLAN_LABEL, PLAN_PRICE } from "@/lib/plan-gating";
import { PlanBadge, StatusDot } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin/clients/$slug")({
  component: AdminClientView,
});

const VEKTISS_FN = "https://hygmztvpmmyxuomjwrbt.supabase.co/functions/v1";
const VEKTISS_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Z216dHZwbW15eHVvbWp3cmJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTU2MDgsImV4cCI6MjA5NTU3MTYwOH0.ZDH9dTK-Oih5-eTRF_wgllcQru2Xn4qsi6l7rlu670E";

function AdminClientView() {
  const { slug } = Route.useParams();
  const [tab, setTab] = useState("dashboard");

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-by-slug", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("slug", slug)
        .maybeSingle<Tenant>();
      if (error) throw error;
      return data;
    },
  });

  const { data: primaryUser } = useQuery({
    queryKey: ["tenant-primary-user", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("role", { ascending: true })
        .limit(1)
        .maybeSingle<Profile>();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-64 w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-6">
        <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">← Back to clients</Link>
        <div className="mt-6 rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Client not found.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-primary/30 bg-primary/10 px-6 py-2.5">
        <div className="flex items-center gap-2 text-xs">
          <Eye className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground">Admin viewing:</span>
          <span className="font-semibold">{tenant.name}</span>
        </div>
        <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <ArrowLeft className="h-3 w-3" /> Back to all clients
        </Link>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="border-b border-border bg-card px-6">
          <TabsList className="h-10 bg-transparent">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="mt-0">
          <DashboardView
            tenantId={tenant.id}
            tenantName={tenant.name}
            agentStatus={tenant.agent_status}
            minutesUsed={tenant.minutes_used_this_month}
            minutesIncluded={tenant.minutes_included}
            plan={tenant.plan}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-0">
          <ClientSettingsView tenant={tenant} primaryUser={primaryUser ?? null} />
        </TabsContent>

        <TabsContent value="billing" className="mt-0">
          <ClientBillingView tenant={tenant} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ClientSettingsView({ tenant, primaryUser }: { tenant: Tenant; primaryUser: Profile | null }) {
  const plan = tenant.plan ?? "phone_starter";

  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Client workspace details and plan</p>
      </header>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Workspace</h2>
        <dl className="grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Name</dt>
            <dd className="mt-1">{tenant.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Phone</dt>
            <dd className="mt-1 tabular-nums">{tenant.retell_phone_number || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Agent status</dt>
            <dd className="mt-1"><StatusDot status={tenant.agent_status ?? null} /></dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Slug</dt>
            <dd className="mt-1 font-mono text-xs">{tenant.slug || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Client #</dt>
            <dd className="mt-1 font-mono text-xs">{tenant.client_number || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Created</dt>
            <dd className="mt-1">{tenant.created_at ? format(new Date(tenant.created_at), "MMM d, yyyy") : "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Current plan</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="text-foreground font-medium">{PLAN_LABEL[plan]}</span>
              {PLAN_PRICE[plan] > 0 && ` · $${PLAN_PRICE[plan]}/mo`}
            </p>
          </div>
          <PlanBadge plan={plan} />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Primary account on file</h2>
        {primaryUser ? (
          <dl className="grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Name</dt>
              <dd className="mt-1">{primaryUser.name || primaryUser.full_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="mt-1">{primaryUser.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Role</dt>
              <dd className="mt-1 capitalize">{(primaryUser.role ?? "client").replace(/_/g, " ")}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No user has accepted the workspace invite yet.</p>
        )}
      </section>
    </div>
  );
}

function ClientBillingView({ tenant }: { tenant: Tenant }) {
  const tenantId = tenant.id;
  const clientNumber = tenant.client_number ?? null;
  const plan = tenant.plan ?? "phone_starter";
  const subStatus = tenant.stripe_subscription_status ?? null;
  const minutesUsed = tenant.minutes_used_this_month ?? 0;
  const minutesIncluded = tenant.minutes_included ?? 0;
  const [portalLoading, setPortalLoading] = useState(false);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) {
        toast.error("Your session has expired. Please sign in again.");
        return;
      }
      const res = await fetch(`${VEKTISS_FN}/customer-portal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: VEKTISS_ANON,
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
          msg = "No Stripe customer linked to this account yet.";
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("tenant_id", tenantId)
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
          <p className="text-sm text-muted-foreground">Client plan, usage, and invoices</p>
        </div>
        {clientNumber && (
          <div className="rounded-lg border border-border bg-card px-4 py-2 text-right">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Client #</div>
            <div className="font-mono text-sm font-semibold tabular-nums">{clientNumber}</div>
          </div>
        )}
      </header>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Current plan</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-semibold">{PLAN_LABEL[plan] ?? plan}</span>
              {PLAN_PRICE[plan] != null && PLAN_PRICE[plan] > 0 && (
                <span className="text-sm text-muted-foreground">${PLAN_PRICE[plan]}/mo</span>
              )}
            </div>
            {subStatus && (
              <div className="mt-1 text-xs">
                <span className="rounded-full bg-muted px-2 py-0.5 capitalize">{subStatus.replace(/_/g, " ")}</span>
              </div>
            )}
          </div>
          <Button onClick={handleManageBilling} disabled={portalLoading}>
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
              <div className="h-full bg-primary transition-all" style={{ width: `${minutesPct}%` }} />
            </div>
          </div>
        )}
      </section>

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
