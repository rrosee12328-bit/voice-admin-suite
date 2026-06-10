// Client helper that triggers the Resend-powered invite email via a server fn.
import type { Plan } from "@/integrations/supabase/app-types";
import { sendInviteEmail } from "@/lib/invite-email.functions";

export type SendInviteArgs = {
  recipientEmail: string;
  businessName: string | null;
  plan: Plan;
  intakeUrl: string;
};

export async function sendClientInvite(args: SendInviteArgs) {
  await sendInviteEmail({
    data: {
      recipientEmail: args.recipientEmail,
      businessName: args.businessName,
      plan: args.plan,
      intakeUrl: args.intakeUrl,
    },
  });
  return true;
}
