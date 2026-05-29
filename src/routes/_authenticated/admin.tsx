import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell, type NavItem } from "@/components/DashboardShell";
import { LayoutDashboard, Users, CreditCard, Settings } from "lucide-react";

const items: NavItem[] = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Clients", url: "/admin/clients", icon: Users },
  { title: "Billing", url: "/admin/billing", icon: CreditCard },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile && profile.role !== "super_admin") {
      navigate({ to: "/app/dashboard", replace: true });
    }
  }, [profile, navigate]);

  if (!profile || profile.role !== "super_admin") return null;

  return (
    <DashboardShell items={items} scopeLabel="Super Admin">
      <Outlet />
    </DashboardShell>
  );
}
