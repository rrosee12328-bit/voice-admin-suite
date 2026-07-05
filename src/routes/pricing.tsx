import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Zap, TrendingUp, Sparkles, ArrowRight, Phone } from "lucide-react";
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
  badge?: string;
  icon: LucideIcon;
  price: string;
  priceSuffix?: string;
  setupFee?: string;
  setupNote?: string;
  tagline: string;
  bestFor: string;
  features: string[];
  cta: string;
  ctaHref?: string;
  ctaExternal?: boolean;
  popular?: boolean;
  highlight?: string;
};

const PLANS: PlanDef[] = [
  {
    id: "essentials",
    name: "Essentials",
    badge: "Limited Time",
    icon: Zap,
    price: "$500",
    priceSuffix: "/mo",
    setupFee: "$1,500",
    setupNote: "one-time setup fee",
    tagline: "Your AI receptionist, done for you in 48–72 hours.",
    bestFor: "Small businesses & solo operators with moderate call volume",
    features: [
      "24/7 AI voice receptionist",
      "Done-for-you setup & configuration",
      "Smart call routing & after-hours handling",
      "Spam blocking",
      "Call recordings + summaries",
      "Email alerts after every call",
      "Full call transcripts",
      "Analytics dashboard",
      "Intake form delivery",
      "Bilingual support (EN / ES)",
      "SMS follow-up with booking link",
      "30-day money-back guarantee",
    ],
    cta: "Get Started",
    ctaHref: "/get-started",
    popular: true,
  },
  {
    id: "growth",
    name: "Growth",
    icon: TrendingUp,
    price: "$1,000",
    priceSuffix: "/mo",
    setupFee: "$3,000",
    setupNote: "one-time setup fee",
    tagline: "High-volume AI with custom integrations built around your workflow.",
    bestFor: "Growing businesses with high call volume or custom integration needs",
    features: [
      "Everything in Essentials",
      "Up to ~2,000 minutes / month",
      "Custom CRM or software integrations",
      "Multi-location or multi-agent support",
      "Advanced lead scoring",
      "Outbound AI follow-up calling",
      "Monthly performance review",
      "Dedicated account manager",
      "Priority support",
    ],
    cta: "Book a Discovery Call",
    ctaHref: "https://calendly.com/vektiss-info/30-minute-vektiss-discovery",
    ctaExternal: true,
    highlight: "Best for high-volume & custom builds",
  },
  {
    id: "custom",
    name: "Enterprise",
    icon: Sparkles,
    price: "Custom",
    tagline: "Unlimited volume, white-label, and enterprise SLAs.",
    bestFor: "Multi-location chains, franchises & enterprise organizations",
    features: [
      "Everything in Growth",
      "Unlimited call volume",
      "White-label option",
      "Custom SLA guarantees",
      "Dedicated build team",
      "API & webhook integrations",
      "Quarterly business reviews",
    ],
    cta: "Contact Us",
    ctaHref: "https://calendly.com/vektiss-info/30-minute-vektiss-discovery",
    ctaExternal: true,
  },
];

function PricingPage() {
  return (
    <div className="min-h-screen bg-[#EEF4FB] text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-20">
        {/* Header */}
        <div className="mb-14 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Vektiss Voice Pricing
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            Simple, transparent pricing.
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Setup fee first. Monthly billing starts when your agent goes live — on your schedule.
          </p>
        </div>

        {/* Plan cards */}
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
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-primary/30 bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary shadow-sm">
                    {plan.badge}
                  </div>
                )}

                {/* Plan name & icon */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary">
                    <Icon className="h-4.5 w-4.5" strokeWidth={2} />
                  </div>
                  <h2 className="text-lg font-semibold">{plan.name}</h2>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">{plan.tagline}</p>

                {/* Price */}
                <div className="mt-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                    {plan.priceSuffix && (
                      <span className="text-sm text-muted-foreground">{plan.priceSuffix}</span>
                    )}
                  </div>
                  {plan.setupFee && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      + <span className="font-semibold text-foreground">{plan.setupFee}</span> {plan.setupNote}
                    </p>
                  )}
                </div>

                {/* CTA */}
                {plan.ctaExternal ? (
                  <Button
                    asChild
                    className="mt-5 w-full rounded-lg"
                    variant={plan.popular ? "default" : "outline"}
                  >
                    <a href={plan.ctaHref} target="_blank" rel="noopener noreferrer">
                      {plan.cta} <ArrowRight className="ml-1 h-4 w-4" />
                    </a>
                  </Button>
                ) : (
                  <Button
                    asChild
                    className="mt-5 w-full rounded-lg"
                    variant={plan.popular ? "default" : "outline"}
                  >
                    <Link to={plan.ctaHref as string}>
                      {plan.cta} <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                )}

                <div className="my-6 border-t border-border" />

                {/* Best for */}
                <div className="rounded-xl border border-primary/15 bg-primary/10 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Best for
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{plan.bestFor}</p>
                </div>

                {/* Features */}
                <div className="mt-6 flex-1">
                  <p className="text-sm font-semibold text-foreground">What's included</p>
                  <ul className="mt-3 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-foreground/90">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="mx-auto mt-12 max-w-3xl space-y-3 text-center">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">How billing works:</span> You pay the one-time setup fee first. Monthly billing starts on the date your agent goes live — we schedule it together. No surprises.
          </p>
          <p className="text-xs text-muted-foreground">
            Have questions? <a href="https://calendly.com/vektiss-info/30-minute-vektiss-discovery" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline-offset-2 hover:underline">Book a free 30-minute call</a> and we'll walk you through the right plan for your business.
          </p>
        </div>
      </div>
    </div>
  );
}
