import { Menu } from "lucide-react";
import { useSidebar, SidebarTrigger } from "@/components/ui/sidebar";
import { useBranding } from "@/lib/branding";
import { useMe } from "@/lib/me";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PLAN_LABEL } from "@/lib/plan-gating";

/**
 * Sticky top bar shown only on mobile (md:hidden).
 * Contains the hamburger trigger that opens the sidebar Sheet drawer,
 * the logo, and a compact user avatar.
 *
 * On desktop this renders nothing — the sidebar is always visible.
 */
export function MobileTopBar() {
  const { isMobile } = useSidebar();
  const branding = useBranding();
  const me = useMe();
  const isSuper = me.profile.role === "super_admin";
  const plan = me.tenant?.plan ?? "phone_starter";

  // Only render on mobile — avoids any layout impact on desktop
  if (!isMobile) return null;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      {/* Hamburger — calls toggleSidebar() which opens the Sheet drawer */}
      <SidebarTrigger className="h-9 w-9 shrink-0" />

      {/* Logo centred in the remaining space */}
      <div className="flex flex-1 items-center justify-center">
        <img
          src={branding.logoUrl}
          alt={branding.appName}
          className="h-5 w-auto"
        />
      </div>

      {/* User avatar on the right */}
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="bg-primary/15 text-primary text-xs">
          {(me.profile.name || me.email).slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    </header>
  );
}
