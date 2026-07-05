// Robust auth middleware for server functions: validates the bearer token via
// getClaims, and falls back to a direct getUser() check (network validation)
// if local claim verification fails. Logs diagnostic info (never the token).
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import {
  resolveVektissPublishableKey,
  resolveVektissSupabaseUrl,
} from "@/integrations/supabase/project";
import type { Database } from "@/integrations/supabase/types";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export const requireAuthRobust = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const SUPABASE_URL = resolveVektissSupabaseUrl(process.env.SUPABASE_URL);
    const SUPABASE_PUBLISHABLE_KEY = resolveVektissPublishableKey(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_PUBLISHABLE_KEY,
    );
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Backend configuration missing");
    }

    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Unauthorized: No authorization header provided");
    }
    const token = authHeader.slice("Bearer ".length);
    if (!token) throw new Error("Unauthorized: No token provided");

    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    let userId: string | null = null;
    let claims: Record<string, unknown> | null = null;

    const { data, error } = await supabase.auth.getClaims(token);
    if (!error && data?.claims?.sub) {
      userId = data.claims.sub;
      claims = data.claims as unknown as Record<string, unknown>;
    } else {
      // Diagnostic logging (no token contents beyond standard claims)
      const payload = decodeJwtPayload(token);
      console.error("[auth] getClaims failed", {
        error: error?.message ?? "no claims",
        iss: payload?.iss,
        exp: payload?.exp,
        now: Math.floor(Date.now() / 1000),
        aud: payload?.aud,
        role: payload?.role,
        expectedUrl: SUPABASE_URL,
      });
      // Fallback: validate via the auth server directly.
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (userError || !userData?.user) {
        console.error("[auth] getUser fallback failed", {
          error: userError?.message ?? "no user",
          status: (userError as { status?: number } | null)?.status,
        });
        throw new Error("Unauthorized: Invalid token");
      }
      userId = userData.user.id;
      claims = payload ?? {};
    }

    return next({ context: { supabase, userId, claims } });
  },
);
