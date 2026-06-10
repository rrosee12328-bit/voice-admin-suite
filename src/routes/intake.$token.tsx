import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client-untyped";
import { INTAKE_SECTIONS, type Question } from "@/lib/intake-questions";
import type { Plan } from "@/integrations/supabase/app-types";
import { PLAN_LABEL, PLAN_PRICE } from "@/lib/plan-gating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Check, CheckCircle2, CreditCard, Loader2, Pencil } from "lucide-react";

const PLAN_FEATURES: Record<Plan, { minutes: string; bullets: string[] }> = {
  phone_starter: {
    minutes: "100 minutes/month included",
    bullets: ["AI phone receptionist", "Call logging", "Post-call summaries"],
  },
  phone_email: {
    minutes: "200 minutes/month included",
    bullets: ["Everything in Starter", "Automated email follow-ups", "Transcripts & analytics"],
  },
  ai_front_office: {
    minutes: "500 minutes/month included",
    bullets: [
      "Everything in Phone + Email",
      "SMS messaging",
      "Lead scoring & caller memory",
      "Calendar booking",
      "Priority support",
    ],
  },
  custom: { minutes: "Custom volume", bullets: ["Tailored to your practice"] },
};

const TERMS_PLACEHOLDER = `By proceeding you agree to Vektiss's Terms of Service and Privacy Policy.
Your subscription will renew monthly at the listed price until cancelled.
Usage above the included minutes is billed at standard overage rates.
You may cancel at any time from your billing dashboard.`;

const VEKTISS_CHECKOUT =
  "https://hygmztvpmmyxuomjwrbt.supabase.co/functions/v1/create-checkout";

export const Route = createFileRoute("/intake/$token")({
  head: () => ({
    meta: [
      { title: "Vektiss Voice — Client Intake" },
      { name: "description", content: "Tell us about your business so we can set up your AI receptionist." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: IntakePage,
});

function IntakePage() {
  const { token } = Route.useParams();

  const formQ = useQuery({
    queryKey: ["intake-form", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intake_forms")
        .select("*")
        .eq("token", token)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as any;
    },
  });

  const row = formQ.data;
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [pre, setPre] = useState({
    business_name: "",
    contact_phone: "",
    website: "",
    services: "",
  });

  useEffect(() => {
    if (!row) return;
    setAnswers(row.answers ?? {});
    setPre({
      business_name: row.business_name ?? "",
      contact_phone: row.contact_phone ?? "",
      website: row.website ?? "",
      services: row.services ?? "",
    });
  }, [row]);

  // Pre-fill bound questions from columns the first time
  useEffect(() => {
    if (!row) return;
    setAnswers((prev) => {
      const next = { ...prev };
      for (const s of INTAKE_SECTIONS) {
        for (const q of s.questions) {
          if (q.prefill && (next[q.id] == null || next[q.id] === "")) {
            const v = (row as any)[q.prefill];
            if (v) next[q.id] = v;
          }
        }
      }
      return next;
    });
  }, [row]);

  const saveMutation = useMutation({
    mutationFn: async (submit: boolean) => {
      const patch: any = {
        answers,
        business_name: pre.business_name || answers.business_name || null,
        contact_phone: pre.contact_phone || answers.primary_phone || null,
        website: pre.website || answers.website || null,
        services: pre.services || answers.services_list || null,
      };
      if (submit) {
        patch.status = "submitted";
        patch.submitted_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("intake_forms")
        .update(patch)
        .eq("token", token);
      if (error) throw error;
      return submit;
    },
    onSuccess: (submitted) => {
      toast.success(submitted ? "Submitted! Thanks." : "Saved");
      formQ.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setAnswer = (id: string, value: any) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  const isSubmitted = row?.status === "submitted";

  const progress = useMemo(() => {
    const all = INTAKE_SECTIONS.flatMap((s) => s.questions);
    const filled = all.filter((q) => {
      const v = answers[q.id];
      if (v == null) return false;
      if (Array.isArray(v)) return v.length > 0;
      return String(v).trim() !== "";
    }).length;
    return { filled, total: all.length };
  }, [answers]);

  if (formQ.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (formQ.isError || !row) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold">Form not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This intake link is invalid or has expired. Contact your Vektiss account manager for a new link.
          </p>
        </div>
      </div>
    );
  }


  const plan = (row.answers?.__plan as Plan | undefined) ?? null;
  const contactEmail = (row.answers?.__contact_email as string | undefined) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <header className="mb-8">
          <div className="text-xs font-medium uppercase tracking-wider text-primary">
            Vektiss Voice
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {isSubmitted ? "Review & Pay" : "Client Intake Questionnaire"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSubmitted
              ? "Confirm your plan and accept the terms to activate your AI receptionist."
              : "Help us configure your AI receptionist. You can save and come back later — your progress is preserved by this unique link."}
          </p>
          {!isSubmitted && (
            <div className="mt-4 flex items-center gap-3">
              <div className="h-1.5 flex-1 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(progress.filled / progress.total) * 100}%` }}
                />
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">
                {progress.filled}/{progress.total}
              </span>
            </div>
          )}
        </header>

        {plan && !isSubmitted && (
          <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-primary">
              Selected plan
            </div>
            <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
              <div className="text-lg font-semibold">{PLAN_LABEL[plan]}</div>
              <div className="text-sm text-muted-foreground">
                ${PLAN_PRICE[plan]}/mo · {PLAN_FEATURES[plan].minutes}
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              You'll confirm and pay after submitting this form.
            </p>
          </div>
        )}

        {isSubmitted ? (
          <ReviewAndPay
            plan={plan}
            contactEmail={contactEmail}
            businessName={pre.business_name || (row.answers?.business_name as string | undefined) || ""}
            contactName={(row.answers?.contact_name as string | undefined) ?? null}
            contactPhone={pre.contact_phone || (row.answers?.primary_phone as string | undefined) || ""}
            token={token}
            reopen={async () => {
              const { error } = await supabase
                .from("intake_forms")
                .update({ status: "in_progress" })
                .eq("token", token);
              if (error) toast.error(error.message);
              else formQ.refetch();
            }}
          />

        ) : (
          <>
            <div className="space-y-6">
              {INTAKE_SECTIONS.map((section) => (
                <Card key={section.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    {section.intro && (
                      <p className="text-sm text-muted-foreground">{section.intro}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {section.questions.map((q) => (
                      <QuestionField
                        key={q.id}
                        q={q}
                        value={answers[q.id]}
                        onChange={(v) => setAnswer(q.id, v)}
                      />
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="sticky bottom-4 z-10 mt-8 flex flex-wrap items-center justify-end gap-3 rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur">
              <span className="mr-auto text-xs text-muted-foreground">
                {plan ? "Next: review your plan and pay" : "Auto-save by clicking \"Save progress\""}
              </span>
              <Button
                variant="outline"
                onClick={() => saveMutation.mutate(false)}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save progress
              </Button>
              <Button
                onClick={() => saveMutation.mutate(true)}
                disabled={saveMutation.isPending}
              >
                {plan ? "Submit & continue to payment" : "Submit"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function QuestionField({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: any;
  onChange: (v: any) => void;
}) {
  if (q.type === "multiselect") {
    const selected: string[] = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{q.label}</Label>
        {q.help && <p className="text-xs text-muted-foreground">{q.help}</p>}
        <div className="space-y-2">
          {(q.options ?? []).map((opt) => {
            const checked = selected.includes(opt);
            return (
              <label key={opt} className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(c) => {
                    if (c) onChange([...selected, opt]);
                    else onChange(selected.filter((x) => x !== opt));
                  }}
                />
                <span className="leading-tight">{opt}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }
  if (q.type === "textarea") {
    return (
      <div className="space-y-2">
        <Label htmlFor={q.id} className="text-sm font-medium">{q.label}</Label>
        {q.help && <p className="text-xs text-muted-foreground">{q.help}</p>}
        <Textarea
          id={q.id}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      </div>
    );
  }
  // text
  return (
    <div className="space-y-2">
      <Label htmlFor={q.id} className="text-sm font-medium">{q.label}</Label>
      {q.help && <p className="text-xs text-muted-foreground">{q.help}</p>}
      <Input
        id={q.id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ReviewAndPay({
  plan,
  contactEmail,
  businessName,
  contactName,
  contactPhone,
  token,
  reopen,
}: {
  plan: Plan | null;
  contactEmail: string | null;
  businessName: string;
  contactName: string | null;
  contactPhone: string;
  token: string;
  reopen: () => void | Promise<void>;
}) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Thanks — we've received your responses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Your Vektiss account manager will be in touch shortly with the next steps for your plan.
          </p>
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <span>Intake submitted successfully.</span>
          </div>
          <Button variant="outline" onClick={() => reopen()}>
            <Pencil className="mr-2 h-4 w-4" /> Edit my answers
          </Button>
        </CardContent>
      </Card>
    );
  }

  const features = PLAN_FEATURES[plan];

  const handlePay = async () => {
    setLoading(true);
    try {
      const clientFirstName = (contactName ?? businessName ?? "").trim().split(/\s+/)[0] ?? "";

      // Log ToS acceptance (non-blocking on failure)
      try {
        const { error: tosError } = await supabase.functions.invoke("log-tos-acceptance", {
          body: {
            email: contactEmail ?? "",
            client_name: clientFirstName,
            business_name: businessName,
            plan,
            intake_token: token,
            tos_version: "2.0",
          },
        });
        if (tosError) console.warn("log-tos-acceptance failed:", tosError);
      } catch (tosErr) {
        console.warn("log-tos-acceptance threw:", tosErr);
      }

      const res = await fetch(VEKTISS_CHECKOUT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          intake_token: token,
          customer_email: contactEmail ?? undefined,
          business_name: businessName,
          client_name: clientFirstName,
          client_email: contactEmail ?? "",
          client_phone: contactPhone,
          plan_price: String(PLAN_PRICE[plan]),
        }),
      });
      if (!res.ok) throw new Error(`Checkout failed (${res.status})`);
      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      toast.error("Couldn't start checkout. Please try again.");
      setLoading(false);
    }
  };



  return (
    <div className="space-y-6">
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-baseline justify-between gap-2 text-lg">
            <span>{PLAN_LABEL[plan]}</span>
            <span className="text-base font-medium text-muted-foreground">
              ${PLAN_PRICE[plan]}/mo
            </span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">{features.minutes}</p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {features.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Terms & Conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-40 overflow-y-auto whitespace-pre-line rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            {TERMS_PLACEHOLDER}
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={agreed}
              onCheckedChange={(c) => setAgreed(c === true)}
              className="mt-0.5"
            />
            <span>
              I have read and agree to the Vektiss Terms of Service and Privacy Policy, and
              I authorize monthly billing for the {PLAN_LABEL[plan]} plan at ${PLAN_PRICE[plan]}/mo.
            </span>
          </label>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => reopen()}>
          <Pencil className="mr-2 h-4 w-4" /> Edit my answers
        </Button>
        <Button size="lg" onClick={handlePay} disabled={!agreed || loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening Stripe…
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" /> Continue to payment
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
