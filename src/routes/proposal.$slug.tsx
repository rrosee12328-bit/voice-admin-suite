import { createFileRoute, notFound } from "@tanstack/react-router";
import { getProposalTemplate } from "@/lib/proposals";
import { ProposalView } from "@/components/proposal-view";
import { Button } from "@/components/ui/button";
import { proposalToPdf, downloadBlob } from "@/lib/proposal-export";
import { FileDown } from "lucide-react";

type Search = { client?: string };

export const Route = createFileRoute("/proposal/$slug")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    client: typeof search.client === "string" ? search.client : undefined,
  }),
  head: ({ params }) => {
    const t = getProposalTemplate(params.slug);
    return {
      meta: [
        { title: t ? `${t.name} — Vektiss Proposal` : "Vektiss Proposal" },
        { name: "robots", content: "noindex" },
        {
          name: "description",
          content: t?.summary ?? "Custom proposal from Vektiss.",
        },
      ],
    };
  },
  beforeLoad: ({ params }) => {
    if (!getProposalTemplate(params.slug)) throw notFound();
  },
  component: PublicProposalPage,
});

function PublicProposalPage() {
  const { slug } = Route.useParams();
  const { client } = Route.useSearch();
  const template = getProposalTemplate(slug)!;
  const clientName = (client ?? "").trim() || template.defaultClientName;

  const downloadPdf = async () => {
    const blob = await proposalToPdf(template, clientName);
    const safeClient = clientName.replace(/\s+/g, "-");
    downloadBlob(blob, `${template.slug}-${safeClient}.pdf`);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <div className="text-sm font-semibold tracking-tight">Vektiss</div>
          <Button size="sm" onClick={downloadPdf}>
            <FileDown className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>
      <div className="bg-background">
        <ProposalView template={template} clientName={clientName} />
      </div>
    </div>
  );
}
