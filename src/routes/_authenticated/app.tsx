import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell, type NavItem } from "@/components/DashboardShell";
import { LayoutDashboard, Phone, Gauge, Settings } from "lucide-react";

const items: NavItem[] = [
  { title: "Dashboard", url: "/app/dashboard", icon: LayoutDashboard },
  { title: "Calls", url: "/app/calls", icon: Phone },
  { title: "Usage", url: "/app/usage", icon: Gauge },
  { title: "Settings", url: "/app/settings", icon: Settings },
];

export const Route = createFileRoute("/_authenticated/app")({
  component: ClientLayout,
});

function ClientLayout() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile && profile.role === "super_admin") {
      navigate({ to: "/admin/dashboard", replace: true });
    }
  }, [profile, navigate]);

  if (!profile || profile.role === "super_admin") return null;

  return (
    <DashboardShell items={items} scopeLabel="Client">
      <Outlet />
    </DashboardShell>
  );
}
