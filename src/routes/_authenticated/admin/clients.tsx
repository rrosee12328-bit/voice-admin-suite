import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase, type Tenant } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/DashboardShell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/clients")({
  component: AdminClients,
});

function statusVariant(s: string | null): "default" | "secondary" | "destructive" | "outline" {
  switch ((s ?? "").toLowerCase()) {
    case "active":
    case "trialing":
      return "default";
    case "past_due":
    case "unpaid":
      return "destructive";
    case "canceled":
      return "outline";
    default:
      return "secondary";
  }
}

function AdminClients() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select(
          "id, name, plan, minutes_used_this_month, minutes_included, stripe_subscription_status, stripe_customer_id, created_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Tenant[];
    },
  });

  return (
    <div>
      <PageHeader title="Clients" description="All tenants on the platform." />
      <div className="rounded-xl border border-border/60 bg-card">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <p className="p-6 text-sm text-destructive">
            Failed to load clients: {(error as Error).message}
          </p>
        )}
        {data && data.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">No clients yet.</p>
        )}
        {data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Minutes</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((t) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer"
                  onClick={() =>
                    navigate({
                      to: "/admin/clients/$tenantId",
                      params: { tenantId: t.id },
                    })
                  }
                >
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="capitalize">{t.plan ?? "—"}</TableCell>
                  <TableCell>
                    {Math.round(t.minutes_used_this_month ?? 0)} /{" "}
                    {t.minutes_included ?? 0}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(t.stripe_subscription_status)}>
                      {t.stripe_subscription_status ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(t.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
