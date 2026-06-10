import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Loader2, Mail, Pencil } from "lucide-react";
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

const INVITE_PLANS: Plan[] = ["phone_starter", "phone_email", "ai_front_office"];

type Form = {
  contact_email: string;
  business_name: string;
  plan: Plan;
  contact_phone: string;
  website: string;
};

export function EditDraftIntakeDialog({ row }: { row: IntakeRow }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const answers = (row.answers ?? {}) as Record<string, unknown>;

  const initial: Form = {
    contact_email: (answers.__contact_email as string) ?? "",
    business_name: row.business_name ?? "",
    plan: ((answers.__plan as Plan) ?? "phone_email") as Plan,
    contact_phone: row.contact_phone ?? "",
    website: row.website ?? "",
  };

  const [form, setForm] = useState<Form>(initial);

  useEffect(() => {
    if (open) setForm(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row.id]);

  const link = typeof window !== "undefined" ? `${window.location.origin}/intake/${row.token}` : "";

  const saveMutation = useMutation({
    mutationFn: async () => {
      const nextAnswers = {
        ...(answers as object),
        __plan: form.plan,
        __contact_email: form.contact_email,
      };
      const { error } = await supabase
        .from("intake_forms")
        .update({
          business_name: form.business_name || null,
          contact_phone: form.contact_phone || null,
          website: form.website || null,
          answers: nextAnswers,
        })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-intakes"] });
      toast.success("Saved");
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
        businessName: form.business_name || null,
        plan: form.plan,
        intakeUrl: link,
      });
      toast.success(`Invite sent to ${form.contact_email}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send invite");
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
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit & send
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit draft intake</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ce">Customer email *</Label>
              <Input
                id="ce"
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                placeholder="owner@practice.com"
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="bn">Business name</Label>
              <Input
                id="bn"
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Plan *</Label>
              <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v as Plan })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_PLANS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PLAN_LABEL[p]} — ${PLAN_PRICE[p]}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp">Phone</Label>
              <Input
                id="cp"
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ws">Website</Label>
              <Input
                id="ws"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Invite link</Label>
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
              "Save changes"
            )}
          </Button>
          <Button onClick={handleSendInvite} disabled={sending || saveMutation.isPending}>
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" /> Save & send invite
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
