// Supabase-backed proposal tracking.
// These functions persist proposals to the `proposals` table and track views.
// The anon key is used for all client-side calls (RLS enforces access).
// The `record_proposal_view` RPC is SECURITY DEFINER so anonymous visitors can call it.

import { supabase } from "@/integrations/supabase/client";
import type { Database, ProposalStatus } from "@/integrations/supabase/types";

export type ProposalRow = Database["public"]["Tables"]["proposals"]["Row"];

/**
 * Save a proposal to the database when a shareable link is generated.
 * Returns the saved row (including the generated `id`).
 */
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
      status: "sent" as ProposalStatus,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save proposal: ${error.message}`);
  return data;
}

/**
 * List all proposals ordered by most recently created.
 */
export async function listProposals(): Promise<ProposalRow[]> {
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list proposals: ${error.message}`);
  return data ?? [];
}

/**
 * Update the status of a proposal (e.g., mark as accepted or declined).
 */
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

/**
 * Delete a proposal record.
 */
export async function deleteProposal(id: string): Promise<void> {
  const { error } = await supabase.from("proposals").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete proposal: ${error.message}`);
}

/**
 * Record a view for a proposal.
 * Calls the `record_proposal_view` RPC which is SECURITY DEFINER —
 * safe to call from the public proposal page without authentication.
 * Silently ignores errors (a failed view ping should never break the page).
 */
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

/**
 * Format a proposal status for display.
 */
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
