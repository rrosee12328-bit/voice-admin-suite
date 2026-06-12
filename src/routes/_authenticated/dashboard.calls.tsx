import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Play, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useMe } from "@/lib/me";
import { supabase } from "@/integrations/supabase/client-untyped";
import type { Call, Tenant } from "@/integrations/supabase/app-types";
import { canUse } from "@/lib/plan-gating";
import {
  OutcomeBadge,
  ReasonBadge,
  LeadScoreBadge,
} from "@/components/badges";
import { LockedFeature } from "@/components/locked-feature";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/calls")({
  validateSearch: (search) => ({
    tenantId: typeof search.tenantId === "string" ? search.tenantId : undefined,
  }),
  component: CallsRoute,
});

const STATUSES = ["new", "in_progress", "resolved", "needs_follow_up", "archived"];

function FlagBadges({ call }: { call: Call }) {
  const items: { label: string; cls: string; show: boolean }[] = [
    { label: "Appt Booked", show: !!call.appointment_booked, cls: "bg-success/15 text-success border border-success/30" },
    { label: "New Patient", show: !!call.is_new_patient, cls: "bg-info/15 text-info border border-info/30" },
    { label: "Transferred", show: !!call.transferred, cls: "bg-warning/15 text-warning border border-warning/30" },
    { label: "SMS Sent", show: !!call.sms_sent, cls: "bg-slate-badge text-slate-badge-foreground" },
  ].filter((i) => i.show);
  if (items.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((i) => (
        <span key={i.label} className={cn("inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap", i.cls)}>
          {i.label}
        </span>
      ))}
    </div>
  );
}

function CallsRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname !== "/dashboard/calls") {
    return <Outlet />;
  }

  return <CallsPage />;
}

function CallsPage() {

  const me = useMe();
  const isSuperAdmin = me.profile.role === "super_admin";
  const { tenantId: tenantFromUrl } = Route.useSearch();
  const tenantId = me.tenant?.id ?? null;
  const plan = me.tenant?.plan ?? "ai_front_office";
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState<string>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tenantFilter, setTenantFilter] = useState<string>(tenantFromUrl ?? "all");

  const tenantsQ = useQuery({
    queryKey: ["all-tenants-for-calls"],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Tenant[];
    },
  });

  const tenantById = useMemo(() => {
    const m: Record<string, Tenant> = {};
    for (const t of tenantsQ.data ?? []) m[t.id] = t;
    return m;
  }, [tenantsQ.data]);

  const { data, isLoading } = useQuery({
    queryKey: ["calls-log", isSuperAdmin ? "all" : tenantId],
    enabled: isSuperAdmin || !!tenantId,
    queryFn: async () => {
      let q = supabase
        .from("calls")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (!isSuperAdmin && tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q.returns<Call[]>();
      if (error) throw error;
      return data ?? [];
    },
  });

  const calls = data ?? [];

  const reasons = useMemo(
    () => Array.from(new Set(calls.map((c) => c.call_reason).filter(Boolean) as string[])),
    [calls],
  );
  const outcomes = useMemo(
    () => Array.from(new Set(calls.map((c) => c.outcome).filter(Boolean) as string[])),
    [calls],
  );

  const filtered = calls.filter((c) => {
    if (search && !(c.caller_phone || "").includes(search) && !(c.caller_name || "").toLowerCase().includes(search.toLowerCase()) && !(c.caller_email || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (reasonFilter !== "all" && c.call_reason !== reasonFilter) return false;
    if (outcomeFilter !== "all" && c.outcome !== outcomeFilter) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (isSuperAdmin && tenantFilter !== "all" && c.tenant_id !== tenantFilter) return false;
    return true;
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Call> }) => {
      const { error } = await supabase.from("calls").update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calls-log"] });
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-4 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Call Log</h1>
        <p className="text-sm text-muted-foreground">
          {isSuperAdmin ? "All calls across every client workspace" : "All calls handled by your AI receptionist"}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by phone or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {isSuperAdmin && (
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All tenants" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tenants</SelectItem>
              {(tenantsQ.data ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={reasonFilter} onValueChange={setReasonFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All reasons" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All reasons</SelectItem>
            {reasons.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All outcomes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All outcomes</SelectItem>
            {outcomes.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No calls yet" description="When your AI receptionist takes calls, they'll appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  {isSuperAdmin && <th className="px-3 py-2 text-left font-medium">Tenant</th>}
                  <th className="px-3 py-2 text-left font-medium">Caller</th>
                  <th className="px-3 py-2 text-left font-medium">Phone</th>
                  <th className="px-3 py-2 text-left font-medium">Email</th>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Duration</th>
                  <th className="px-3 py-2 text-left font-medium">Reason</th>
                  <th className="px-3 py-2 text-left font-medium">Outcome</th>
                  <th className="px-3 py-2 text-left font-medium">Tags</th>
                  <th className="px-3 py-2 text-left font-medium">Transcript</th>
                  {canUse(plan, "lead_score") && <th className="px-3 py-2 text-left font-medium">Lead</th>}
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Notes</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const preview = c.transcript
                    ? c.transcript.slice(0, 100) + (c.transcript.length > 100 ? "…" : "")
                    : "";
                  return (
                    <tr key={c.id} className="border-b border-border/60 hover:bg-muted/20">
                      {isSuperAdmin && (
                        <td className="px-3 py-2 text-xs font-medium text-muted-foreground">
                          {tenantById[c.tenant_id]?.name ?? "—"}
                        </td>
                      )}
                      <td className="px-3 py-2 font-medium">{c.caller_name || "Unknown"}</td>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">{c.caller_phone || "—"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{c.caller_email || "—"}</td>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">
                        {format(new Date(c.created_at), "MMM d, HH:mm")}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">
                        {c.duration_seconds != null ? `${Math.floor(c.duration_seconds / 60)}:${String(c.duration_seconds % 60).padStart(2, "0")}` : "—"}
                      </td>
                      <td className="px-3 py-2"><ReasonBadge reason={c.call_reason} /></td>
                      <td className="px-3 py-2"><OutcomeBadge outcome={c.outcome} /></td>
                      <td className="px-3 py-2"><FlagBadges call={c} /></td>
                      <td className="px-3 py-2 max-w-[260px]">
                        {preview ? (
                          <Link
                            to="/dashboard/calls/$id"
                            params={{ id: c.id }}
                            className="block truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
                            title={c.transcript ?? ""}
                          >
                            {preview}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      {canUse(plan, "lead_score") && (
                        <td className="px-3 py-2"><LeadScoreBadge score={c.lead_score} /></td>
                      )}
                      <td className="px-3 py-2">
                        <StatusCell
                          value={c.status || "new"}
                          onChange={(v) => updateMutation.mutate({ id: c.id, patch: { status: v } })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <NotesCell
                          initial={c.notes || ""}
                          onSave={(v) => updateMutation.mutate({ id: c.id, patch: { notes: v } })}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center gap-1">
                          {c.recording_url && (
                            <Link
                              to="/dashboard/calls/$id"
                              params={{ id: c.id }}
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              aria-label="Play recording"
                              title="Open player"
                            >
                              <Play className="h-4 w-4" />
                            </Link>
                          )}
                          <Link
                            to="/dashboard/calls/$id"
                            params={{ id: c.id }}
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="View"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isSuperAdmin && !canUse(plan, "transcripts") && (
        <p className="text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <LockedFeature feature="transcripts" compact />
            <span>Transcripts and analytics unlock at higher plans.</span>
          </span>
        </p>
      )}
    </div>
  );
}

function StatusCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function NotesCell({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const [val, setVal] = useState(initial);
  return (
    <input
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => { if (val !== initial) onSave(val); }}
      placeholder="Add note…"
      className="w-40 rounded border border-transparent bg-transparent px-2 py-1 text-xs focus:border-border focus:bg-muted/30 focus:outline-none"
    />
  );
}
