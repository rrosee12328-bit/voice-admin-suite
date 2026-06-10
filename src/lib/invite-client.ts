// Client helper that triggers the Resend-powered invite email via a server fn.
import type { Plan } from "@/integrations/supabase/app-types";
import { sendInviteEmail } from "@/lib/invite-email.functions";
import { supabase } from "@/integrations/supabase/client";

export type SendInviteArgs = {
  recipientEmail: string;
  businessName: string | null;
  plan: Plan;
  intakeUrl: string;
};

async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  let token = data.session?.access_token;
  if (!token) {
    const refreshed = await supabase.auth.refreshSession();
    token = refreshed.data.session?.access_token;
  }
  if (!token) {
    throw new Error("You are not signed in. Please sign in and try again.");
  }
  return token;
}

export async function sendClientInvite(args: SendInviteArgs) {
  // Admin bypass: the server validates the access token via the Supabase Auth
  // API (network call) and checks the admin role, independent of the worker's
  // JWT validation middleware. This avoids stale-session/JWKS rejections.
  const accessToken = await getAccessToken();
  await sendInviteEmail({
    data: {
      recipientEmail: args.recipientEmail,
      businessName: args.businessName,
      plan: args.plan,
      intakeUrl: args.intakeUrl,
      accessToken,
    },
  });
  return true;
}
