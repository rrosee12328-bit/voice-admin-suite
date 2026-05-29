import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tenant } from "@/integrations/supabase/app-types";
import { DashboardView } from "./dashboard.index";

export const Route = createFileRoute("/_authenticated/admin/clients/$slug")({
  component: AdminClientView,
});

function AdminClientView() {
  const { slug } = Route.useParams();
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
      <DashboardView
        tenantId={tenant.id}
        tenantName={tenant.name}
        agentStatus={tenant.agent_status}
      />
    </div>
  );
}
