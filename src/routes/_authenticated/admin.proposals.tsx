import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, ExternalLink, FileDown, FileText } from "lucide-react";
import { PROPOSAL_TEMPLATES, getProposalTemplate } from "@/lib/proposals";
import { proposalToPdf, downloadBlob } from "@/lib/proposal-export";
import { ProposalView } from "@/components/proposal-view";

export const Route = createFileRoute("/_authenticated/admin/proposals")({
  component: ProposalsPage,
});

function ProposalsPage() {
  const [selectedSlug, setSelectedSlug] = useState(PROPOSAL_TEMPLATES[0]?.slug ?? "");
  const template = useMemo(() => getProposalTemplate(selectedSlug), [selectedSlug]);
  const [clientName, setClientName] = useState(template?.defaultClientName ?? "");

  // Keep client name in sync when switching templates (only if user hasn't typed anything custom).
  const onSelectTemplate = (slug: string) => {
    const next = getProposalTemplate(slug);
    setSelectedSlug(slug);
    if (next) setClientName(next.defaultClientName);
  };

  const shareUrl = useMemo(() => {
    if (!template) return "";
    if (typeof window === "undefined") return "";
    const base = `${window.location.origin}/proposal/${template.slug}`;
    return clientName.trim()
      ? `${base}?client=${encodeURIComponent(clientName.trim())}`
      : base;
  }, [template, clientName]);

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Proposal link copied");
  };

  const downloadPdf = async () => {
    if (!template) return;
    try {
      const blob = await proposalToPdf(template, clientName.trim() || template.defaultClientName);
      const safeClient = (clientName.trim() || template.defaultClientName).replace(/\s+/g, "-");
      downloadBlob(blob, `${template.slug}-${safeClient}.pdf`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Custom proposals</h1>
        <p className="text-sm text-muted-foreground">
          Pick a template, customize it for the client, then share a link or send a PDF.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        {/* Template list */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            {PROPOSAL_TEMPLATES.map((t) => {
              const active = t.slug === selectedSlug;
              return (
                <button
                  key={t.slug}
                  onClick={() => onSelectTemplate(t.slug)}
                  className={`w-full rounded-md border px-3 py-3 text-left transition ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium leading-tight">{t.name}</div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {t.category}
                    </Badge>
                  </div>
                  <div className="mt-1.5 text-xs text-muted-foreground">{t.summary}</div>
                </button>
              );
            })}
            {PROPOSAL_TEMPLATES.length === 0 && (
              <div className="px-2 py-6 text-sm text-muted-foreground">
                No templates yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Editor + preview */}
        <div className="space-y-4">
          {template ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Customize</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="client">Client / firm name</Label>
                    <Input
                      id="client"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder={template.defaultClientName}
                    />
                    <p className="text-xs text-muted-foreground">
                      Used wherever the proposal references the recipient.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Shareable link</Label>
                    <div className="flex gap-2">
                      <Input value={shareUrl} readOnly className="font-mono text-xs" />
                      <Button variant="outline" onClick={copyLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" asChild>
                        <a href={shareUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Anyone with this link can view the proposal — no login required.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button onClick={downloadPdf}>
                      <FileDown className="mr-2 h-4 w-4" /> Download PDF
                    </Button>
                    <Button variant="outline" asChild>
                      <Link
                        to="/proposal/$slug"
                        params={{ slug: template.slug }}
                        search={{ client: clientName.trim() || undefined }}
                        target="_blank"
                      >
                        <FileText className="mr-2 h-4 w-4" /> Open preview
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Preview</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="border-t border-border/60 bg-background">
                    <ProposalView
                      template={template}
                      clientName={clientName.trim() || template.defaultClientName}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                Select a template to get started.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
