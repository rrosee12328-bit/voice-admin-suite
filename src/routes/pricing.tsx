import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Vektiss" },
      { name: "description", content: "Simple, transparent pricing for Vektiss AI phone receptionist plans." },
      { property: "og:title", content: "Pricing — Vektiss" },
      { property: "og:description", content: "Simple, transparent pricing for Vektiss AI phone receptionist plans." },
    ],
  }),
  component: PricingPage,
});

type PlanId = "phone_starter" | "phone_email" | "ai_front_office";

const PLANS: {
  id: PlanId;
  name: string;
  price: string;
  minutes: string;
  features: string[];
  popular?: boolean;
}[] = [
  {
    id: "phone_starter",
    name: "Phone Starter",
    price: "$45.99",
    minutes: "100 min/mo included",
    features: ["AI phone receptionist", "Call logging", "Post-call summaries"],
  },
  {
    id: "phone_email",
    name: "Phone + Email",
    price: "$89.99",
    minutes: "200 min/mo included",
    features: ["Everything in Starter", "Automated email follow-ups"],
    popular: true,
  },
  {
    id: "ai_front_office",
    name: "AI Front Office",
    price: "$199",
    minutes: "500 min/mo included",
    features: [
      "Everything in Phone + Email",
      "SMS messaging",
      "Priority support",
      "Advanced analytics",
    ],
  },
];

const CHECKOUT_URL =
  "https://hygmztvpmmyxuomjwrbt.supabase.co/functions/v1/create-checkout";

function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

  const handleCheckout = async (plan: PlanId) => {
    setLoadingPlan(plan);
    try {
      const res = await fetch(CHECKOUT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      toast.error("Couldn't start checkout. Please try again.");
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-14 text-center">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Pricing
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Choose the plan that fits your practice.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isLoading = loadingPlan === plan.id;
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-card p-8 shadow-sm",
                  plan.popular
                    ? "border-primary/60 shadow-lg ring-1 ring-primary/40"
                    : "border-border",
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    Most Popular
                  </div>
                )}

                <h2 className="text-xl font-semibold">{plan.name}</h2>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.minutes}
                </p>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="mt-8 w-full"
                  variant={plan.popular ? "default" : "secondary"}
                  disabled={isLoading}
                  onClick={() => handleCheckout(plan.id)}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Get Started"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
