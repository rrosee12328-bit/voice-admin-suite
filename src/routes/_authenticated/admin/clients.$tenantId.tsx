import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase, type Call, type Tenant } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/DashboardShell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatDuration } from "@/lib/format";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/clients/$tenantId")({
  component: TenantCallsPage,
});

function TenantCallsPage() {
  const { tenantId } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "tenant-calls", tenantId],
    queryFn: async () => {
      const [tenantRes, callsRes] = await Promise.all([
        supabase
          .from("tenants")
          .select("id, name, plan, minutes_used_this_month, minutes_included, stripe_subscription_status, stripe_customer_id, created_at")
          .eq("id", tenantId)
          .maybeSingle(),
        supabase
          .from("calls")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("started_at", { ascending: false })
          .limit(200),
      ]);
      if (tenantRes.error) throw tenantRes.error;
      if (callsRes.error) throw callsRes.error;
      return {
        tenant: tenantRes.data as Tenant | null,
        calls: (callsRes.data ?? []) as Call[],
      };
    },
  });

  return (
    <div>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/admin/clients">
            <ArrowLeft className="h-4 w-4" />
            Back to clients
          </Link>
        </Button>
      </div>
      <PageHeader
        title={data?.tenant?.name ?? "Client"}
        description={
          data?.tenant
            ? `${data.tenant.plan ?? "—"} • ${Math.round(data.tenant.minutes_used_this_month ?? 0)} / ${data.tenant.minutes_included ?? 0} minutes`
            : "Loading client details"
        }
      />
      <div className="rounded-xl border border-border/60 bg-card">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <p className="p-6 text-sm text-destructive">
            Failed to load: {(error as Error).message}
          </p>
        )}
        {data && data.calls.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">No calls yet for this client.</p>
        )}
        {data && data.calls.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Caller</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Booked</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.calls.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.caller_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.caller_phone ?? "—"}</TableCell>
                  <TableCell>{c.call_reason ?? "—"}</TableCell>
                  <TableCell>{c.outcome ?? "—"}</TableCell>
                  <TableCell>
                    {c.appointment_booked ? (
                      <Badge>Yes</Badge>
                    ) : (
                      <Badge variant="outline">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDuration(c.duration_seconds)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(c.started_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
