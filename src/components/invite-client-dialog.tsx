import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Loader2, Mail, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client-untyped";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const INVITE_PLANS: Plan[] = ["phone_starter", "phone_email", "ai_front_office"];

type Form = {
  contact_email: string;
  business_name: string;
  plan: Plan;
  contact_phone: string;
  website: string;
  services: string;
};

const empty: Form = {
  contact_email: "",
  business_name: "",
  plan: "phone_email",
  contact_phone: "",
  website: "",
  services: "",
};

export function InviteClientDialog({
  triggerLabel = "Invite client",
  triggerVariant = "default",
}: {
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary";
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [created, setCreated] = useState<{ token: string; link: string; emailSent: boolean } | null>(null);
  const [resending, setResending] = useState(false);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("intake_forms")
        .insert({
          business_name: form.business_name || null,
          contact_phone: form.contact_phone || null,
          website: form.website || null,
          services: form.services || null,
          answers: {
            __plan: form.plan,
            __contact_email: form.contact_email,
          },
        })
        .select("token")
        .single();
      if (error) throw error;
      const token = data!.token as string;
      const link = `${window.location.origin}/intake/${token}`;

      // Fire and forget the invite email — failure does not block link creation.
      let emailSent = false;
      try {
        const { sendClientInvite } = await import("@/lib/invite-client");
        await sendClientInvite({
          recipientEmail: form.contact_email,
          businessName: form.business_name || null,
          plan: form.plan,
          intakeUrl: link,
        });
        emailSent = true;
      } catch (e) {
        console.warn("Invite email failed:", e);
      }

      return { token, link, emailSent };
    },
    onSuccess: (res) => {
      setCreated(res);
      qc.invalidateQueries({ queryKey: ["admin-intakes"] });
      toast.success(res.emailSent ? "Invite created and emailed" : "Invite created (email not sent)");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleResend = async () => {
    if (!created) return;
    setResending(true);
    try {
      const { sendClientInvite } = await import("@/lib/invite-client");
      await sendClientInvite({
        recipientEmail: form.contact_email,
        businessName: form.business_name || null,
        plan: form.plan,
        intakeUrl: created.link,
      });
      setCreated({ ...created, emailSent: true });
      toast.success("Email resent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send email");
    } finally {
      setResending(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copied");
  };

  const reset = () => {
    setForm(empty);
    setCreated(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant={triggerVariant}>
          <Plus className="mr-1.5 h-4 w-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{created ? "Invite ready" : "Invite a new client"}</DialogTitle>
        </DialogHeader>

        {!created ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              They'll receive an email with a secure link to complete intake, review their plan, accept the terms, and pay.
            </p>
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
                  placeholder="Acme Dental"
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
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="sv">Services (optional)</Label>
                <Textarea
                  id="sv"
                  rows={2}
                  value={form.services}
                  onChange={(e) => setForm({ ...form, services: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={
                  createMutation.isPending ||
                  !form.contact_email ||
                  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)
                }
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…
                  </>
                ) : (
                  "Create & send invite"
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>
                  {created.emailSent
                    ? `Email sent to ${form.contact_email}`
                    : "Email could not be sent automatically — share the link below."}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Invite link</Label>
              <div className="flex gap-2">
                <Input value={created.link} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copy(created.link)} title="Copy">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" asChild title="Open">
                  <a href={created.link} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleResend} disabled={resending}>
                {resending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" /> {created.emailSent ? "Resend email" : "Try sending email"}
                  </>
                )}
              </Button>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
