import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const InputSchema = z.object({
  recipientEmail: z.string().email().max(320),
  businessName: z.string().max(255).nullable().optional(),
  plan: z.string().min(1).max(64),
  intakeUrl: z.string().url().max(2048),
});

const PLAN_LABELS: Record<string, string> = {
  phone_starter: "Phone Starter",
  phone_email: "Phone + Email",
  ai_front_office: "AI Front Office",
};

export const sendInviteEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const from = process.env.RESEND_FROM || "Vektiss Support <support@vektiss.com>";
    const planLabel = PLAN_LABELS[data.plan] || data.plan;
    const greetingName = data.businessName ? ` ${data.businessName}` : "";

    const subject = `Your Vektiss ${planLabel} setup link`;
    const html = `
<!doctype html>
<html><body style="font-family:Arial,sans-serif;background:#ffffff;color:#111;padding:24px;">
  <div style="max-width:560px;margin:0 auto;">
    <h2 style="margin:0 0 12px;">Welcome${greetingName}!</h2>
    <p>You've been invited to set up your <strong>${planLabel}</strong> plan with Vektiss.</p>
    <p>Click below to complete your intake, review your plan, accept the terms, and finish payment:</p>
    <p style="margin:24px 0;">
      <a href="${data.intakeUrl}"
         style="background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">
        Start setup
      </a>
    </p>
    <p style="font-size:12px;color:#666;word-break:break-all;">Or open this link: ${data.intakeUrl}</p>
  </div>
</body></html>`.trim();

    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from,
        to: [data.recipientEmail],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Resend send failed (${res.status}): ${body.slice(0, 300)}`);
    }
    return { ok: true as const };
  });
