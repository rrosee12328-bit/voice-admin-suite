// Client helper that triggers the Lovable Emails transactional send route.
// Falls back gracefully if the email infrastructure is not yet configured.
import { supabase } from "@/integrations/supabase/client-untyped";
import type { Plan } from "@/integrations/supabase/app-types";

export type SendInviteArgs = {
  recipientEmail: string;
  businessName: string | null;
  plan: Plan;
  intakeUrl: string;
};

export async function sendClientInvite(args: SendInviteArgs) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("Not signed in");

  const res = await fetch("/lovable/email/transactional/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      templateName: "client-invite",
      recipientEmail: args.recipientEmail,
      idempotencyKey: `client-invite-${args.intakeUrl.split("/").pop()}-${Date.now()}`,
      templateData: {
        businessName: args.businessName,
        plan: args.plan,
        intakeUrl: args.intakeUrl,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Email send failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return true;
}
