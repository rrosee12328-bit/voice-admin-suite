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

function isUnauthorized(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.toLowerCase().includes("unauthorized");
}

export async function sendClientInvite(args: SendInviteArgs) {
  const payload = {
    data: {
      recipientEmail: args.recipientEmail,
      businessName: args.businessName,
      plan: args.plan,
      intakeUrl: args.intakeUrl,
    },
  };

  try {
    await sendInviteEmail(payload);
  } catch (error) {
    if (!isUnauthorized(error)) throw error;
    // Stale/invalid access token — force a session refresh and retry once.
    const { data, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !data.session) {
      throw new Error(
        "Your session has expired. Please sign out and sign back in, then try again.",
      );
    }
    try {
      await sendInviteEmail(payload);
    } catch (retryError) {
      if (isUnauthorized(retryError)) {
        throw new Error(
          "Your session has expired. Please sign out and sign back in, then try again.",
        );
      }
      throw retryError;
    }
  }
  return true;
}
