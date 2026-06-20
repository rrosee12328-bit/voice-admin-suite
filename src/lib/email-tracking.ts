// Supabase-backed email message log.
import { supabase } from "@/integrations/supabase/client-untyped";

export type EmailType =
  | "follow_up"
  | "intake_form"
  | "appointment_reminder"
  | "booking_confirmation"
  | "intake_summary"
  | "custom";

export type EmailStatus =
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "failed";

export type EmailMessageRow = {
  id: string;
  tenant_id: string | null;
  call_id: string | null;
  to_email: string;
  to_name: string | null;
  from_email: string;
  subject: string;
  body_html: string | null;
  body_text: string | null;
  email_type: EmailType;
  status: EmailStatus;
  resend_id: string | null;
  call_reason: string | null;
  outcome: string | null;
  open_count: number;
  click_count: number;
  sent_at: string;
  opened_at: string | null;
  error_message: string | null;
  created_at: string;
};

export async function listEmailMessages(
  tenantId?: string | null
): Promise<EmailMessageRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from("email_messages")
    .select("*")
    .order("sent_at", { ascending: false });
  if (tenantId) q = q.eq("tenant_id", tenantId);
  const { data, error } = await q;
  if (error) throw new Error(`Failed to list email messages: ${error.message}`);
  return (data ?? []) as EmailMessageRow[];
}

export async function logEmailMessage(
  msg: Omit<EmailMessageRow, "id" | "created_at" | "open_count" | "click_count">
): Promise<EmailMessageRow> {
  const { data, error } = await (supabase as any)
    .from("email_messages")
    .insert(msg)
    .select()
    .single();
  if (error) throw new Error(`Failed to log email message: ${error.message}`);
  return data as EmailMessageRow;
}

export async function updateEmailStatus(
  id: string,
  status: EmailStatus,
  openedAt?: string
): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (openedAt) update.opened_at = openedAt;
  const { error } = await (supabase as any)
    .from("email_messages")
    .update(update)
    .eq("id", id);
  if (error) throw new Error(`Failed to update email status: ${error.message}`);
}

export async function deleteEmailMessage(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("email_messages")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`Failed to delete email message: ${error.message}`);
}

export function formatEmailType(type: EmailType): string {
  const map: Record<EmailType, string> = {
    follow_up: "Follow-up",
    intake_form: "Intake Form",
    appointment_reminder: "Appt Reminder",
    booking_confirmation: "Booking Confirm",
    intake_summary: "Intake Summary",
    custom: "Custom",
  };
  return map[type] ?? type;
}

export function formatEmailStatus(status: EmailStatus): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  switch (status) {
    case "opened":
      return { label: "Opened", variant: "default" };
    case "clicked":
      return { label: "Clicked", variant: "default" };
    case "delivered":
      return { label: "Delivered", variant: "secondary" };
    case "sent":
      return { label: "Sent", variant: "secondary" };
    case "bounced":
      return { label: "Bounced", variant: "destructive" };
    case "failed":
      return { label: "Failed", variant: "destructive" };
    default:
      return { label: status, variant: "outline" };
  }
}
