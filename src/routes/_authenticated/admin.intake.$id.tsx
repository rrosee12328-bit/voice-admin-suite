import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client-untyped";
import { INTAKE_SECTIONS } from "@/lib/intake-questions";
import { intakeToMarkdown, intakeToPdf, downloadBlob, type IntakeRow } from "@/lib/intake-export";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, FileText, FileDown, ExternalLink, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/intake/$id")({
  component: IntakeDetailPage,
});

function IntakeDetailPage() {
  const { id } = Route.useParams();

  const rowQ = useQuery({
    queryKey: ["admin-intake", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intake_forms")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as IntakeRow | null;
    },
  });

  if (rowQ.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const row = rowQ.data;
  if (!row) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Intake form not found.</p>
        <Link to="/admin/intake" className="mt-3 inline-flex items-center text-sm text-primary hover:underline">
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Link>
      </div>
    );
  }

  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/intake/${row.token}`;
  const fileBase = `intake-${(row.business_name || row.id).replace(/\s+/g, "-")}`;

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link to="/admin/intake" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="mr-1 h-4 w-4" /> All intake forms
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{row.business_name || "(unnamed)"}</h1>
            <Badge variant={row.status === "submitted" ? "default" : "secondary"}>{row.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {row.submitted_at
              ? `Submitted ${new Date(row.submitted_at).toLocaleString()}`
              : `Created ${new Date(row.created_at).toLocaleString()} · not yet submitted`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href={link} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open form
            </a>
          </Button>
          <Button
            variant="outline"
            onClick={() => downloadBlob(intakeToMarkdown(row), `${fileBase}.md`, "text/markdown;charset=utf-8")}
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" /> Download .md
          </Button>
          <Button
            onClick={async () => {
              const blob = await intakeToPdf(row);
              downloadBlob(blob, `${fileBase}.pdf`);
            }}
          >
            <FileDown className="mr-1.5 h-3.5 w-3.5" /> Download PDF
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {INTAKE_SECTIONS.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.questions.map((q) => {
                const v = row.answers?.[q.id];
                const empty = v == null || v === "" || (Array.isArray(v) && v.length === 0);
                return (
                  <div key={q.id}>
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {q.label}
                    </div>
                    <div className={`mt-1 text-sm ${empty ? "italic text-muted-foreground" : ""}`}>
                      {empty ? (
                        "(not answered)"
                      ) : Array.isArray(v) ? (
                        <ul className="list-disc pl-5">
                          {v.map((x: string, i: number) => <li key={i}>{x}</li>)}
                        </ul>
                      ) : (
                        <p className="whitespace-pre-wrap">{String(v)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
