import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMe } from "@/lib/me";
import { PLAN_LABEL, PLAN_PRICE } from "@/lib/plan-gating";
import { PlanBadge, StatusDot } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { EmailConnections } from "@/components/email-connections";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const me = useMe();
  const plan = me.tenant?.plan ?? "phone_starter";
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  const handleManageBilling = async () => {
    const tenantId = me.tenant?.id;
    if (!tenantId) {
      toast.error("No tenant found for this account.");
      return;
    }
    setIsLoadingPortal(true);
    try {
      const res = await fetch(
        "https://hygmztvpmmyxuomjwrbt.supabase.co/functions/v1/customer-portal",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenant_id: tenantId }),
        },
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "Unknown error");
        throw new Error(text);
      }
      const data = await res.json();
      if (data?.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        throw new Error("No portal URL returned.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open billing portal.");
    } finally {
      setIsLoadingPortal(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Workspace details and plan</p>
      </header>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Workspace</h2>
        <dl className="grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Name</dt>
            <dd className="mt-1">{me.tenant?.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Phone</dt>
            <dd className="mt-1 tabular-nums">{me.tenant?.retell_phone_number || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Agent status</dt>
            <dd className="mt-1"><StatusDot status={me.tenant?.agent_status ?? null} /></dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Slug</dt>
            <dd className="mt-1 font-mono text-xs">{me.tenant?.slug || "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Current plan</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              You're on <span className="text-foreground font-medium">{PLAN_LABEL[plan]}</span>
              {PLAN_PRICE[plan] > 0 && ` · $${PLAN_PRICE[plan]}/mo`}
            </p>
          </div>
          <PlanBadge plan={plan} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          {(["phone_starter", "phone_email", "ai_front_office", "custom"] as const).map((p) => (
            <div
              key={p}
              className={`rounded-md border p-3 ${p === plan ? "border-primary bg-primary/5" : "border-border bg-card"}`}
            >
              <div className="text-xs font-medium">{PLAN_LABEL[p]}</div>
              <div className="mt-1 text-sm font-semibold tabular-nums">
                {PLAN_PRICE[p] > 0 ? `$${PLAN_PRICE[p]}` : "Custom"}
                {PLAN_PRICE[p] > 0 && <span className="text-xs font-normal text-muted-foreground">/mo</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManageBilling}
            disabled={isLoadingPortal}
          >
            {isLoadingPortal && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Manage Billing
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          To change plans, contact your account manager.
        </p>
      </section>

      {me.tenant?.id && <EmailConnections tenantId={me.tenant.id} />}

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Your account</h2>
        <dl className="grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Name</dt>
            <dd className="mt-1">{me.profile.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd className="mt-1">{me.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Role</dt>
            <dd className="mt-1 capitalize">{(me.profile.role ?? "client").replace(/_/g, " ")}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
