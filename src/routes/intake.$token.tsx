import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client-untyped";
import { INTAKE_SECTIONS, type Question } from "@/lib/intake-questions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <header className="mb-8">
          <div className="text-xs font-medium uppercase tracking-wider text-primary">
            Vektiss Voice
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Client Intake Questionnaire</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Help us configure your AI receptionist. You can save and come back later — your progress is preserved by this unique link.
          </p>
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
        </header>

        {isSubmitted && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-semibold">Submitted</div>
              <div className="mt-0.5">
                Your responses were received on {new Date(row.submitted_at!).toLocaleString()}. You can still edit and re-submit if anything changes.
              </div>
            </div>
          </div>
        )}

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
            Auto-save by clicking "Save progress"
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
            {isSubmitted ? "Re-submit" : "Submit"}
          </Button>
        </div>
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
