import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/DashboardShell";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/settings")({
  component: ClientSettings,
});

function ClientSettings() {
  const { profile, signOut } = useAuth();
  return (
    <div>
      <PageHeader title="Settings" description="Your account and billing." />
      <div className="max-w-xl space-y-6 rounded-xl border border-border/60 bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Name</div>
            <div className="mt-1 text-sm">{profile?.full_name ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Email</div>
            <div className="mt-1 text-sm">{profile?.email ?? "—"}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() =>
              toast.info("Stripe billing portal not yet configured.")
            }
          >
            Manage billing
          </Button>
          <Button variant="outline" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
