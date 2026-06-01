import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Users, DollarSign, Phone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client-untyped";
import type { Tenant, Plan } from "@/integrations/supabase/app-types";
import { PLAN_LABEL, PLAN_PRICE } from "@/lib/plan-gating";
import { PlanBadge, StatusDot } from "@/components/badges";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const queryClient = useQueryClient();

  const tenantsQ = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Tenant[];
    },
  });

  const callsAggQ = useQuery({
    queryKey: ["admin-calls-month"],
    queryFn: async () => {
      const since = new Date();
      since.setDate(1);
      since.setHours(0, 0, 0, 0);
      const { count, error } = await supabase
        .from("calls")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });

  const lastCallByTenant = useQuery({
    queryKey: ["admin-last-call-by-tenant"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("tenant_id, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const r of (data ?? []) as { tenant_id: string; created_at: string }[]) {
        if (!map[r.tenant_id]) map[r.tenant_id] = r.created_at;
      }
      return map;
    },
  });

  const tenants = tenantsQ.data ?? [];
  const activeClients = tenants.length;
  const mrr = tenants.reduce((sum, t) => sum + (PLAN_PRICE[t.plan] || 0), 0);

  const emptyForm = {
    name: "",
    slug: "",
    plan: "phone_starter" as Plan,
    agent_status: "paused" as "active" | "paused" | "pending" | "disabled",
    retell_phone_number: "",
    retell_agent_id: "",
  };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);

  const createMutation = useMutation({
    mutationFn: async (input: typeof form) => {
      const { error } = await supabase.from("tenants").insert({
        name: input.name,
        slug: input.slug,
        plan: input.plan,
        agent_status: input.agent_status,
        retell_phone_number: input.retell_phone_number || null,
        retell_agent_id: input.retell_agent_id || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      toast.success("Client created");
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Platform</h1>
          <p className="text-sm text-muted-foreground">Manage all client workspaces</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1 h-4 w-4" /> Add client</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create new client</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Practice name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Dental" />
              </div>
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                  placeholder="acme-dental"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Plan</Label>
                <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v as Plan })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["phone_starter", "phone_email", "ai_front_office", "custom"] as Plan[]).map((p) => (
                      <SelectItem key={p} value={p}>{PLAN_LABEL[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Agent status</Label>
                <Select value={form.agent_status} onValueChange={(v) => setForm({ ...form, agent_status: v as typeof form.agent_status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Retell phone number</Label>
                <Input
                  value={form.retell_phone_number}
                  onChange={(e) => setForm({ ...form, retell_phone_number: e.target.value })}
                  placeholder="+16153074302"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Retell agent ID</Label>
                <Input
                  value={form.retell_agent_id}
                  onChange={(e) => setForm({ ...form, retell_agent_id: e.target.value })}
                  placeholder="agent_..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                disabled={!form.name || !form.slug || createMutation.isPending}
                onClick={() => createMutation.mutate(form)}
              >
                {createMutation.isPending ? "Creating…" : "Create client"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatBar label="Active Clients" value={activeClients} icon={<Users className="h-4 w-4" />} />
        <StatBar
          label="Calls This Month"
          value={callsAggQ.data ?? "—"}
          icon={<Phone className="h-4 w-4" />}
        />
        <StatBar
          label="MRR"
          value={`$${mrr.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          icon={<DollarSign className="h-4 w-4" />}
        />
      </section>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {tenantsQ.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : tenants.length === 0 ? (
          <EmptyState
            title="No clients yet"
            description="Add your first client to get started."
            action={<Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Add client</Button>}
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Client #</th>
                <th className="px-4 py-2 text-left font-medium">Practice</th>
                <th className="px-4 py-2 text-left font-medium">Plan</th>
                <th className="px-4 py-2 text-left font-medium">Agent</th>
                <th className="px-4 py-2 text-left font-medium">Phone</th>
                <th className="px-4 py-2 text-left font-medium">Last call</th>
                <th className="px-4 py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => {
                const last = lastCallByTenant.data?.[t.id];
                return (
                  <tr key={t.id} className="border-b border-border/60 hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.client_number || "—"}</td>
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3"><PlanBadge plan={t.plan} /></td>
                    <td className="px-4 py-3"><StatusDot status={t.agent_status} /></td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{t.retell_phone_number || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {last ? formatDistanceToNow(new Date(last), { addSuffix: true }) : "No calls yet"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/admin/clients/$slug"
                        params={{ slug: t.slug }}
                        className="text-xs text-primary hover:underline"
                      >
                        Open workspace →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatBar({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
        {icon}
      </div>
    </div>
  );
}
