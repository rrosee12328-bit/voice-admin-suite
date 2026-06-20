import { useState } from "react";
import { Mail, Trash2, CheckCircle2, AlertCircle, Loader2, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client-untyped";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type ConnectedEmailAccount = {
  id: string;
  tenant_id: string;
  provider: "gmail" | "outlook";
  email_address: string;
  display_name: string | null;
  is_active: boolean;
  is_primary: boolean;
  connected_at: string;
  last_synced_at: string | null;
};

async function listConnectedAccounts(tenantId: string): Promise<ConnectedEmailAccount[]> {
  const { data, error } = await (supabase as any)
    .from("connected_email_accounts")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("connected_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ConnectedEmailAccount[];
}

async function addEmailAccount(
  tenantId: string,
  provider: "gmail" | "outlook",
  emailAddress: string,
  displayName: string
): Promise<ConnectedEmailAccount> {
  // Check if this is the first account — make it primary
  const { data: existing } = await (supabase as any)
    .from("connected_email_accounts")
    .select("id")
    .eq("tenant_id", tenantId);
  const isPrimary = !existing || existing.length === 0;

  const { data, error } = await (supabase as any)
    .from("connected_email_accounts")
    .insert({
      tenant_id: tenantId,
      provider,
      email_address: emailAddress,
      display_name: displayName || null,
      is_primary: isPrimary,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ConnectedEmailAccount;
}

async function removeEmailAccount(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("connected_email_accounts")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

async function setPrimaryAccount(id: string, tenantId: string): Promise<void> {
  // Unset all primaries for this tenant, then set the chosen one
  await (supabase as any)
    .from("connected_email_accounts")
    .update({ is_primary: false })
    .eq("tenant_id", tenantId);
  const { error } = await (supabase as any)
    .from("connected_email_accounts")
    .update({ is_primary: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

async function toggleActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await (supabase as any)
    .from("connected_email_accounts")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// Provider metadata
const PROVIDERS = {
  gmail: {
    label: "Gmail",
    color: "text-red-500",
    bg: "bg-red-50 border-red-200",
    icon: (
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
        <path fill="#EA4335" d="M24 5C13.5 5 5 13.5 5 24s8.5 19 19 19 19-8.5 19-19S34.5 5 24 5z" opacity="0" />
        <path fill="#4285F4" d="M45.5 24c0-1.2-.1-2.4-.3-3.5H24v6.6h12.1c-.5 2.8-2.1 5.1-4.4 6.7v5.6h7.1C42.5 35.5 45.5 30.2 45.5 24z" />
        <path fill="#34A853" d="M24 46c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.6c-2.1 1.4-4.8 2.2-8.8 2.2-6.7 0-12.4-4.5-14.4-10.6H2.2v5.8C6.2 41.4 14.5 46 24 46z" />
        <path fill="#FBBC05" d="M9.6 26.2c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7v-5.8H2.2C.8 14.1 0 18.9 0 24s.8 9.9 2.2 13z" />
        <path fill="#EA4335" d="M24 9.5c3.8 0 7.1 1.3 9.8 3.8l7.3-7.3C37.9 2.1 31.5 0 24 0 14.5 0 6.2 4.6 2.2 11l7.4 5.8C11.6 10.7 17.3 9.5 24 9.5z" />
      </svg>
    ),
  },
  outlook: {
    label: "Outlook",
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    icon: (
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
        <path fill="#1976D2" d="M28 12h15.5c.8 0 1.5.7 1.5 1.5v21c0 .8-.7 1.5-1.5 1.5H28V12z" />
        <path fill="#42A5F5" d="M28 12H12.5c-.8 0-1.5.7-1.5 1.5v21c0 .8.7 1.5 1.5 1.5H28V12z" />
        <path fill="#FFF" d="M43.5 12H28v4l8 4-8 4v4h15.5c.8 0 1.5-.7 1.5-1.5v-13c0-.8-.7-1.5-1.5-1.5z" opacity=".2" />
        <path fill="#FFF" d="M36 20l-8-4v8l8-4z" />
        <path fill="#0D47A1" d="M3 14.5v19L19 37V11L3 14.5z" />
        <path fill="#FFF" d="M11 18c-2.8 0-5 2.7-5 6s2.2 6 5 6 5-2.7 5-6-2.2-6-5-6zm0 9c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z" />
      </svg>
    ),
  },
} as const;

interface ConnectDialogProps {
  open: boolean;
  onClose: () => void;
  provider: "gmail" | "outlook" | null;
  tenantId: string;
  onSuccess: () => void;
}

function ConnectDialog({ open, onClose, provider, tenantId, onSuccess }: ConnectDialogProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleConnect = async () => {
    if (!provider) return;
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSaving(true);
    try {
      await addEmailAccount(tenantId, provider, email.trim(), displayName.trim());
      toast.success(`${PROVIDERS[provider].label} account connected!`);
      setEmail("");
      setDisplayName("");
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to connect account";
      if (msg.includes("unique") || msg.includes("duplicate")) {
        toast.error("This email address is already connected.");
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!provider) return null;
  const meta = PROVIDERS[provider];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {meta.icon}
            Connect {meta.label}
          </DialogTitle>
          <DialogDescription>
            Enter the {meta.label} address your AI receptionist will send emails from. You'll be
            able to authorize the connection once OAuth is configured.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="email-addr">Email address</Label>
            <Input
              id="email-addr"
              type="email"
              placeholder={provider === "gmail" ? "you@gmail.com" : "you@outlook.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="display-name">Display name <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="display-name"
              placeholder="e.g. Sheats Endodontics"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
            />
          </div>
          <div className={`rounded-md border p-3 text-xs text-muted-foreground ${meta.bg}`}>
            <strong className={meta.color}>Note:</strong> Full OAuth authorization (so the AI can
            actually send on your behalf) will be completed during onboarding. This step registers
            the address so it appears in your Email Log.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleConnect} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EmailConnectionsProps {
  tenantId: string;
}

export function EmailConnections({ tenantId }: EmailConnectionsProps) {
  const qc = useQueryClient();
  const [connectProvider, setConnectProvider] = useState<"gmail" | "outlook" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConnectedEmailAccount | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["connected-email-accounts", tenantId],
    queryFn: () => listConnectedAccounts(tenantId),
    enabled: !!tenantId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["connected-email-accounts", tenantId] });

  const removeMut = useMutation({
    mutationFn: (id: string) => removeEmailAccount(id),
    onSuccess: () => {
      toast.success("Account disconnected.");
      invalidate();
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const primaryMut = useMutation({
    mutationFn: (id: string) => setPrimaryAccount(id, tenantId),
    onSuccess: () => {
      toast.success("Primary sending account updated.");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleActive(id, isActive),
    onSuccess: (_, { isActive }) => {
      toast.success(isActive ? "Account enabled." : "Account paused.");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Email Accounts</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Connect Gmail or Outlook so your AI receptionist can send emails on your behalf.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setConnectProvider("gmail")}
          >
            {PROVIDERS.gmail.icon}
            Gmail
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setConnectProvider("outlook")}
          >
            {PROVIDERS.outlook.icon}
            Outlook
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading connected accounts…
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-8 text-center">
          <Mail className="h-8 w-8 text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium">No email accounts connected</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Connect Gmail or Outlook above to enable email follow-ups from your AI receptionist.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setConnectProvider("gmail")}>
              <Plus className="h-3.5 w-3.5" /> Add Gmail
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setConnectProvider("outlook")}>
              <Plus className="h-3.5 w-3.5" /> Add Outlook
            </Button>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {accounts.map((acct) => {
            const meta = PROVIDERS[acct.provider];
            return (
              <li key={acct.id} className="flex items-center gap-3 py-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${meta.bg}`}>
                  {meta.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{acct.email_address}</span>
                    {acct.is_primary && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Star className="h-2.5 w-2.5 fill-current" /> Primary
                      </Badge>
                    )}
                    {!acct.is_active && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">Paused</Badge>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{meta.label}</span>
                    {acct.display_name && <span>· {acct.display_name}</span>}
                    <span>· Connected {new Date(acct.connected_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {/* Active/paused toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => toggleMut.mutate({ id: acct.id, isActive: !acct.is_active })}
                    disabled={toggleMut.isPending}
                    title={acct.is_active ? "Pause this account" : "Enable this account"}
                  >
                    {acct.is_active ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                  </Button>
                  {/* Set primary */}
                  {!acct.is_primary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => primaryMut.mutate(acct.id)}
                      disabled={primaryMut.isPending}
                      title="Set as primary sending account"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  {/* Remove */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(acct)}
                    title="Disconnect this account"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Connect dialog */}
      <ConnectDialog
        open={!!connectProvider}
        onClose={() => setConnectProvider(null)}
        provider={connectProvider}
        tenantId={tenantId}
        onSuccess={invalidate}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect email account?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.email_address}</strong> will be removed. Your AI receptionist
              will no longer send emails from this address. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && removeMut.mutate(deleteTarget.id)}
              disabled={removeMut.isPending}
            >
              {removeMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
