import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, BarChart3, Eye, ExternalLink, Loader2, Mail, Receipt, Phone, Clock, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Database, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client-untyped";
import type { Tenant, Profile, Invoice, MonthlyUsage } from "@/integrations/supabase/app-types";
import { DashboardView } from "./dashboard.index";
import { PLAN_LABEL, PLAN_PRICE } from "@/lib/plan-gating";
import { PlanBadge, StatusDot } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SUPABASE_FUNCTIONS_URL, requireSupabasePublishableKey } from "@/integrations/supabase/config";
import {
  sendClientPasswordReset,
  updateClientEmail,
  updateClientPhone,
  getClientAuthInfo,
  getClientAccountForTenant,
  createOrUpdateClientAccountForTenant,
} from "@/lib/admin-user.functions";

export const Route = createFileRoute("/_authenticated/admin/clients/$slug")({
  component: AdminClientView,
});

type IntakeContact = {
  id: string;
  businessName: string | null;
  email: string | null;
  phone: string | null;
  answers: Record<string, unknown>;
};

type AccountAuth = {
  email: string | null;
  phone: string | null;
  emailConfirmedAt: string | null;
  phoneConfirmedAt: string | null;
  lastSignInAt: string | null;
};

type TenantExternalConnectionHealth = {
  tenant_id: string;
  tenant_name: string;
  slug: string | null;
  provider: string;
  is_connected: boolean;
  status: string;
  environment_url: string | null;
  settings: Record<string, unknown> | null;
  last_synced_at: string | null;
  integration_updated_at: string | null;
  last_campaign_at: string | null;
  last_campaign_name: string | null;
  campaign_count: number;
  contact_count: number;
  pending_contact_count: number;
  last_contact_imported_at: string | null;
  health_status: string;
};

type TekmetricPreviewContact = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  last_service_date?: string;
  vehicle_info?: string;
  due_reason?: string;
};

function normalizeClientName(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function textAnswer(answers: Record<string, unknown>, key: string) {
  const value = answers[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function AdminClientView() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
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

  const { data: adminAccount } = useQuery({
    queryKey: ["client-account-for-tenant", tenant?.id],
    enabled: !!tenant?.id,
    retry: false,
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session has expired. Sign in again.");
      return await getClientAccountForTenant({ data: { tenantId: tenant!.id, accessToken: token } });
    },
  });

  const { data: intakeContact } = useQuery({
    queryKey: ["tenant-intake-contact", tenant?.id, tenant?.name, tenant?.slug],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intake_forms")
        .select("id,business_name,contact_phone,answers,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const targetName = normalizeClientName(tenant?.name);
      const targetSlug = normalizeClientName(tenant?.slug);
      const rows = ((data ?? []) as Array<{
        id: string;
        business_name: string | null;
        contact_phone: string | null;
        answers: Record<string, unknown> | null;
      }>).map((row) => {
        const answers = row.answers ?? {};
        return {
          id: row.id,
          businessName: row.business_name,
          email: textAnswer(answers, "__contact_email"),
          phone: row.contact_phone || textAnswer(answers, "primary_phone"),
          answers,
        } satisfies IntakeContact;
      });
      return rows.find((row) => {
        const rowName = normalizeClientName(row.businessName || textAnswer(row.answers, "business_name"));
        return rowName === targetName || rowName === targetSlug;
      }) ?? null;
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
    <div className="min-w-0 max-w-full overflow-x-hidden">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-primary/30 bg-primary/10 px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <Eye className="h-3.5 w-3.5 text-primary" />
          <span className="hidden text-muted-foreground min-[380px]:inline">Admin viewing:</span>
          <span className="truncate font-semibold">{tenant.name}</span>
        </div>
        <Link to="/admin" className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline">
          <ArrowLeft className="h-3 w-3" /> Back to all clients
        </Link>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="overflow-x-auto border-b border-border bg-card px-4 sm:px-6">
          <TabsList className="h-10 min-w-max bg-transparent">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
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

        <TabsContent value="integrations" className="mt-0">
          <ClientIntegrationsView tenant={tenant} />
        </TabsContent>

        <TabsContent value="settings" className="mt-0">
          <ClientSettingsView
            tenant={tenant}
            primaryUser={adminAccount?.profile ?? primaryUser ?? null}
            accountAuth={adminAccount?.auth ?? null}
            intakeContact={intakeContact ?? null}
            onContactUpdated={() => {
              queryClient.invalidateQueries({ queryKey: ["tenant-intake-contact", tenant.id] });
              queryClient.invalidateQueries({ queryKey: ["client-account-for-tenant", tenant.id] });
            }}
          />
        </TabsContent>

        <TabsContent value="billing" className="mt-0">
          <ClientBillingView tenant={tenant} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ClientIntegrationsView({ tenant }: { tenant: Tenant }) {
  const queryClient = useQueryClient();
  const [monthsSinceService, setMonthsSinceService] = useState(3);
  const [previewContacts, setPreviewContacts] = useState<TekmetricPreviewContact[]>([]);
  const [previewMeta, setPreviewMeta] = useState<{ cutoffDate?: string; count?: number } | null>(null);

  const connectionQ = useQuery({
    queryKey: ["tenant-external-connection-health", tenant.id],
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_external_connection_health")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("provider", "tekmetric")
        .maybeSingle();
      if (error) throw error;
      return data as TenantExternalConnectionHealth | null;
    },
  });

  const campaignsQ = useQuery({
    queryKey: ["admin-tekmetric-campaigns", tenant.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id,name,status,total_contacts,calls_made,calls_answered,appointments_booked,source_synced_at,created_at")
        .eq("tenant_id", tenant.id)
        .eq("source", "tekmetric")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        name: string;
        status: string;
        total_contacts: number;
        calls_made: number;
        calls_answered: number;
        appointments_booked: number;
        source_synced_at: string | null;
        created_at: string;
      }>;
    },
  });

  const contactsQ = useQuery({
    queryKey: ["admin-tekmetric-contacts", tenant.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_contacts")
        .select("id,first_name,last_name,phone,last_service_date,vehicle_info,call_status,due_reason,created_at")
        .eq("tenant_id", tenant.id)
        .eq("external_source", "tekmetric")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as Array<TekmetricPreviewContact & {
        id: string;
        call_status: string;
        created_at: string;
      }>;
    },
  });

  const runSyncCheck = async () => {
    const { data, error } = await supabase.functions.invoke("tekmetric-sync", {
      body: {
        action: "preview_due_customers",
        tenant_id: tenant.id,
        months_since_service: monthsSinceService,
        limit: 25,
      },
    });
    if (error) throw error;
    const contacts = (data?.contacts ?? []) as TekmetricPreviewContact[];
    setPreviewContacts(contacts);
    setPreviewMeta({ cutoffDate: data?.cutoff_date, count: data?.count });
    return contacts.length;
  };

  const syncMutation = useMutation({
    mutationFn: runSyncCheck,
    onSuccess: (count: number) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-external-connection-health", tenant.id] });
      queryClient.invalidateQueries({ queryKey: ["tenant-external-connection-health"] });
      toast.success(`Tekmetric sync check found ${count} due contact${count === 1 ? "" : "s"}.`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const connection = connectionQ.data;
  const connected = !!connection?.is_connected;
  const healthy = connection?.health_status === "healthy";
  const stale = connection?.health_status === "stale" || connection?.health_status === "connected_never_synced";
  const statusClass = healthy
    ? "border-success/30 bg-success/15 text-success"
    : connected && stale
      ? "border-warning/30 bg-warning/15 text-warning"
      : connected
        ? "border-destructive/30 bg-destructive/15 text-destructive"
        : "border-border bg-muted/50 text-muted-foreground";
  const statusLabel = !connected
    ? "Not connected"
    : healthy
      ? "Connected"
      : stale
        ? "Needs sync"
        : (connection?.status ?? "Issue").replace(/_/g, " ");

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">Super-admin view of what this client workspace can pull and see.</p>
      </header>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Tekmetric</h2>
              <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium capitalize ${statusClass}`}>
                {statusLabel}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              This shows whether the workspace has a Tekmetric source, when it last pulled, and how many contacts the client dashboard can use in campaigns.
            </p>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:items-end">
            <div className="min-w-0">
              <Label htmlFor="tekmetric-sync-months" className="text-xs text-muted-foreground">Months since service</Label>
              <Input
                id="tekmetric-sync-months"
                type="number"
                min={1}
                max={36}
                value={monthsSinceService}
                onChange={(event) => setMonthsSinceService(Math.max(1, Math.min(36, Number(event.target.value) || 3)))}
                className="mt-1 w-full sm:w-40"
              />
            </div>
            <Button
              className="self-end"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Checking…</>
              ) : (
                <><RefreshCw className="mr-2 h-4 w-4" /> Run sync check</>
              )}
            </Button>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <ConnectionStat label="Last pull" value={connection?.last_synced_at ? formatDistanceToNow(new Date(connection.last_synced_at), { addSuffix: true }) : "Never"} />
          <ConnectionStat label="Imported contacts" value={(connection?.contact_count ?? 0).toLocaleString()} />
          <ConnectionStat label="Pending campaign contacts" value={(connection?.pending_contact_count ?? 0).toLocaleString()} />
          <ConnectionStat label="Tekmetric campaigns" value={(connection?.campaign_count ?? 0).toLocaleString()} />
        </dl>

        <div className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Environment</p>
            <p className="mt-1 break-all font-mono text-xs">{connection?.environment_url || "Not set"}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Last campaign source</p>
            <p className="mt-1 text-sm font-medium">{connection?.last_campaign_name || "No Tekmetric campaign yet"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {connection?.last_campaign_at ? format(new Date(connection.last_campaign_at), "MMM d, yyyy h:mm a") : "Create a campaign after importing contacts to populate this."}
            </p>
          </div>
        </div>
      </section>

      {previewMeta && (
        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Latest sync check preview</h2>
            <p className="text-xs text-muted-foreground">
              {previewMeta.count ?? previewContacts.length} contacts due since {previewMeta.cutoffDate ?? "the selected cutoff"}.
            </p>
          </div>
          {previewContacts.length === 0 ? (
            <div className="p-5 text-sm text-muted-foreground">Tekmetric responded, but no due contacts matched this window.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Customer</th>
                    <th className="px-4 py-2 text-left font-medium">Phone</th>
                    <th className="px-4 py-2 text-left font-medium">Last service</th>
                    <th className="px-4 py-2 text-left font-medium">Vehicle</th>
                    <th className="px-4 py-2 text-left font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {previewContacts.slice(0, 10).map((contact, index) => (
                    <tr key={`${contact.phone ?? "contact"}-${index}`} className="border-b border-border/60">
                      <td className="px-4 py-3 font-medium">{[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "—"}</td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{contact.phone || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{contact.last_service_date || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{contact.vehicle_info || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{contact.due_reason || "Tekmetric customer"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">What the client dashboard can see</h2>
          <p className="text-xs text-muted-foreground">Recent Tekmetric-sourced campaigns and imported contacts for this workspace.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 xl:grid-cols-2">
          <div className="min-w-0">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campaigns</h3>
            {campaignsQ.isLoading ? (
              <div className="h-24 animate-pulse rounded bg-muted" />
            ) : (campaignsQ.data ?? []).length === 0 ? (
              <p className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">No Tekmetric campaigns created yet.</p>
            ) : (
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {(campaignsQ.data ?? []).map((campaign) => (
                  <div key={campaign.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 bg-background p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {campaign.total_contacts ?? 0} contacts · {campaign.calls_made ?? 0} calls made · {campaign.appointments_booked ?? 0} booked
                      </p>
                    </div>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs capitalize">{campaign.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Imported contacts</h3>
            {contactsQ.isLoading ? (
              <div className="h-24 animate-pulse rounded bg-muted" />
            ) : (contactsQ.data ?? []).length === 0 ? (
              <p className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">No Tekmetric contacts imported into campaigns yet.</p>
            ) : (
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {(contactsQ.data ?? []).map((contact) => (
                  <div key={contact.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 bg-background p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{[contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.phone || "Contact"}</p>
                      <p className="text-xs text-muted-foreground">
                        {contact.last_service_date || "No service date"} · {contact.due_reason || "Tekmetric customer"}
                      </p>
                    </div>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs capitalize">{contact.call_status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function ConnectionStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function ClientSettingsView({
  tenant,
  primaryUser,
  accountAuth,
  intakeContact,
  onContactUpdated,
}: {
  tenant: Tenant;
  primaryUser: Profile | null;
  accountAuth: AccountAuth | null;
  intakeContact: IntakeContact | null;
  onContactUpdated: () => void;
}) {
  const plan = tenant.plan ?? "phone_starter";

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-6 p-4 sm:p-6">
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

      <PrimaryAccountSection
        tenant={tenant}
        primaryUser={primaryUser}
        accountAuth={accountAuth}
        intakeContact={intakeContact}
        onContactUpdated={onContactUpdated}
      />
    </div>
  );
}

function PrimaryAccountSection({
  tenant,
  primaryUser,
  accountAuth,
  intakeContact,
  onContactUpdated,
}: {
  tenant: Tenant;
  primaryUser: Profile | null;
  accountAuth: AccountAuth | null;
  intakeContact: IntakeContact | null;
  onContactUpdated: () => void;
}) {
  const userId = primaryUser?.id ?? null;

  const authQ = useQuery({
    queryKey: ["client-auth-info", userId],
    enabled: !!userId,
    retry: false,
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session has expired. Sign in again.");
      return await getClientAuthInfo({ data: { userId: userId!, accessToken: token } });
    },
  });

  const authEmail = authQ.data?.email ?? accountAuth?.email ?? primaryUser?.email ?? intakeContact?.email ?? "";
  const authPhone = authQ.data?.phone ?? accountAuth?.phone ?? intakeContact?.phone ?? "";

  const [email, setEmail] = useState(authEmail);
  const [phone, setPhone] = useState(authPhone);
  const [resetLoading, setResetLoading] = useState(false);
  const [saveEmailLoading, setSaveEmailLoading] = useState(false);
  const [savePhoneLoading, setSavePhoneLoading] = useState(false);

  useEffect(() => {
    setEmail(authEmail);
    setPhone(authPhone);
  }, [authEmail, authPhone]);

  const emailDirty = email.trim().toLowerCase() !== authEmail.trim().toLowerCase();
  const phoneDirty = phone.trim() !== authPhone.trim();

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    let token = data.session?.access_token;
    if (!token) {
      const refreshed = await supabase.auth.refreshSession();
      token = refreshed.data.session?.access_token;
    }
    if (!token) throw new Error("Your session has expired. Sign in again.");
    return token;
  }

  const handleSendReset = async () => {
    const target = (authEmail || "").trim();
    if (!target) {
      toast.error("No email on file for this user.");
      return;
    }
    setResetLoading(true);
    try {
      const accessToken = await getToken();
      await sendClientPasswordReset({
        data: {
          email: target,
          accessToken,
          redirectTo: `${window.location.origin}/set-password`,
        },
      });
      toast.success(`Password reset email sent to ${target}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reset email.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleSaveEmail = async () => {
    const next = email.trim();
    if (!next || next === authEmail) return;
    setSaveEmailLoading(true);
    try {
      if (primaryUser) {
        const accessToken = await getToken();
        await updateClientEmail({
          data: { userId: primaryUser.id, newEmail: next, accessToken },
        });
        toast.success("Email updated and password reset sent.");
        await authQ.refetch();
      } else if (intakeContact) {
        const { error } = await supabase
          .from("intake_forms")
          .update({ answers: { ...intakeContact.answers, __contact_email: next } })
          .eq("id", intakeContact.id);
        if (error) throw error;
        const accessToken = await getToken();
        await createOrUpdateClientAccountForTenant({
          data: {
            tenantId: tenant.id,
            email: next,
            phone,
            name: intakeContact.businessName ?? tenant.name,
            accessToken,
          },
        });
        toast.success("Client account linked and password reset sent.");
        onContactUpdated();
      } else {
        const accessToken = await getToken();
        await createOrUpdateClientAccountForTenant({
          data: { tenantId: tenant.id, email: next, phone, name: tenant.name, accessToken },
        });
        toast.success("Client account created and password reset sent.");
        onContactUpdated();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update email.");
    } finally {
      setSaveEmailLoading(false);
    }
  };

  const handleSavePhone = async () => {
    const next = phone.trim();
    if (next === authPhone.trim()) return;
    setSavePhoneLoading(true);
    try {
      if (primaryUser) {
        const accessToken = await getToken();
        const result = await updateClientPhone({
          data: { userId: primaryUser.id, newPhone: next, accessToken },
        });
        toast.success(result.phone ? "Phone number updated." : "Phone number removed.");
        await authQ.refetch();
      } else if (intakeContact) {
        const { error } = await supabase
          .from("intake_forms")
          .update({
            contact_phone: next || null,
            answers: { ...intakeContact.answers, primary_phone: next },
          })
          .eq("id", intakeContact.id);
        if (error) throw error;
        toast.success(next ? "Phone number updated." : "Phone number removed.");
        onContactUpdated();
      } else if (authEmail) {
        const accessToken = await getToken();
        await createOrUpdateClientAccountForTenant({
          data: { tenantId: tenant.id, email: authEmail, phone: next, name: tenant.name, accessToken },
        });
        toast.success(next ? "Phone number updated." : "Phone number removed.");
        onContactUpdated();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update phone.");
    } finally {
      setSavePhoneLoading(false);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Primary account on file</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
          {primaryUser ? (primaryUser.role ?? "client").replace(/_/g, " ") : "intake contact"}
        </span>
      </div>

      <dl className="grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Name</dt>
          <dd className="mt-1">{primaryUser?.name || primaryUser?.full_name || intakeContact?.businessName || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Record ID</dt>
          <dd className="mt-1 font-mono text-xs truncate">{primaryUser?.id || intakeContact?.id || "—"}</dd>
        </div>
      </dl>

      <div className="mt-5 space-y-2">
        <Label htmlFor="client-email" className="text-xs text-muted-foreground">
          Email {authQ.isLoading && <span className="ml-1 opacity-60">(loading…)</span>}
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="client-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@example.com"
            className="flex-1"
          />
          <Button variant="outline" className="w-full sm:w-auto" onClick={handleSaveEmail} disabled={!emailDirty || saveEmailLoading}>
            {saveEmailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save email
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Saving the email creates or updates the client login and sends a password-reset link.
        </p>
      </div>

      <div className="mt-5 space-y-2">
        <Label htmlFor="client-phone" className="text-xs text-muted-foreground">
          Phone {authQ.isLoading && <span className="ml-1 opacity-60">(loading…)</span>}
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="client-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+15551234567"
            className="flex-1"
          />
          <Button variant="outline" className="w-full sm:w-auto" onClick={handleSavePhone} disabled={!phoneDirty || savePhoneLoading}>
            {savePhoneLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save phone
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          E.164 format recommended (e.g. +15551234567). Leave empty to remove.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 items-center gap-3 border-t border-border pt-4 sm:flex sm:flex-wrap">
        <Button className="w-full sm:w-auto" onClick={handleSendReset} disabled={resetLoading || !authEmail}>
          {resetLoading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
          ) : (
            <><Mail className="mr-2 h-4 w-4" /> Send password reset email</>
          )}
        </Button>
        <span className="text-xs text-muted-foreground">
          Sends a reset link to <span className="font-medium text-foreground">{authEmail || "—"}</span>.
        </span>
      </div>
    </section>
  );
}

function AdminUsageBar({ used, included }: { used: number; included: number }) {
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

function AdminMonthlyUsageRow({ row }: { row: MonthlyUsage }) {
  const [expanded, setExpanded] = useState(false);
  const isCurrentMonth = row.period_start.slice(0, 7) === new Date().toISOString().slice(0, 7);
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
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">Current</span>
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
              <span className={hasOverage ? "text-destructive font-medium" : ""}>{row.minutes_used}</span>
              <span className="text-muted-foreground">/ {row.minutes_included} min</span>
            </div>
            <AdminUsageBar used={row.minutes_used} included={row.minutes_included} />
          </div>
        </td>
        <td className="px-4 py-3 text-sm">
          {hasOverage ? (
            <div className="flex items-center gap-1.5 text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="font-medium">+{row.overage_minutes} min (${(row.overage_amount_cents / 100).toFixed(2)})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="text-xs">Within plan</span>
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-right text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4 inline" /> : <ChevronDown className="h-4 w-4 inline" />}
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

  const monthlyUsageQ = useQuery({
    queryKey: ["monthly_usage", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_usage")
        .select("*")
        .eq("tenant_id", tenantId)
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
    <div className="flex min-w-0 max-w-full flex-col gap-6 p-4 sm:p-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">Client plan, usage, and monthly records</p>
        </div>
        {clientNumber && (
          <div className="shrink-0 rounded-lg border border-border bg-card px-4 py-2 text-right">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Client #</div>
            <div className="font-mono text-sm font-semibold tabular-nums">{clientNumber}</div>
          </div>
        )}
      </header>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="grid grid-cols-1 items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
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
          <Button className="w-full sm:w-auto" onClick={handleManageBilling} disabled={portalLoading}>
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
                Plan limit exceeded — overages billed at $0.13/min.
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
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
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
            <div className="overflow-x-auto">
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
                  <AdminMonthlyUsageRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
            </div>
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
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
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
