import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useMe } from "@/lib/me";
import { supabase } from "@/integrations/supabase/client-untyped";
import type { Call } from "@/integrations/supabase/app-types";
import { canUse } from "@/lib/plan-gating";
import {
  OutcomeBadge,
  ReasonBadge,
  LeadScoreBadge,
} from "@/components/badges";

import { LockedFeature } from "@/components/locked-feature";
import { AudioPlayer } from "@/components/audio-player";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/dashboard/calls/$id")({
  component: CallDetailPage,
});

const STATUSES = ["new", "in_progress", "resolved", "needs_follow_up", "archived"];

function CallDetailPage() {
  const { id } = Route.useParams();
  const me = useMe();
  const plan = me.tenant?.plan ?? "phone_starter";
  const isSuperAdmin = me.profile.role === "super_admin";
  const canSeeTranscript = isSuperAdmin || canUse(plan, "transcripts");
  const queryClient = useQueryClient();


  const { data: call, isLoading } = useQuery({
    queryKey: ["call", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("*")
        .eq("id", id)
        .maybeSingle<Call>();
      if (error) throw error;
      return data;
    },
  });

  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("new");

  useEffect(() => {
    if (call) {
      setNotes(call.notes || "");
      setStatus(call.status || "new");
    }
  }, [call]);

  const updateMutation = useMutation({
    mutationFn: async (patch: Partial<Call>) => {
      const { error } = await supabase.from("calls").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call", id] });
      queryClient.invalidateQueries({ queryKey: ["calls-log"] });
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-64 w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!call) {
    return (
      <div className="p-6">
        <Link to="/dashboard/calls" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to call log
        </Link>
        <div className="mt-6 rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Call not found.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <Link to="/dashboard/calls" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to call log
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {call.caller_name || "Unknown caller"}
        </h1>
        <p className="text-sm text-muted-foreground tabular-nums">
          {call.caller_phone || "—"} · {format(new Date(call.created_at), "PPpp")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Patient Info</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Caller name</dt>
                <dd className="mt-1 font-medium">{call.caller_name || "Unknown"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Phone</dt>
                <dd className="mt-1 tabular-nums">{call.caller_phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">New patient</dt>
                <dd className="mt-1">
                  {call.is_new_patient ? (
                    <span className="inline-flex rounded-md border border-info/30 bg-info/15 px-2 py-0.5 text-xs font-medium text-info">New Patient</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Returning / unknown</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Reason</dt>
                <dd className="mt-1"><ReasonBadge reason={call.call_reason} /></dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Outcome</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Outcome</dt>
                <dd className="mt-1"><OutcomeBadge outcome={call.outcome} /></dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Duration</dt>
                <dd className="mt-1 tabular-nums">
                  {call.duration_seconds != null
                    ? `${Math.floor(call.duration_seconds / 60)}:${String(call.duration_seconds % 60).padStart(2, "0")}`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Appointment</dt>
                <dd className="mt-1">
                  {call.appointment_booked ? (
                    <span className="inline-flex rounded-md border border-success/30 bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Appt Booked</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not booked</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Transferred</dt>
                <dd className="mt-1">
                  {call.transferred ? (
                    <span className="inline-flex rounded-md border border-warning/30 bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">Transferred</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No</span>
                  )}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">SMS</dt>
                <dd className="mt-1">
                  {call.sms_sent ? (
                    <div className="space-y-2">
                      <span className="inline-flex rounded-md bg-slate-badge px-2 py-0.5 text-xs font-medium text-slate-badge-foreground">SMS Sent</span>
                      {call.sms_message && (
                        <div className="rounded-md border border-border bg-muted/30 p-2 text-xs">{call.sms_message}</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No SMS sent</span>
                  )}
                </dd>
              </div>
              {canUse(plan, "lead_score") && (
                <div>
                  <dt className="text-xs text-muted-foreground">Lead score</dt>
                  <dd className="mt-1"><LeadScoreBadge score={call.lead_score} /></dd>
                </div>
              )}
            </dl>
          </div>

          {call.recording_url && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold">Recording</h2>
              <AudioPlayer src={call.recording_url} />
            </div>
          )}

          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Full Transcript</h2>
              {canSeeTranscript && call.transcript && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(call.transcript || "");
                    toast.success("Transcript copied");
                  }}
                >
                  Copy
                </Button>
              )}
            </div>
            {canSeeTranscript ? (
              call.transcript ? (
                <div className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-4 text-sm leading-relaxed">
                  {call.transcript}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No transcript available for this call.</p>
              )
            ) : (
              <LockedFeature feature="transcripts" />
            )}

          </div>
        </div>


        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Status</h2>
            <Select
              value={status}
              onValueChange={(v) => { setStatus(v); updateMutation.mutate({ status: v }); }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Notes</h2>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              placeholder="Add internal notes about this call…"
            />
            <Button
              className="mt-3 w-full"
              size="sm"
              disabled={notes === (call.notes || "") || updateMutation.isPending}
              onClick={() => updateMutation.mutate({ notes })}
            >
              Save notes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
