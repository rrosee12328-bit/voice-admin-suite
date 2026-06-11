import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
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

type PlanId = "phone_starter" | "ai_front_office" | "custom";

type PlanDef = {
  id: PlanId;
  name: string;
  price: string;
  priceSuffix?: string;
  tagline?: string;
  bestFor?: string;
  allowance?: string;
  features: string[];
  overage?: string;
  popular?: boolean;
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
  },
];

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  businessName?: string;
  email?: string;
  phone?: string;
};

function validateEmail(value: string): string | undefined {
  if (!value.trim()) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email address";
}

function validatePhone(value: string): string | undefined {
  const digitsOnly = value.replace(/\D/g, "");
  if (!value.trim()) return "Phone number is required";
  if (digitsOnly.length < 10) return "Enter a valid phone number (at least 10 digits)";
}

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)} ext ${digits.slice(10)}`;
}

function GetStartedPage() {
  const [selected, setSelected] = useState<PlanId>("ai_front_office");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactName, setContactName] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setContactName(`${firstName} ${lastName}`.trim());
  }, [firstName, lastName]);

  const getValue = useCallback(
    (name: keyof FieldErrors) =>
      name === "firstName"
        ? firstName
        : name === "lastName"
          ? lastName
          : name === "businessName"
            ? businessName
            : name === "email"
              ? email
              : phone,
    [firstName, lastName, businessName, email, phone],
  );

  const computeError = (name: keyof FieldErrors, value: string): string | undefined => {
    if (name === "firstName") return !value.trim() ? "First name is required" : undefined;
    if (name === "lastName") return !value.trim() ? "Last name is required" : undefined;
    if (name === "businessName") return !value.trim() ? "Business name is required" : undefined;
    if (name === "email") return validateEmail(value);
    if (name === "phone") return validatePhone(value);
  };

  const validateField = useCallback((name: keyof FieldErrors, value: string) => {
    const error = computeError(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
    return !error;
  }, []);

  const canSubmit =
    firstName.trim() &&
    lastName.trim() &&
    businessName.trim() &&
    !validateEmail(email) &&
    !validatePhone(phone);

  const validateAll = useCallback(() => {
    const fields: (keyof FieldErrors)[] = ["firstName", "lastName", "businessName", "email", "phone"];
    let ok = true;
    const nextErrors: FieldErrors = {};
    for (const name of fields) {
      const error = computeError(name, getValue(name));
      if (error) ok = false;
      nextErrors[name] = error;
    }
    setErrors(nextErrors);
    setTouched({ firstName: true, lastName: true, businessName: true, email: true, phone: true });
    return ok;
  }, [getValue]);

  const handleBlur = (name: keyof FieldErrors) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name, getValue(name));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll() || submitting) return;

    setSubmitting(true);
    try {
      // Always create a draft intake record (including for Custom plan).
      const { data, error } = await supabase
        .from("intake_forms")
        .insert({
          business_name: businessName,
          contact_phone: phone,
          answers: {
            __plan: selected,
            __contact_email: email,
            __first_name: firstName,
            __last_name: lastName,
            __source: "self_serve",
            business_name: businessName,
            primary_phone: phone,
            contact_first_name: firstName,
            contact_last_name: lastName,
            contact_name: contactName,
          },
        })
        .select("token")
        .single();
      if (error) throw error;
      const token = data!.token as string;

      if (selected === "custom") {
        const url = `https://calendly.com/vektiss-info/30-minute-vektiss-discovery?name=${encodeURIComponent(
          contactName,
        )}&email=${encodeURIComponent(email)}`;
        window.location.href = url;
        return;
      }

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
          <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            $500 one-time setup fee — done-for-you onboarding
          </div>
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
            <div className="grid gap-5 md:grid-cols-3">
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
                    {(plan.tagline || plan.allowance) && (
                      <div className="mt-2 space-y-0.5">
                        {plan.tagline && (
                          <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                        )}
                        {plan.allowance && (
                          <p className="text-xs font-medium text-primary">{plan.allowance}</p>
                        )}
                      </div>
                    )}
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
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (touched.firstName) validateField("firstName", e.target.value);
                    }}
                    onBlur={() => handleBlur("firstName")}
                    autoComplete="given-name"
                    aria-invalid={!!errors.firstName}
                    aria-describedby={errors.firstName ? "firstName-error" : undefined}
                    className={errors.firstName && touched.firstName ? "border-destructive" : ""}
                  />
                  {errors.firstName && touched.firstName && (
                    <p id="firstName-error" className="text-xs text-destructive">
                      {errors.firstName}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last name *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (touched.lastName) validateField("lastName", e.target.value);
                    }}
                    onBlur={() => handleBlur("lastName")}
                    autoComplete="family-name"
                    aria-invalid={!!errors.lastName}
                    aria-describedby={errors.lastName ? "lastName-error" : undefined}
                    className={errors.lastName && touched.lastName ? "border-destructive" : ""}
                  />
                  {errors.lastName && touched.lastName && (
                    <p id="lastName-error" className="text-xs text-destructive">
                      {errors.lastName}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="businessName">Business name *</Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => {
                      setBusinessName(e.target.value);
                      if (touched.businessName) validateField("businessName", e.target.value);
                    }}
                    onBlur={() => handleBlur("businessName")}
                    autoComplete="organization"
                    aria-invalid={!!errors.businessName}
                    aria-describedby={errors.businessName ? "businessName-error" : undefined}
                    className={errors.businessName && touched.businessName ? "border-destructive" : ""}
                  />
                  {errors.businessName && touched.businessName && (
                    <p id="businessName-error" className="text-xs text-destructive">
                      {errors.businessName}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (touched.email) validateField("email", e.target.value);
                    }}
                    onBlur={() => handleBlur("email")}
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    className={errors.email && touched.email ? "border-destructive" : ""}
                  />
                  {errors.email && touched.email && (
                    <p id="email-error" className="text-xs text-destructive">
                      {errors.email}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const formatted = formatPhoneInput(e.target.value);
                      setPhone(formatted);
                      if (touched.phone) validateField("phone", formatted);
                    }}
                    onBlur={() => handleBlur("phone")}
                    autoComplete="tel"
                    placeholder="(555) 123-4567"
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? "phone-error" : undefined}
                    className={errors.phone && touched.phone ? "border-destructive" : ""}
                  />
                  {errors.phone && touched.phone && (
                    <p id="phone-error" className="text-xs text-destructive">
                      {errors.phone}
                    </p>
                  )}
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
