import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client-untyped";
import vektissLogo from "@/assets/vektiss-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { sendSelfServeInvite } from "@/lib/self-serve-invite.functions";

export const Route = createFileRoute("/get-started")({
  head: () => ({
    meta: [
      { title: "Get Started — Vektiss Voice" },
      { name: "description", content: "Choose your Vektiss Voice plan and get set up in minutes." },
      { property: "og:title", content: "Get Started — Vektiss Voice" },
      { property: "og:description", content: "Choose your Vektiss Voice plan and get set up in minutes." },
    ],
  }),
  component: GetStartedPage,
});

type PlanId = "phone_starter" | "phone_email" | "ai_front_office" | "custom";

type PlanDef = {
  id: PlanId;
  name: string;
  price: string;
  priceSuffix?: string;
  features: string[];
  popular?: boolean;
};

const PLANS: PlanDef[] = [
  {
    id: "phone_starter",
    name: "Phone Starter",
    price: "$45.99",
    priceSuffix: "/mo",
    features: ["AI phone answering", "Call routing", "Voicemail transcription"],
  },
  {
    id: "phone_email",
    name: "Phone + Email",
    price: "$89.99",
    priceSuffix: "/mo",
    features: ["Everything in Phone Starter", "AI email responses"],
    popular: true,
  },
  {
    id: "ai_front_office",
    name: "AI Front Office",
    price: "$199.99",
    priceSuffix: "/mo",
    features: ["Everything in Phone + Email", "Full front office automation", "Priority support"],
  },
  {
    id: "custom",
    name: "Custom",
    price: "Let's talk",
    features: ["SMS and more", "Enterprise/custom needs", "Book a discovery call"],
  },
];

function GetStartedPage() {
  const [selected, setSelected] = useState<PlanId>("phone_email");
  const [firstName, setFirstName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit = firstName.trim() && businessName.trim() && emailValid && phone.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    if (selected === "custom") {
      const url = `https://calendly.com/vektiss-info/30-minute-vektiss-discovery?name=${encodeURIComponent(
        firstName,
      )}&email=${encodeURIComponent(email)}`;
      window.location.href = url;
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("intake_forms")
        .insert({
          business_name: businessName,
          contact_phone: phone,
          answers: {
            __plan: selected,
            __contact_email: email,
            __first_name: firstName,
            __source: "self_serve",
          },
        })
        .select("token")
        .single();
      if (error) throw error;
      const token = data!.token as string;
      const link = `${window.location.origin}/intake/${token}`;

      await sendSelfServeInvite({
        data: {
          recipientEmail: email,
          businessName,
          firstName,
          plan: selected,
          intakeUrl: link,
        },
      });

      setDone(true);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-grid min-h-screen text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <img src={vektissLogo} alt="Vektiss" className="h-8 w-auto" />
        </Link>
        <Link
          to="/login"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-6">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Get started with Vektiss Voice
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Pick a plan, tell us about your business, and we'll send your setup link.
          </p>
        </div>

        {done ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <h2 className="mt-4 text-xl font-semibold">Check your email</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We've sent you a link to complete your intake form and get started.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {PLANS.map((plan) => {
                const isSelected = selected === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelected(plan.id)}
                    className={cn(
                      "relative flex flex-col rounded-2xl border bg-card p-6 text-left shadow-sm transition-all",
                      isSelected
                        ? "border-primary ring-2 ring-primary/40 shadow-md"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                        Most Popular
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-2xl font-bold">{plan.price}</span>
                      {plan.priceSuffix && (
                        <span className="text-sm text-muted-foreground">{plan.priceSuffix}</span>
                      )}
                    </div>
                    <ul className="mt-5 flex-1 space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={handleSubmit}
              className="mx-auto mt-10 max-w-xl rounded-2xl border border-border bg-card p-7 shadow-sm"
            >
              <h2 className="text-lg font-semibold">Your details</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {selected === "custom"
                  ? "We'll take you to book a discovery call."
                  : "We'll email your setup link to this address."}
              </p>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First name *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="businessName">Business name *</Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    autoComplete="organization"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={!canSubmit || submitting}
                className="mt-6 h-11 w-full rounded-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : selected === "custom" ? (
                  "Book a Call"
                ) : (
                  "Get Started"
                )}
              </Button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
