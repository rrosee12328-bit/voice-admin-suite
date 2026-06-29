import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Mail,
  RefreshCw,
  Search,
  Phone,
  Send,
  Eye,
  MousePointerClick,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMe } from "@/lib/me";
import { SpotlightCard } from "@/components/spotlight-card";
import {
  listEmailMessages,
  formatEmailType,
  formatEmailStatus,
  type EmailMessageRow,
} from "@/lib/email-tracking";
import { supabase } from "@/integrations/supabase/client-untyped";

export const Route = createFileRoute("/_authenticated/dashboard/emails")({
  component: EmailsPage,
});

function EmailsPage() {
  const me = useMe();
  const isSuperAdmin = me.profile.role === "super_admin";
  const tenantId = me.tenant?.id ?? null;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessageRow | null>(null);

  const { data: emails = [], isLoading, refetch } = useQuery({
    queryKey: ["email-messages", isSuperAdmin ? "all" : tenantId],
    queryFn: () => listEmailMessages(isSuperAdmin ? null : tenantId),
    enabled: isSuperAdmin || !!tenantId,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!isSuperAdmin && !tenantId) return;

    const channel = supabase
      .channel(`email-messages:${isSuperAdmin ? "all" : tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "email_messages",
          ...(isSuperAdmin ? {} : { filter: `tenant_id=eq.${tenantId}` }),
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["email-messages"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isSuperAdmin, queryClient, tenantId]);

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants-list"],
    enabled: isSuperAdmin,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("tenants")
        .select("id, name")
        .order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const tenantName = (id: string | null) => {
    if (!id) return "—";
    return tenants.find((t) => t.id === id)?.name ?? id.slice(0, 8);
  };

  const stats = useMemo(() => {
    const total = emails.length;
    const opened = emails.filter(
      (e) => e.status === "opened" || e.status === "clicked"
    ).length;
    const failed = emails.filter(
      (e) => e.status === "failed" || e.status === "bounced"
    ).length;
    const openRate = total > 0 ? Math.round((opened / total) * 100) : 0;
    const last7 = emails.filter(
      (e) =>
        new Date(e.sent_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;
    const totalOpens = emails.reduce((s, e) => s + (e.open_count ?? 0), 0);
    return { total, opened, failed, openRate, last7, totalOpens };
  }, [emails]);

  const filtered = useMemo(() => {
    return emails.filter((e) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (e.to_name ?? "").toLowerCase().includes(q) ||
        e.to_email.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        (e.call_reason ?? "").toLowerCase().includes(q) ||
        (e.body_text ?? "").toLowerCase().includes(q);
      const matchType = typeFilter === "all" || e.email_type === typeFilter;
      const matchStatus = statusFilter === "all" || e.status === statusFilter;
      const matchTenant =
        !isSuperAdmin || tenantFilter === "all" || e.tenant_id === tenantFilter;
      return matchSearch && matchType && matchStatus && matchTenant;
    });
  }, [emails, search, typeFilter, statusFilter, tenantFilter, isSuperAdmin]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Email Log</h1>
          <p className="text-sm text-muted-foreground">
            {isSuperAdmin
              ? "Every email sent by your AI receptionists across all clients"
              : "Every email your AI receptionist has sent to callers"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SpotlightCard>
          <div className="flex flex-col p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Total Sent
              </span>
              <Send className="h-4 w-4 text-primary" />
            </div>
            <span className="text-3xl font-bold tabular-nums">{stats.total}</span>
            <span className="mt-1 text-xs text-muted-foreground">all time</span>
          </div>
        </SpotlightCard>
        <SpotlightCard>
          <div className="flex flex-col p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Open Rate
              </span>
              <Eye className="h-4 w-4 text-info" />
            </div>
            <span className="text-3xl font-bold tabular-nums">{stats.openRate}%</span>
            <span className="mt-1 text-xs text-muted-foreground">
              {stats.opened} opened
            </span>
          </div>
        </SpotlightCard>
        <SpotlightCard>
          <div className="flex flex-col p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                This Week
              </span>
              <Mail className="h-4 w-4 text-success" />
            </div>
            <span className="text-3xl font-bold tabular-nums">{stats.last7}</span>
            <span className="mt-1 text-xs text-muted-foreground">last 7 days</span>
          </div>
        </SpotlightCard>
        <SpotlightCard>
          <div className="flex flex-col p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Bounced / Failed
              </span>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <span className="text-3xl font-bold tabular-nums">{stats.failed}</span>
            <span className="mt-1 text-xs text-muted-foreground">undelivered</span>
          </div>
        </SpotlightCard>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, email, subject…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="follow_up">Follow-up</SelectItem>
            <SelectItem value="intake_form">Intake Form</SelectItem>
            <SelectItem value="appointment_reminder">Appt Reminder</SelectItem>
            <SelectItem value="booking_confirmation">Booking Confirm</SelectItem>
            <SelectItem value="intake_summary">Intake Summary</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="opened">Opened</SelectItem>
            <SelectItem value="clicked">Clicked</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        {isSuperAdmin && (
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {(search || typeFilter !== "all" || statusFilter !== "all" || tenantFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setTypeFilter("all");
              setStatusFilter("all");
              setTenantFilter("all");
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-base">
            {filtered.length} email{filtered.length !== 1 ? "s" : ""}
            {filtered.length !== emails.length && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (filtered from {emails.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <Mail className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium">No emails yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  When your AI receptionist sends an email — like an intake form
                  summary or appointment confirmation — it will appear here
                  automatically.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Recipient</TableHead>
                  {isSuperAdmin && <TableHead>Client</TableHead>}
                  <TableHead>Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Opens</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((email) => {
                  const { label, variant } = formatEmailStatus(email.status);
                  const isExpanded = expandedId === email.id;
                  return (
                    <>
                      <TableRow
                        key={email.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : email.id)
                        }
                      >
                        <TableCell>
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {email.to_name ?? "Unknown"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {email.to_email}
                          </div>
                        </TableCell>
                        {isSuperAdmin && (
                          <TableCell className="text-sm text-muted-foreground">
                            {tenantName(email.tenant_id)}
                          </TableCell>
                        )}
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {email.subject}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {formatEmailType(email.email_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={variant}>{label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="flex items-center justify-end gap-1 text-xs">
                            <Eye className="h-3 w-3 text-muted-foreground" />
                            {email.open_count}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(email.sent_at).toLocaleString()}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setSelectedEmail(email)}
                              >
                                <Mail className="mr-2 h-4 w-4" />
                                View email
                              </DropdownMenuItem>
                              {email.call_id && (
                                <DropdownMenuItem asChild>
                                  <Link
                                    to="/dashboard/calls/$id"
                                    params={{ id: email.call_id }}
                                  >
                                    <Phone className="mr-2 h-4 w-4" />
                                    View call
                                  </Link>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${email.id}-exp`} className="bg-muted/20">
                          <TableCell
                            colSpan={isSuperAdmin ? 9 : 8}
                            className="px-6 py-4"
                          >
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  Email Preview
                                </p>
                                <div className="rounded-lg border bg-card p-3 text-sm leading-relaxed">
                                  {email.body_text ?? email.body_html ?? "No preview available"}
                                </div>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex gap-2">
                                  <span className="w-24 shrink-0 text-xs text-muted-foreground">
                                    From
                                  </span>
                                  <span className="text-xs">{email.from_email}</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="w-24 shrink-0 text-xs text-muted-foreground">
                                    Call Reason
                                  </span>
                                  <span className="text-xs">{email.call_reason ?? "—"}</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="w-24 shrink-0 text-xs text-muted-foreground">
                                    Outcome
                                  </span>
                                  <span className="text-xs">{email.outcome ?? "—"}</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="w-24 shrink-0 text-xs text-muted-foreground">
                                    Opens / Clicks
                                  </span>
                                  <span className="flex items-center gap-2 text-xs">
                                    <Eye className="h-3 w-3" />
                                    {email.open_count}
                                    <MousePointerClick className="h-3 w-3" />
                                    {email.click_count}
                                  </span>
                                </div>
                                {email.opened_at && (
                                  <div className="flex gap-2">
                                    <span className="w-24 shrink-0 text-xs text-muted-foreground">
                                      First opened
                                    </span>
                                    <span className="text-xs">
                                      {new Date(email.opened_at).toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                {email.error_message && (
                                  <div className="flex gap-2">
                                    <span className="w-24 shrink-0 text-xs text-muted-foreground">
                                      Error
                                    </span>
                                    <span className="text-xs text-destructive">
                                      {email.error_message}
                                    </span>
                                  </div>
                                )}
                                {email.call_id && (
                                  <Button variant="outline" size="sm" asChild className="mt-2">
                                    <Link
                                      to="/dashboard/calls/$id"
                                      params={{ id: email.call_id }}
                                    >
                                      <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                      View originating call
                                    </Link>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog
        open={!!selectedEmail}
        onOpenChange={(o) => !o && setSelectedEmail(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Detail
            </DialogTitle>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">To</p>
                  <p className="font-medium">{selectedEmail.to_name ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{selectedEmail.to_email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">From</p>
                  <p className="text-xs">{selectedEmail.from_email}</p>
                </div>
                {isSuperAdmin && (
                  <div>
                    <p className="text-xs text-muted-foreground">Client</p>
                    <p className="font-medium">{tenantName(selectedEmail.tenant_id)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <Badge variant="outline" className="mt-0.5 text-xs">
                    {formatEmailType(selectedEmail.email_type)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge
                    variant={formatEmailStatus(selectedEmail.status).variant}
                    className="mt-0.5"
                  >
                    {formatEmailStatus(selectedEmail.status).label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Opens / Clicks</p>
                  <p className="flex items-center gap-2 text-sm">
                    <Eye className="h-3.5 w-3.5" />
                    {selectedEmail.open_count}
                    <MousePointerClick className="h-3.5 w-3.5" />
                    {selectedEmail.click_count}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sent</p>
                  <p>{new Date(selectedEmail.sent_at).toLocaleString()}</p>
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Subject
                </p>
                <p className="text-sm font-medium">{selectedEmail.subject}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Body
                </p>
                <div className="max-h-48 overflow-y-auto rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed">
                  {selectedEmail.body_text ?? selectedEmail.body_html ?? "No content"}
                </div>
              </div>
              {selectedEmail.call_id && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    to="/dashboard/calls/$id"
                    params={{ id: selectedEmail.call_id }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View originating call
                  </Link>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
