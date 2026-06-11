import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Loader2, Mail, Settings2 } from "lucide-react";
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
import type { IntakeRow } from "@/lib/intake-export";

type Form = {
  contact_email: string;
  monthly_price: string;
  included_minutes: string;
  label: string;
};

export function SetCustomPlanDialog({ row }: { row: IntakeRow }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const answers = (row.answers ?? {}) as Record<string, unknown>;

  const initial: Form = {
    contact_email: (answers.__contact_email as string) ?? "",
    monthly_price:
      answers.__custom_price != null ? String(answers.__custom_price) : "",
    included_minutes:
      answers.__custom_minutes != null ? String(answers.__custom_minutes) : "",
    label: (answers.__custom_label as string) ?? "Custom Plan",
  };
  const [form, setForm] = useState<Form>(initial);

  useEffect(() => {
    if (open) setForm(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row.id]);

  const link =
    typeof window !== "undefined" ? `${window.location.origin}/intake/${row.token}` : "";

  const saveMutation = useMutation({
    mutationFn: async () => {
      const price = parseFloat(form.monthly_price);
      const minutes = parseInt(form.included_minutes, 10);
      if (!isFinite(price) || price <= 0) throw new Error("Enter a valid monthly price");
      if (!Number.isFinite(minutes) || minutes <= 0)
        throw new Error("Enter included minutes");

      const nextAnswers = {
        ...(answers as object),
        __plan: "custom",
        __custom_price: price,
        __custom_minutes: minutes,
        __custom_label: form.label || "Custom Plan",
        __contact_email: form.contact_email || (answers.__contact_email as string) || "",
      };
      const { error } = await supabase
        .from("intake_forms")
        .update({ answers: nextAnswers })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-intakes"] });
      toast.success("Custom plan saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSendInvite = async () => {
    if (!form.contact_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) {
      toast.error("Enter a valid email first");
      return;
    }
    setSending(true);
    try {
      await saveMutation.mutateAsync();
      const { sendClientInvite } = await import("@/lib/invite-client");
      await sendClientInvite({
        recipientEmail: form.contact_email,
        businessName: row.business_name || null,
        plan: "custom",
        intakeUrl: link,
      });
      toast.success(`Link sent to ${form.contact_email}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    toast.success("Link copied");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Set custom plan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Set custom plan & send terms</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Set a custom monthly price and included minutes for{" "}
            <span className="font-medium text-foreground">
              {row.business_name || "(unnamed)"}
            </span>
            . The client visits the same intake link, reviews the plan, accepts the Terms,
            and pays.
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
            <div className="space-y-1.5">
              <Label htmlFor="price">Monthly price (USD) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={form.monthly_price}
                onChange={(e) => setForm({ ...form, monthly_price: e.target.value })}
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
                value={form.included_minutes}
                onChange={(e) =>
                  setForm({ ...form, included_minutes: e.target.value })
                }
                placeholder="500"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="lbl">Plan label</Label>
              <Input
                id="lbl"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Custom Plan"
              />
            </div>
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

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || sending}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              "Save plan"
            )}
          </Button>
          <Button onClick={handleSendInvite} disabled={sending || saveMutation.isPending}>
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
