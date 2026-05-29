import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/DashboardShell";

export const Route = createFileRoute("/_authenticated/admin/billing")({
  component: AdminBilling,
});

function AdminBilling() {
  return (
    <div>
      <PageHeader title="Billing" description="Platform billing and revenue." />
      <div className="rounded-xl border border-border/60 bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Billing details and Stripe integration coming soon. MRR is shown on the dashboard.
        </p>
      </div>
    </div>
  );
}
