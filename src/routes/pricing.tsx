import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Vektiss Voice" },
      { name: "description", content: "Vektiss Voice plans. Done-for-you setup. 30-day money-back guarantee. No contracts." },
      { property: "og:title", content: "Pricing — Vektiss Voice" },
      { property: "og:description", content: "Vektiss Voice plans. Done-for-you setup. 30-day money-back guarantee. No contracts." },
    ],
  }),
  component: PricingPage,
});

type PlanDef = {
  id: string;
  name: string;
  price: string;
  priceSuffix?: string;
  tagline?: string;
  bestFor?: string;
  allowance?: string;
  features: string[];
  overage?: string;
  popular?: boolean;
  cta: string;
};

const PLANS: PlanDef[] = [
  {
    id: "phone_starter",
    name: "Phone Starter",
    price: "$45.99",
    priceSuffix: "/mo",
    tagline: "Never miss another call.",
    bestFor: "Solo operators",
    allowance: "60 phone minutes / mo",
    features: [
      "24/7 AI receptionist",
      "Smart call routing",
      "After-hours handling",
      "Spam blocking",
      "Call recordings + summaries",
      "Email alerts after every call",
      "Done-for-you setup",
      "30-day money-back",
    ],
    overage: "$0.25 / extra minute",
    cta: "Get Started",
  },
  {
    id: "ai_front_office",
    name: "AI Front Office",
    price: "$199",
    priceSuffix: "/mo",
    tagline: "Your full virtual receptionist.",
    bestFor: "Growing teams (100+ calls/mo)",
    allowance: "500 minutes + 500 emails / mo",
    features: [
      "Everything in Phone Starter, plus:",
      "Intake form delivery",
      "Email AI assistant",
      "Analytics dashboard",
      "Full call transcripts",
      "Monthly performance report",
      "Lead scoring (Hot / Warm / Cold)",
      "Calendar sync (Google + Outlook)",
      "Bilingual support (EN / ES)",
      "Auto follow-up emails",
      "Caller memory",
      "Priority support",
    ],
    overage: "$0.15 / min · $0.03 / email",
    popular: true,
    cta: "Get Started",
  },
  {
    id: "custom",
    name: "Custom",
    price: "Let's Talk",
    tagline: "Built around your workflow.",
    bestFor: "Multi-location & enterprise",
    allowance: "Unlimited volume",
    features: [
      "Everything in AI Front Office, plus:",
      "Custom CRM integrations",
      "Multi-location support",
      "Outbound AI calling",
      "Dedicated account manager",
    ],
    overage: "Volume-based pricing",
    cta: "Contact Us",
  },
];

function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            Vektiss Voice Pricing
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            Vektiss Voice. Starting at $45.99/mo.
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Done-for-you setup. 30-day money-back guarantee. No contracts.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-7 shadow-sm",
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
              {plan.tagline && (
                <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
              )}

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight">{plan.price}</span>
                {plan.priceSuffix && (
                  <span className="text-muted-foreground">{plan.priceSuffix}</span>
                )}
              </div>

              {plan.allowance && (
                <div className="mt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Includes
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">{plan.allowance}</p>
                </div>
              )}

              {plan.bestFor && (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Best for
                  </p>
                  <p className="mt-1 text-sm text-foreground">{plan.bestFor}</p>
                </div>
              )}

              <div className="mt-5 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  What's included
                </p>
                <ul className="mt-2 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {plan.overage && (
                <p className="mt-5 border-t border-border pt-3 text-xs text-muted-foreground">
                  {plan.overage}
                </p>
              )}

              <Button
                asChild
                className="mt-6 w-full rounded-full"
                variant={plan.popular ? "default" : "secondary"}
              >
                <Link to="/get-started">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-3xl text-center text-xs text-muted-foreground">
          * A one-time $500 setup fee applies to all plans. We build, configure, and test your
          custom AI agent — you don't touch any technology.
        </p>
      </div>
    </div>
  );
}
