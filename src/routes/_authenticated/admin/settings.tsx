import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/DashboardShell";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const { profile, signOut } = useAuth();
  return (
    <div>
      <PageHeader title="Settings" description="Your account." />
      <div className="max-w-xl space-y-4 rounded-xl border border-border/60 bg-card p-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Name</div>
          <div className="mt-1 text-sm">{profile?.full_name ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Email</div>
          <div className="mt-1 text-sm">{profile?.email ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Role</div>
          <div className="mt-1 text-sm">{profile?.role}</div>
        </div>
        <Button variant="outline" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
