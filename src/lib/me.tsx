import { createContext, useContext, type ReactNode } from "react";
import type { Profile, Tenant } from "@/integrations/supabase/app-types";

export interface Me {
  userId: string;
  email: string;
  profile: Profile;
  tenant: Tenant | null;
}

const MeContext = createContext<Me | null>(null);

export function MeProvider({ me, children }: { me: Me; children: ReactNode }) {
  return <MeContext.Provider value={me}>{children}</MeContext.Provider>;
}

export function useMe(): Me {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error("useMe must be used inside MeProvider");
  return ctx;
}

export function useMaybeMe(): Me | null {
  return useContext(MeContext);
}
