import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Copy,
  ExternalLink,
  FileDown,
  FileText,
  MoreHorizontal,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react";
import { PROPOSAL_TEMPLATES, getProposalTemplate } from "@/lib/proposals";
import { proposalToPdf, downloadBlob } from "@/lib/proposal-export";
import { ProposalView } from "@/components/proposal-view";
import {
  saveProposal,
  listProposals,
  updateProposalStatus,
  deleteProposal,
  formatProposalStatus,
  type ProposalRow,
} from "@/lib/proposal-tracking";

export const Route = createFileRoute("/_authenticated/admin/proposals")({
  component: ProposalsPage,
});

function ProposalsPage() {
  const [selectedSlug, setSelectedSlug] = useState(PROPOSAL_TEMPLATES[0]?.slug ?? "");
  const template = useMemo(() => getProposalTemplate(selectedSlug), [selectedSlug]);
  const [clientName, setClientName] = useState(template?.defaultClientName ?? "");
  const [sentProposals, setSentProposals] = useState<ProposalRow[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [savingLink, setSavingLink] = useState(false);

  // Keep client name in sync when switching templates
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

  const loadProposals = async () => {
    setLoadingProposals(true);
    try {
      const rows = await listProposals();
      setSentProposals(rows);
    } catch {
      toast.error("Could not load sent proposals");
    } finally {
      setLoadingProposals(false);
    }
  };

  useEffect(() => {
    loadProposals();
  }, []);

  const copyLink = async () => {
    if (!shareUrl || !template) return;
    setSavingLink(true);
    try {
      const saved = await saveProposal(
        template.slug,
        clientName.trim() || template.defaultClientName,
        shareUrl
      );
      // Append the DB id so the public page can record views
      const trackedUrl = `${shareUrl}${shareUrl.includes("?") ? "&" : "?"}id=${saved.id}`;
      await navigator.clipboard.writeText(trackedUrl);
      toast.success("Proposal link copied and saved");
      setSentProposals((prev) => [saved, ...prev]);
    } catch {
      await navigator.clipboard.writeText(shareUrl);
      toast.warning("Link copied (could not save to database)");
    } finally {
      setSavingLink(false);
    }
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

  const handleStatusChange = async (id: string, status: ProposalRow["status"]) => {
    try {
      await updateProposalStatus(id, status);
      setSentProposals((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status } : p))
      );
      toast.success(`Proposal marked as ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProposal(id);
      setSentProposals((prev) => prev.filter((p) => p.id !== id));
      toast.success("Proposal deleted");
    } catch {
      toast.error("Failed to delete proposal");
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

      {/* Generator */}
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

        {/* Config + preview */}
        <div className="space-y-6">
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
                      <Button variant="outline" onClick={copyLink} disabled={savingLink}>
                        {savingLink ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="outline" asChild>
                        <a href={shareUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Copying the link saves it to the database and enables view tracking.
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

      {/* Sent proposals table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Sent proposals</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              View counts and status update automatically when clients open the link.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={loadProposals} disabled={loadingProposals}>
            <RefreshCw className={`h-4 w-4 ${loadingProposals ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loadingProposals ? (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : sentProposals.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              No proposals sent yet. Copy a link above to start tracking.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead>Last viewed</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sentProposals.map((p) => {
                  const { label, variant } = formatProposalStatus(p.status);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.client_name}</TableCell>
                      <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
                        {p.slug}
                      </TableCell>
                      <TableCell>
                        <Badge variant={variant}>{label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="flex items-center justify-end gap-1">
                          <Eye className="h-3 w-3 text-muted-foreground" />
                          {p.view_count}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.last_viewed_at
                          ? new Date(p.last_viewed_at).toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigator.clipboard.writeText(p.share_url)}
                            >
                              <Copy className="mr-2 h-4 w-4" /> Copy link
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href={p.share_url} target="_blank" rel="noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" /> Open
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(p.id, "accepted")}
                            >
                              <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Mark accepted
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(p.id, "declined")}
                            >
                              <XCircle className="mr-2 h-4 w-4 text-red-500" /> Mark declined
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(p.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
