import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client-untyped";
import type { Profile, Tenant } from "@/integrations/supabase/app-types";
import { MeProvider, type Me } from "@/lib/me";
import { BrandingProvider } from "@/lib/branding";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileTopBar } from "@/components/mobile-top-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        let session = sessionData.session;
        if (!session) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          session = refreshed.session;
        }

        if (!session?.user) {
          if (!cancelled) {
            setChecked(true);
            navigate({ to: "/login" });
          }
          return;
        }

        const { data: userData } = await supabase.auth.getUser(session.access_token);
        const user = userData.user ?? session.user;
        const { data: profile, error: profErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle<Profile>();
        if (profErr) {
          if (!cancelled) {
            setErr(profErr.message);
            setChecked(true);
          }
          return;
        }
        if (!profile) {
          if (!cancelled) {
            setErr("No profile found for this account. Contact your administrator.");
            setChecked(true);
          }
          return;
        }
        let tenant: Tenant | null = null;
        if (profile.tenant_id) {
          const { data: t } = await supabase
            .from("tenants")
            .select("*")
            .eq("id", profile.tenant_id)
            .maybeSingle<Tenant>();
          tenant = t ?? null;
        }
        if (!cancelled) {
          setMe({ userId: user.id, email: user.email ?? "", profile, tenant });
          setChecked(true);
        }
      } catch (error) {
        if (!cancelled) {
          setErr(error instanceof Error ? error.message : "Unable to load your workspace.");
          setChecked(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (err) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold">Unable to load your workspace</h1>
          <p className="mt-2 text-sm text-muted-foreground">{err}</p>
          <button
            className="mt-4 rounded-md border border-border bg-card px-4 py-2 text-sm"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/login" });
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (!checked || !me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-2 w-32 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  return (
    <MeProvider me={me}>
      <BrandingProvider tenant={me.tenant} role={me.profile.role as "admin" | "client" | "client_admin" | null}>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <MobileTopBar />
            <Outlet />
          </SidebarInset>
        </SidebarProvider>
      </BrandingProvider>
    </MeProvider>
  );
}
