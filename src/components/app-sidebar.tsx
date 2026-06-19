import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Phone,
  BarChart3,
  Settings,
  Users,
  Activity,
  LogOut,
  Lock,
  Receipt,
  ClipboardList,
  FileSignature,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useMe } from "@/lib/me";
import { useBranding } from "@/lib/branding";
import { canUse, PLAN_LABEL } from "@/lib/plan-gating";
import { supabase } from "@/integrations/supabase/client-untyped";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function AppSidebar() {
  const me = useMe();
  const branding = useBranding();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isSuper = me.profile.role === "super_admin";
  const plan = me.tenant?.plan ?? "phone_starter";
  const analyticsUnlocked = canUse(plan, "analytics");

  const isActive = (to: string) => path === to || path.startsWith(to + "/");

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center justify-center">
          <img src={branding.logoUrl} alt={branding.appName} className="h-5 w-auto" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={path === "/dashboard"}>
                  <Link to="/dashboard">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/dashboard/calls")}>
                  <Link to="/dashboard/calls">
                    <Phone />
                    <span>Call Log</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/dashboard/analytics")}
                  className={!analyticsUnlocked ? "opacity-50" : ""}
                >
                  <Link to="/dashboard/analytics">
                    <BarChart3 />
                    <span>Analytics</span>
                    {!analyticsUnlocked && <Lock className="ml-auto h-3 w-3" />}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/dashboard/billing")}>
                  <Link to="/dashboard/billing">
                    <Receipt />
                    <span>Billing</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/dashboard/settings")}>
                  <Link to="/dashboard/settings">
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuper && (
          <SidebarGroup>
            <div className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Platform
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={path === "/admin"}>
                    <Link to="/admin">
                      <Users />
                      <span>All Clients</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin/analytics")}>
                    <Link to="/admin/analytics">
                      <Activity />
                      <span>Platform Analytics</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin/intake")}>
                    <Link to="/admin/intake">
                      <ClipboardList />
                      <span>Intake Forms</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin/proposals")}>
                    <Link to="/admin/proposals">
                      <FileSignature />
                      <span>Proposals</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/15 text-primary text-xs">
              {(me.profile.name || me.email).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">
              {me.profile.name || me.email}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {isSuper ? "Super Admin" : PLAN_LABEL[plan]}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
