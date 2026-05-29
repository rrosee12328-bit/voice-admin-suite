import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase, type Call } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/DashboardShell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDateTime, formatDuration } from "@/lib/format";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/calls")({
  component: ClientCalls,
});

function ClientCalls() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const [openCall, setOpenCall] = useState<Call | null>(null);

  const { data, isLoading, error } = useQuery({
    enabled: !!tenantId,
    queryKey: ["client", "calls", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("started_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Call[];
    },
  });

  return (
    <div>
      <PageHeader title="Calls" description="Recent calls handled by your receptionist." />
      <div className="rounded-xl border border-border/60 bg-card">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <p className="p-6 text-sm text-destructive">
            Failed to load: {(error as Error).message}
          </p>
        )}
        {data && data.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">No calls yet.</p>
        )}
        {data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Caller</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Booked</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => setOpenCall(c)}
                >
                  <TableCell className="font-medium">{c.caller_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.caller_phone ?? "—"}</TableCell>
                  <TableCell>{c.call_reason ?? "—"}</TableCell>
                  <TableCell>{c.outcome ?? "—"}</TableCell>
                  <TableCell>
                    {c.appointment_booked ? (
                      <Badge>Yes</Badge>
                    ) : (
                      <Badge variant="outline">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDuration(c.duration_seconds)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(c.started_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!openCall} onOpenChange={(o) => !o && setOpenCall(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{openCall?.caller_name ?? "Caller"}</DialogTitle>
            <DialogDescription>
              {openCall?.caller_phone ?? ""} · {formatDateTime(openCall?.started_at)} ·{" "}
              {formatDuration(openCall?.duration_seconds)}
            </DialogDescription>
          </DialogHeader>
          {openCall?.recording_url && (
            <audio controls src={openCall.recording_url} className="w-full" />
          )}
          <div>
            <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              Transcript
            </div>
            <ScrollArea className="h-72 rounded-md border border-border/60 bg-background p-3">
              <pre className="whitespace-pre-wrap text-sm text-foreground">
                {openCall?.transcript || "No transcript available."}
              </pre>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
