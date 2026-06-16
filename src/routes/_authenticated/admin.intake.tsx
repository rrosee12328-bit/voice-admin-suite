import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client-untyped";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Plus, ExternalLink, FileText, FileDown } from "lucide-react";
import { intakeToMarkdown, intakeToPdf, downloadBlob, type IntakeRow } from "@/lib/intake-export";
import { formatDistanceToNow } from "date-fns";
import { InviteClientDialog } from "@/components/invite-client-dialog";
import { EditDraftIntakeDialog } from "@/components/edit-draft-intake-dialog";
import { SendIntakeLinkDialog } from "@/components/send-intake-link-dialog";
import { PLAN_LABEL } from "@/lib/plan-gating";
import type { Plan } from "@/integrations/supabase/app-types";

export const Route = createFileRoute("/_authenticated/admin/intake")({
  component: IntakeRouteShell,
});

function IntakeRouteShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path !== "/admin/intake") return <Outlet />;
  return <IntakeListPage />;
}

function IntakeListPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ["admin-intakes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intake_forms")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as IntakeRow[];
    },
  });

  const [form, setForm] = useState({
    business_name: "",
    contact_phone: "",
    website: "",
    services: "",
    form_type: "auto_repair" as "auto_repair" | "foreclosure_law" | "vektiss_lead",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("intake_forms")
        .insert({
          business_name: form.business_name || null,
          contact_phone: form.contact_phone || null,
          website: form.website || null,
          services: form.services || null,
          form_type: form.form_type,
        })
        .select("token")
        .single();
      if (error) throw error;
      return data!.token as string;
    },
    onSuccess: (token) => {
      const url = `${window.location.origin}/intake/${token}`;
      setCreatedLink(url);
      setForm({ business_name: "", contact_phone: "", website: "", services: "", form_type: "auto_repair" as "auto_repair" | "foreclosure_law" | "vektiss_lead" });
      qc.invalidateQueries({ queryKey: ["admin-intakes"] });
      toast.success("Intake link created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Link copied");
  };

  const list = listQ.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Client intake forms</h1>
          <p className="text-sm text-muted-foreground">
            Create a unique link to send to a new client. Download submissions as PDF or Markdown.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <InviteClientDialog triggerLabel="Invite client" />
          <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setCreatedLink(null); }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" /> Blank intake
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{createdLink ? "Intake link ready" : "Create intake form"}</DialogTitle>
              </DialogHeader>
              {!createdLink ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Pre-fill what you already know — the client can edit anything before submitting.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="ft">Form template</Label>
                    <select
                      id="ft"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={form.form_type}
                      onChange={(e) => setForm({ ...form, form_type: e.target.value as "auto_repair" | "foreclosure_law" | "vektiss_lead" })}
                    >
                      <option value="auto_repair">Auto Repair Shop</option>
                      <option value="foreclosure_law">Foreclosure / Probate Law Office</option>
                      <option value="vektiss_lead">Vektiss Voice — Lead Capture</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bn">Business name</Label>
                    <Input id="bn" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cp">Primary phone</Label>
                    <Input id="cp" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ws">Website</Label>
                    <Input id="ws" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sv">Services (free-form)</Label>
                    <Textarea id="sv" rows={3} value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} placeholder="Paste or list services found on their website" />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                      Create link
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Share this link with the client. They can fill it out without logging in.
                  </p>
                  <div className="flex gap-2">
                    <Input value={createdLink} readOnly className="font-mono text-xs" />
                    <Button variant="outline" onClick={() => copyLink(createdLink)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" asChild>
                      <a href={createdLink} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => setCreateOpen(false)}>Done</Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All intake forms</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {listQ.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : list.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No intake forms yet. Click "New intake" to create one.</div>
          ) : (
            <ul className="divide-y divide-border/60">
              {list.map((row) => {
                const link = `${typeof window !== "undefined" ? window.location.origin : ""}/intake/${row.token}`;
                return (
                  <li key={row.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to="/admin/intake/$id"
                          params={{ id: row.id }}
                          className="truncate font-medium hover:underline"
                        >
                          {row.business_name || "(unnamed)"}
                        </Link>
                        <Badge variant={row.status === "submitted" ? "default" : "secondary"}>
                          {row.status}
                        </Badge>
                        {(row.answers as any)?.__plan && (
                          <Badge variant="outline">
                            {PLAN_LABEL[(row.answers as any).__plan as Plan]}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {row.submitted_at
                          ? `Submitted ${formatDistanceToNow(new Date(row.submitted_at), { addSuffix: true })}`
                          : `Created ${formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}`}
                        {(row.answers as any)?.__contact_email ? ` · ${(row.answers as any).__contact_email}` : row.contact_phone ? ` · ${row.contact_phone}` : ""}
                      </div>
                    </div>
                    {row.status !== "submitted" && <EditDraftIntakeDialog row={row} />}
                    <SendIntakeLinkDialog row={row} />
                    <Button size="sm" variant="outline" onClick={() => copyLink(link)}>
                      <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={link} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadBlob(intakeToMarkdown(row), `intake-${(row.business_name || row.id).replace(/\s+/g, "-")}.md`, "text/markdown;charset=utf-8")}
                    >
                      <FileText className="mr-1.5 h-3.5 w-3.5" /> .md
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        const blob = await intakeToPdf(row);
                        downloadBlob(blob, `intake-${(row.business_name || row.id).replace(/\s+/g, "-")}.pdf`);
                      }}
                    >
                      <FileDown className="mr-1.5 h-3.5 w-3.5" /> PDF
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
