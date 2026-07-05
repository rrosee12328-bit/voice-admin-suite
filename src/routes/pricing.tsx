import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Phone, Mail, Sparkles, Plus, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  icon: LucideIcon;
  price: string;
  priceSuffix?: string;
  tagline?: string;
  bestFor?: string;
  allowance?: string;
  featuresHeader?: string; // e.g. "Everything in Phone Starter"
  featuresSubHeader?: string; // e.g. "Plus"
  features: string[];
  overage?: string;
  popular?: boolean;
  cta: string;
};

const PLANS: PlanDef[] = [
  {
    id: "phone_starter",
    name: "Phone Starter",
    icon: Phone,
    price: "$45.99",
    priceSuffix: "/mo",
    tagline: "Never miss another call.",
    bestFor: "Solo operators",
    allowance: "60 phone minutes / mo",
    featuresHeader: "What's included",
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
    icon: Mail,
    price: "$500",
    priceSuffix: "/mo",
    tagline: "Your full virtual receptionist.",
    bestFor: "Growing teams (100+ calls/mo)",
    allowance: "500 minutes + 500 emails / mo",
    featuresHeader: "Everything in Phone Starter",
    featuresSubHeader: "Plus",
    features: [
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
    icon: Sparkles,
    price: "Let's Talk",
    tagline: "Built around your workflow.",
    bestFor: "Multi-location & enterprise",
    allowance: "Unlimited volume",
    featuresHeader: "Everything in AI Front Office",
    featuresSubHeader: "Plus",
    features: [
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
    <div className="min-h-screen bg-[#EEF4FB] text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-14 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Vektiss Voice Pricing
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            Vektiss Voice. Starting at <span className="text-primary">$45.99/mo</span>.
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Done-for-you setup. 30-day money-back guarantee. No contracts.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 items-stretch">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-card p-7 shadow-sm",
                  plan.popular
                    ? "border-primary shadow-lg ring-1 ring-primary/30"
                    : "border-border",
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-primary/30 bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary shadow-sm">
                    <Plus className="h-3 w-3" />
                    Most Popular
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary">
                    <Icon className="h-4.5 w-4.5" strokeWidth={2} />
                  </div>
                  <h2 className="text-lg font-semibold">{plan.name}</h2>
                </div>
                {plan.tagline && (
                  <p className="mt-3 text-sm text-muted-foreground">{plan.tagline}</p>
                )}

                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                  {plan.priceSuffix && (
                    <span className="text-sm text-muted-foreground">{plan.priceSuffix}</span>
                  )}
                </div>

                <Button
                  asChild
                  className="mt-5 w-full rounded-lg"
                  variant={plan.popular ? "default" : "outline"}
                >
                  <Link to="/get-started">
                    {plan.cta} <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>

                <div className="my-6 border-t border-border" />

                {plan.allowance && (
                  <div className="rounded-xl border border-primary/15 bg-primary/10 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Includes
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{plan.allowance}</p>
                  </div>
                )}

                {plan.bestFor && (
                  <div className="mt-3 rounded-xl border border-primary/15 bg-primary/10 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Best for
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{plan.bestFor}</p>
                  </div>
                )}

                <div className="mt-6 flex-1">
                  {plan.featuresHeader && (
                    <p className="text-sm font-semibold text-foreground">
                      {plan.featuresHeader}
                    </p>
                  )}
                  {plan.featuresSubHeader && (
                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {plan.featuresSubHeader}
                    </p>
                  )}
                  <ul className={cn("space-y-2.5", plan.featuresSubHeader ? "mt-2" : "mt-3")}>
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-foreground/90">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {plan.overage && (
                  <p className="mt-6 border-t border-border pt-4 text-xs font-medium text-muted-foreground">
                    {plan.overage}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-10 max-w-3xl text-center text-xs text-muted-foreground">
          * A one-time $1,500 setup fee applies to all plans. We build, configure, and test your
          custom AI agent — you don't touch any technology.
        </p>
      </div>
    </div>
  );
}
