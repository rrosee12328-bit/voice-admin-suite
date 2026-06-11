import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Eye, Loader2, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client-untyped";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLAN_LABEL, PLAN_PRICE } from "@/lib/plan-gating";
import type { Plan } from "@/integrations/supabase/app-types";
import type { IntakeRow } from "@/lib/intake-export";

const PLAN_OPTIONS: Plan[] = ["phone_starter", "ai_front_office", "custom"];

type Form = {
  contact_email: string;
  plan: Plan;
  custom_price: string;
  custom_minutes: string;
  custom_label: string;
};

export function SendIntakeLinkDialog({ row }: { row: IntakeRow }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const answers = (row.answers ?? {}) as Record<string, unknown>;

  const initial: Form = {
    contact_email: (answers.__contact_email as string) ?? "",
    plan: ((answers.__plan as Plan) ?? "ai_front_office") as Plan,
    custom_price:
      answers.__custom_price != null ? String(answers.__custom_price) : "",
    custom_minutes:
      answers.__custom_minutes != null ? String(answers.__custom_minutes) : "",
    custom_label: (answers.__custom_label as string) ?? "Custom Plan",
  };
  const [form, setForm] = useState<Form>(initial);

  useEffect(() => {
    if (open) setForm(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row.id]);

  const link =
    typeof window !== "undefined" ? `${window.location.origin}/intake/${row.token}` : "";

  const savePlan = useMutation({
    mutationFn: async () => {
      const next: Record<string, unknown> = {
        ...(answers as object),
        __plan: form.plan,
        __contact_email:
          form.contact_email || (answers.__contact_email as string) || "",
      };

      if (form.plan === "custom") {
        const price = parseFloat(form.custom_price);
        const minutes = parseInt(form.custom_minutes, 10);
        if (!isFinite(price) || price <= 0)
          throw new Error("Enter a valid monthly price");
        if (!Number.isFinite(minutes) || minutes <= 0)
          throw new Error("Enter included minutes");
        next.__custom_price = price;
        next.__custom_minutes = minutes;
        next.__custom_label = form.custom_label || "Custom Plan";
      } else {
        // Clear any stale custom fields so Stripe uses the standard plan price.
        delete next.__custom_price;
        delete next.__custom_minutes;
        delete next.__custom_label;
      }

      const { error } = await supabase
        .from("intake_forms")
        .update({ answers: next })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-intakes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    toast.success("Link copied");
  };

  const handleSend = async () => {
    if (!form.contact_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) {
      toast.error("Enter a valid email first");
      return;
    }
    setSending(true);
    try {
      await savePlan.mutateAsync();
      const { sendClientInvite } = await import("@/lib/invite-client");
      await sendClientInvite({
        recipientEmail: form.contact_email,
        businessName: row.business_name || null,
        plan: form.plan,
        intakeUrl: link,
      });
      toast.success(`Link sent to ${form.contact_email}`);
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handlePreview = async () => {
    try {
      await savePlan.mutateAsync();
      window.open(link, "_blank", "noopener,noreferrer");
      toast.success("Plan saved — opened intake in a new tab so you can test checkout");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save plan");
    }
  };

  const planSummary =
    form.plan === "custom"
      ? `${form.custom_label || "Custom Plan"}${form.custom_price ? ` — $${form.custom_price}/mo` : ""}`
      : `${PLAN_LABEL[form.plan]} — $${PLAN_PRICE[form.plan]}/mo`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Send className="mr-1.5 h-3.5 w-3.5" /> Send / change plan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send intake link & choose plan</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pick the plan{" "}
            <span className="font-medium text-foreground">
              {row.business_name || "(unnamed)"}
            </span>{" "}
            should see when they open the link. Stripe will charge the matching
            product at checkout.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ce">Customer email *</Label>
              <Input
                id="ce"
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                placeholder="owner@business.com"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Plan *</Label>
              <Select
                value={form.plan}
                onValueChange={(v) => setForm({ ...form, plan: v as Plan })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p === "custom"
                        ? "Custom — set price & minutes below"
                        : `${PLAN_LABEL[p]} — $${PLAN_PRICE[p]}/mo`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.plan === "custom" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="price">Monthly price (USD) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.custom_price}
                    onChange={(e) => setForm({ ...form, custom_price: e.target.value })}
                    placeholder="299"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mins">Included minutes/mo *</Label>
                  <Input
                    id="mins"
                    type="number"
                    min="0"
                    step="1"
                    value={form.custom_minutes}
                    onChange={(e) => setForm({ ...form, custom_minutes: e.target.value })}
                    placeholder="500"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="lbl">Plan label</Label>
                  <Input
                    id="lbl"
                    value={form.custom_label}
                    onChange={(e) => setForm({ ...form, custom_label: e.target.value })}
                    placeholder="Custom Plan"
                  />
                </div>
              </>
            )}
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
            <span className="font-medium">They'll see:</span> {planSummary}
          </div>

          <div className="space-y-1.5">
            <Label>Intake link</Label>
            <div className="flex gap-2">
              <Input value={link} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={copyLink} title="Copy">
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" asChild title="Open">
                <a href={link} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:flex-wrap">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => savePlan.mutate()}
            disabled={savePlan.isPending || sending}
          >
            {savePlan.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              "Save plan only"
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={handlePreview}
            disabled={savePlan.isPending || sending}
          >
            <Eye className="mr-2 h-4 w-4" /> Save & preview checkout
          </Button>
          <Button onClick={handleSend} disabled={sending || savePlan.isPending}>
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" /> Save & email link
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
