// Supabase Edge Function: stripe-webhook
// Handles Stripe subscription lifecycle events and updates tenant records
// Deploy as: supabase functions deploy stripe-webhook

import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Map Stripe plan metadata to Supabase plan enum values
const PLAN_MAP: Record<string, string> = {
  phone_starter: "phone_starter",
  phone_email: "phone_email",
  ai_front_office: "ai_front_office",
  custom: "custom",
};

// Minutes included per plan
const PLAN_MINUTES: Record<string, number> = {
  phone_starter: 100,
  phone_email: 200,
  ai_front_office: 500,
  custom: 9999,
};

// Plan display names and prices
const PLAN_DISPLAY: Record<string, { name: string; price: string }> = {
  phone_starter: { name: "Phone Starter", price: "$45.99/month" },
  phone_email: { name: "Phone + Email", price: "$89.99/month" },
  ai_front_office: { name: "AI Front Office", price: "$199/month" },
  custom: { name: "Custom", price: "Custom pricing" },
};

// Helper: call the send-email edge function
async function sendEmail(payload: Record<string, unknown>) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[stripe-webhook] send-email failed:", text);
    } else {
      console.log("[stripe-webhook] Email sent:", payload.type);
    }
  } catch (err) {
    console.error("[stripe-webhook] send-email error:", err);
  }
}

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!,
    webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;
        // This Stripe account also sells other Vektiss products. Only the Voice
        // intake checkout sets both a recognized plan and an intake token.
        const plan = session.metadata?.plan;
        if (!plan || !PLAN_MAP[plan] || !session.metadata?.intake_token) {
          console.log(`[stripe-webhook] Ignoring non-Voice checkout ${session.id}`);
          break;
        }
        const practiceName = session.metadata?.business_name || session.metadata?.practice_name || "New Practice";
        const customerEmail = session.customer_email || "";
        const clientName = session.metadata?.client_name && session.metadata.client_name.trim() ? session.metadata.client_name.trim() : practiceName;
        const clientPhone = session.metadata?.client_phone || "";
        const stripeCustomerId = session.customer as string;
        const stripeSubscriptionId = session.subscription as string;

        // Get billing date from subscription
        let billingDate = "";
        try {
          const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          billingDate = new Date(subscription.current_period_end * 1000)
            .toISOString().slice(0, 10);
        } catch (_) {
          billingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString().slice(0, 10);
        }

        // Create the tenant record
        const slug = practiceName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
        const { data: tenant, error: tenantError } = await supabase
          .from("tenants")
          .insert({
            name: practiceName,
            slug: `${slug}-${Date.now()}`,
            plan: PLAN_MAP[plan] || "phone_starter",
            agent_status: "paused", // Paused until Retell agent is configured
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            stripe_subscription_status: "active",
            minutes_included: PLAN_MINUTES[plan] || 100,
            minutes_used_this_month: 0,
          })
          .select()
          .single();

        if (tenantError) {
          console.error("[stripe-webhook] Failed to create tenant:", tenantError);
          break;
        }

        console.log(`[stripe-webhook] Tenant created: ${tenant.id} for ${practiceName}`);

        const planDisplay = PLAN_DISPLAY[plan] || { name: plan, price: "" };

        // Send ToS confirmation + welcome email to client
        if (customerEmail) {
          await sendEmail({
            type: "welcome_tos_confirmation",
            to: customerEmail,
            clientName: clientName,
            businessName: practiceName,
            plan: planDisplay.name,
            planPrice: planDisplay.price,
            setupFee: "500",
          });

          // Send setup started email
          await sendEmail({
            type: "setup_started",
            to: customerEmail,
            clientName: clientName,
            businessName: practiceName,
            plan: planDisplay.name,
            setupTimeline: "3-5 business days",
          });
        }

        // Send internal new client alert to Vektiss
        await sendEmail({
          type: "new_client_alert",
          to: "info@vektiss.com",
          clientName: clientName,
          businessName: practiceName,
          plan: planDisplay.name,
          planPrice: planDisplay.price,
          clientEmail: customerEmail,
          clientPhone: clientPhone,
        });

        // Send Supabase Auth invite and deliver via Resend (bypasses Supabase SMTP relay)
        if (customerEmail) {
          try {
            // Generate the invite link via Supabase Admin API
            const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
              type: "invite",
              email: customerEmail,
              options: {
                data: {
                  tenant_id: tenant.id,
                  role: "client_admin",
                  business_name: practiceName,
                  plan,
                },
                redirectTo: "https://voice.vektiss.com/set-password",
              },
            });
            if (linkError) {
              console.error("[stripe-webhook] Failed to generate invite link:", linkError);
            } else {
              const inviteUrl = linkData?.properties?.action_link ?? "https://voice.vektiss.com/set-password";
              console.log(`[stripe-webhook] Invite link generated for ${customerEmail}`);
              // Send the invite via Resend through our branded send-email function
              await sendEmail({
                type: "set_password_invite",
                to: customerEmail,
                clientName: clientName,
                businessName: practiceName,
                plan: planDisplay.name,
                inviteUrl,
              });
              console.log(`[stripe-webhook] Invite email sent to ${customerEmail} via Resend`);
            }
          } catch (inviteErr) {
            console.error("[stripe-webhook] Invite flow error:", inviteErr);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const plan = subscription.metadata?.plan;
        if (!plan || !PLAN_MAP[plan]) break;
        const { error } = await supabase
          .from("tenants")
          .update({
            plan: PLAN_MAP[plan],
            stripe_subscription_status: subscription.status,
            minutes_included: PLAN_MINUTES[plan] || 100,
          })
          .eq("stripe_subscription_id", subscription.id);
        if (error) console.error("[stripe-webhook] Failed to update tenant plan:", error);
        else console.log(`[stripe-webhook] Tenant plan updated to ${plan} for subscription ${subscription.id}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const { error } = await supabase
          .from("tenants")
          .update({
            stripe_subscription_status: "canceled",
            agent_status: "paused",
          })
          .eq("stripe_subscription_id", subscription.id);
        if (error) console.error("[stripe-webhook] Failed to pause tenant:", error);
        else console.log(`[stripe-webhook] Tenant paused for subscription ${subscription.id}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        if (!stripeSubscriptionId) break;
        // Flag the tenant — don't immediately pause, give grace period
        const { error } = await supabase
          .from("tenants")
          .update({ stripe_subscription_status: "past_due" })
          .eq("stripe_subscription_id", stripeSubscriptionId);
        if (error) console.error("[stripe-webhook] Failed to flag past_due:", error);
        else console.log(`[stripe-webhook] Tenant marked past_due for subscription ${stripeSubscriptionId}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        if (!stripeSubscriptionId) break;

        // Skip monthly invoice email on initial subscription creation
        const billingReason = (invoice as any).billing_reason;
        if (billingReason === "subscription_create") {
          console.log("[stripe-webhook] Skipping monthly_invoice email for subscription_create");
          // Still reset minutes and update status
          await supabase.from("tenants").update({ stripe_subscription_status: "active", minutes_used_this_month: 0 }).eq("stripe_subscription_id", stripeSubscriptionId);
          break;
        }

        // Get tenant info for the monthly invoice email
        const { data: tenant } = await supabase
          .from("tenants")
          .select("name, plan, minutes_included, minutes_used_this_month, stripe_subscription_id")
          .eq("stripe_subscription_id", stripeSubscriptionId)
          .single();

        // Clear past_due flag and reset monthly minutes
        const { error } = await supabase
          .from("tenants")
          .update({
            stripe_subscription_status: "active",
            minutes_used_this_month: 0,
          })
          .eq("stripe_subscription_id", stripeSubscriptionId);

        if (error) console.error("[stripe-webhook] Failed to reset tenant:", error);
        else {
          console.log(`[stripe-webhook] Tenant reactivated and minutes reset for subscription ${stripeSubscriptionId}`);

          // Send monthly invoice email if we have tenant info
          if (tenant && invoice.customer_email) {
            const planDisplay = PLAN_DISPLAY[tenant.plan] || { name: tenant.plan, price: "" };
            const minutesUsed = tenant.minutes_used_this_month || 0;
            const minutesIncluded = tenant.minutes_included || 100;
            const overageMinutes = Math.max(0, minutesUsed - minutesIncluded);
            const overageCharge = overageMinutes > 0 ? `$${(overageMinutes * 0.05).toFixed(2)}` : "$0.00";
            const totalCharged = `$${((invoice.amount_paid || 0) / 100).toFixed(2)}`;

            // Get next billing date
            let nextBillingDate = "";
            try {
              const subscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);
              nextBillingDate = new Date(subscription.current_period_end * 1000)
                .toISOString().slice(0, 10);
            } catch (_) {
              nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                .toISOString().slice(0, 10);
            }

            const billingPeriod = new Date(invoice.period_start * 1000)
              .toLocaleDateString("en-US", { month: "long", year: "numeric" });

            await sendEmail({
              type: "monthly_invoice",
              to: invoice.customer_email,
              clientName: tenant.name,
              planName: planDisplay.name,
              billingPeriod: billingPeriod,
              minutesUsed: minutesUsed.toString(),
              minutesIncluded: minutesIncluded.toString(),
              overageMinutes: overageMinutes.toString(),
              overageCharge: overageCharge,
              totalCharged: totalCharged,
              nextBillingDate: nextBillingDate,
            });
          }
        }
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event: ${event.type}`);
    }
  } catch (err) {
    console.error("[stripe-webhook] Handler error:", err);
    return new Response(JSON.stringify({ error: "Handler failed" }), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
