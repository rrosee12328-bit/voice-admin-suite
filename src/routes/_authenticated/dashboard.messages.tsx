import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  RefreshCw,
  Search,
  Phone,
  Send,
  CheckCircle,
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
  listSmsMessages,
  formatSmsType,
  formatSmsStatus,
  type SmsMessageRow,
} from "@/lib/sms-tracking";
import { supabase } from "@/integrations/supabase/client-untyped";

export const Route = createFileRoute("/_authenticated/dashboard/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  const me = useMe();
  const isSuperAdmin = me.profile.role === "super_admin";
  const tenantId = me.tenant?.id ?? null;
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<SmsMessageRow | null>(null);

  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ["sms-messages", isSuperAdmin ? "all" : tenantId],
    queryFn: () => listSmsMessages(isSuperAdmin ? null : tenantId),
    enabled: isSuperAdmin || !!tenantId,
  });

  // Super admin: fetch tenants for filter
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
    const total = messages.length;
    const delivered = messages.filter((m) => m.status === "delivered").length;
    const failed = messages.filter(
      (m) => m.status === "failed" || m.status === "undelivered"
    ).length;
    const intakeForms = messages.filter(
      (m) => m.message_type === "intake_form"
    ).length;
    const last7 = messages.filter(
      (m) =>
        new Date(m.sent_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;
    return { total, delivered, failed, intakeForms, last7 };
  }, [messages]);

  const filtered = useMemo(() => {
    return messages.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (m.caller_name ?? "").toLowerCase().includes(q) ||
        m.to_phone.includes(q) ||
        (m.call_reason ?? "").toLowerCase().includes(q) ||
        m.message_body.toLowerCase().includes(q);
      const matchType = typeFilter === "all" || m.message_type === typeFilter;
      const matchStatus = statusFilter === "all" || m.status === statusFilter;
      const matchTenant =
        !isSuperAdmin || tenantFilter === "all" || m.tenant_id === tenantFilter;
      return matchSearch && matchType && matchStatus && matchTenant;
    });
  }, [messages, search, typeFilter, statusFilter, tenantFilter, isSuperAdmin]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">SMS Log</h1>
          <p className="text-sm text-muted-foreground">
            {isSuperAdmin
              ? "Every text sent by your AI receptionists across all clients"
              : "Every text message your AI receptionist has sent to callers"}
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
                This Week
              </span>
              <MessageSquare className="h-4 w-4 text-info" />
            </div>
            <span className="text-3xl font-bold tabular-nums">{stats.last7}</span>
            <span className="mt-1 text-xs text-muted-foreground">last 7 days</span>
          </div>
        </SpotlightCard>
        <SpotlightCard>
          <div className="flex flex-col p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Intake Forms
              </span>
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
            <span className="text-3xl font-bold tabular-nums">{stats.intakeForms}</span>
            <span className="mt-1 text-xs text-muted-foreground">sent to callers</span>
          </div>
        </SpotlightCard>
        <SpotlightCard>
          <div className="flex flex-col p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Failed
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
            placeholder="Search name, phone, message…"
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
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="undelivered">Undelivered</SelectItem>
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
            {filtered.length} message{filtered.length !== 1 ? "s" : ""}
            {filtered.length !== messages.length && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (filtered from {messages.length})
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
              <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium">No SMS messages yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  When your AI receptionist sends a text to a caller — like an
                  intake form link or appointment confirmation — it will appear
                  here automatically.
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
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Call Reason</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((msg) => {
                  const { label, variant } = formatSmsStatus(msg.status);
                  const isExpanded = expandedId === msg.id;
                  return (
                    <>
                      <TableRow
                        key={msg.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : msg.id)
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
                            {msg.caller_name ?? "Unknown"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {msg.to_phone}
                          </div>
                        </TableCell>
                        {isSuperAdmin && (
                          <TableCell className="text-sm text-muted-foreground">
                            {tenantName(msg.tenant_id)}
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {formatSmsType(msg.message_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={variant}>{label}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate text-xs text-muted-foreground">
                          {msg.call_reason ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(msg.sent_at).toLocaleString()}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedMsg(msg)}>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                View message
                              </DropdownMenuItem>
                              {msg.call_id && (
                                <DropdownMenuItem asChild>
                                  <Link
                                    to="/dashboard/calls/$id"
                                    params={{ id: msg.call_id }}
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
                        <TableRow key={`${msg.id}-exp`} className="bg-muted/20">
                          <TableCell
                            colSpan={isSuperAdmin ? 8 : 7}
                            className="px-6 py-4"
                          >
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  Message Sent
                                </p>
                                <p className="rounded-lg border bg-card p-3 text-sm leading-relaxed">
                                  {msg.message_body}
                                </p>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex gap-2">
                                  <span className="w-24 shrink-0 text-xs text-muted-foreground">
                                    Outcome
                                  </span>
                                  <span className="text-xs">{msg.outcome ?? "—"}</span>
                                </div>
                                {msg.delivered_at && (
                                  <div className="flex gap-2">
                                    <span className="w-24 shrink-0 text-xs text-muted-foreground">
                                      Delivered
                                    </span>
                                    <span className="text-xs">
                                      {new Date(msg.delivered_at).toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                {msg.error_message && (
                                  <div className="flex gap-2">
                                    <span className="w-24 shrink-0 text-xs text-muted-foreground">
                                      Error
                                    </span>
                                    <span className="text-xs text-destructive">
                                      {msg.error_message}
                                    </span>
                                  </div>
                                )}
                                {msg.call_id && (
                                  <Button variant="outline" size="sm" asChild className="mt-2">
                                    <Link
                                      to="/dashboard/calls/$id"
                                      params={{ id: msg.call_id }}
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
      <Dialog open={!!selectedMsg} onOpenChange={(o) => !o && setSelectedMsg(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              SMS Detail
            </DialogTitle>
          </DialogHeader>
          {selectedMsg && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Recipient</p>
                  <p className="font-medium">{selectedMsg.caller_name ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{selectedMsg.to_phone}</p>
                </div>
                {isSuperAdmin && (
                  <div>
                    <p className="text-xs text-muted-foreground">Client</p>
                    <p className="font-medium">{tenantName(selectedMsg.tenant_id)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <Badge variant="outline" className="mt-0.5 text-xs">
                    {formatSmsType(selectedMsg.message_type)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge
                    variant={formatSmsStatus(selectedMsg.status).variant}
                    className="mt-0.5"
                  >
                    {formatSmsStatus(selectedMsg.status).label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Call Reason</p>
                  <p>{selectedMsg.call_reason ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Outcome</p>
                  <p>{selectedMsg.outcome ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sent</p>
                  <p>{new Date(selectedMsg.sent_at).toLocaleString()}</p>
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Message Body
                </p>
                <div className="rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed">
                  {selectedMsg.message_body}
                </div>
              </div>
              {selectedMsg.call_id && (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/dashboard/calls/$id" params={{ id: selectedMsg.call_id }}>
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
