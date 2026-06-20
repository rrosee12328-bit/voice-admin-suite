// Supabase-backed SMS message log.
// Uses the untyped client because sms_messages is not in generated types.
import { supabase } from "@/integrations/supabase/client-untyped";

export type SmsMessageType =
  | "follow_up"
  | "intake_form"
  | "appointment_reminder"
  | "booking_confirmation"
  | "custom";

export type SmsStatus = "sent" | "delivered" | "failed" | "undelivered";

export type SmsMessageRow = {
  id: string;
  tenant_id: string | null;
  call_id: string | null;
  to_phone: string;
  caller_name: string | null;
  message_body: string;
  message_type: SmsMessageType;
  status: SmsStatus;
  twilio_sid: string | null;
  call_reason: string | null;
  outcome: string | null;
  sent_at: string;
  delivered_at: string | null;
  error_message: string | null;
  created_at: string;
};

export async function listSmsMessages(tenantId?: string | null): Promise<SmsMessageRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from("sms_messages")
    .select("*")
    .order("sent_at", { ascending: false });
  if (tenantId) q = q.eq("tenant_id", tenantId);
  const { data, error } = await q;
  if (error) throw new Error(`Failed to list SMS messages: ${error.message}`);
  return (data ?? []) as SmsMessageRow[];
}

export async function logSmsMessage(
  msg: Omit<SmsMessageRow, "id" | "created_at">
): Promise<SmsMessageRow> {
  const { data, error } = await (supabase as any)
    .from("sms_messages")
    .insert(msg)
    .select()
    .single();
  if (error) throw new Error(`Failed to log SMS message: ${error.message}`);
  return data as SmsMessageRow;
}

export async function updateSmsStatus(
  id: string,
  status: SmsStatus,
  deliveredAt?: string
): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (deliveredAt) update.delivered_at = deliveredAt;
  const { error } = await (supabase as any)
    .from("sms_messages")
    .update(update)
    .eq("id", id);
  if (error) throw new Error(`Failed to update SMS status: ${error.message}`);
}

export async function deleteSmsMessage(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("sms_messages")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`Failed to delete SMS message: ${error.message}`);
}

export function formatSmsType(type: SmsMessageType): string {
  const map: Record<SmsMessageType, string> = {
    follow_up: "Follow-up",
    intake_form: "Intake Form",
    appointment_reminder: "Appt Reminder",
    booking_confirmation: "Booking Confirm",
    custom: "Custom",
  };
  return map[type] ?? type;
}

export function formatSmsStatus(status: SmsStatus): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  switch (status) {
    case "delivered":
      return { label: "Delivered", variant: "default" };
    case "sent":
      return { label: "Sent", variant: "secondary" };
    case "failed":
      return { label: "Failed", variant: "destructive" };
    case "undelivered":
      return { label: "Undelivered", variant: "destructive" };
    default:
      return { label: status, variant: "outline" };
  }
}
