// Supabase-backed proposal tracking.
// Uses the untyped client because the `proposals` table is not in generated types.

import { supabase } from "@/integrations/supabase/client-untyped";

export type ProposalStatus = "sent" | "viewed" | "accepted" | "declined";

export type ProposalRow = {
  id: string;
  slug: string;
  client_name: string;
  share_url: string;
  status: ProposalStatus;
  created_at: string;
  viewed_at?: string | null;
  last_viewed_at?: string | null;
  view_count?: number | null;
};

export async function saveProposal(
  slug: string,
  clientName: string,
  shareUrl: string
): Promise<ProposalRow> {
  const { data, error } = await supabase
    .from("proposals")
    .insert({
      slug,
      client_name: clientName,
      share_url: shareUrl,
      status: "sent",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save proposal: ${error.message}`);
  return data as ProposalRow;
}

export async function listProposals(): Promise<ProposalRow[]> {
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list proposals: ${error.message}`);
  return (data ?? []) as ProposalRow[];
}

export async function updateProposalStatus(
  id: string,
  status: ProposalStatus
): Promise<void> {
  const { error } = await supabase
    .from("proposals")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(`Failed to update proposal status: ${error.message}`);
}

export async function deleteProposal(id: string): Promise<void> {
  const { error } = await supabase.from("proposals").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete proposal: ${error.message}`);
}

export async function recordProposalView(proposalId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc("record_proposal_view", {
      proposal_id: proposalId,
    });
    if (error) {
      console.warn("[proposal-tracking] recordProposalView failed:", error.message);
    }
  } catch (e) {
    console.warn("[proposal-tracking] recordProposalView threw:", e);
  }
}

export function formatProposalStatus(status: ProposalStatus): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  switch (status) {
    case "sent":
      return { label: "Sent", variant: "secondary" };
    case "viewed":
      return { label: "Viewed", variant: "default" };
    case "accepted":
      return { label: "Accepted", variant: "default" };
    case "declined":
      return { label: "Declined", variant: "destructive" };
    default:
      return { label: status, variant: "outline" };
  }
}
