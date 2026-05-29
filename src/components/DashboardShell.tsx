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
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LogOut, type LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "./ui/button";

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

export function DashboardShell({
  items,
  scopeLabel,
}: {
  items: NavItem[];
  scopeLabel: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="h-7 w-7 shrink-0 rounded-md bg-primary" aria-hidden />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold">Vektiss</span>
                <span className="truncate text-xs text-muted-foreground">{scopeLabel}</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const active =
                      pathname === item.url || pathname.startsWith(item.url + "/");
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                          <Link to={item.url} className="flex items-center gap-2">
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {(profile?.full_name || profile?.email || "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-medium">
                  {profile?.full_name || profile?.email}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {profile?.role}
                </span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => signOut()}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center gap-2 border-b border-border/60 bg-background/50 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="text-sm text-muted-foreground">{scopeLabel}</div>
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
