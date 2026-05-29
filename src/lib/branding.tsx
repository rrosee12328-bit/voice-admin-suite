import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import vektissLogo from "@/assets/vektiss-logo.png";
import type { Tenant, Role } from "@/integrations/supabase/app-types";

export interface Branding {
  logoUrl: string;
  appName: string;
  primaryColor: string | null; // null = use default token
}

const DEFAULT_BRANDING: Branding = {
  logoUrl: vektissLogo,
  appName: "Vektiss Voice",
  primaryColor: null,
};

const BrandingContext = createContext<Branding>(DEFAULT_BRANDING);

export function BrandingProvider({
  tenant,
  role,
  children,
}: {
  tenant: Tenant | null;
  role: Role | null;
  children: ReactNode;
}) {
  const branding = useMemo<Branding>(() => {
    const isWhiteLabel =
      tenant &&
      tenant.plan === "custom" &&
      role === "client_admin";
    if (!isWhiteLabel) return DEFAULT_BRANDING;
    return {
      logoUrl: tenant.branding_logo_url || vektissLogo,
      appName: tenant.branding_name || "Vektiss Voice",
      primaryColor: tenant.branding_primary_color || null,
    };
  }, [tenant, role]);

  useEffect(() => {
    if (branding.primaryColor) {
      document.documentElement.style.setProperty("--primary", branding.primaryColor);
    } else {
      document.documentElement.style.removeProperty("--primary");
    }
  }, [branding.primaryColor]);

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}
