import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client-untyped";
import { sendPasswordResetEmail, setPasswordWithResetToken } from "@/lib/password-reset.functions";
import vektissLogo from "@/assets/vektiss-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/set-password")({
  component: SetPasswordPage,
});

function SetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetSendLoading, setResetSendLoading] = useState(false);

  // Reset links can arrive as a token_hash query, a PKCE code query, or the
  // older access-token hash. Turn any of those into a session before showing
  // the password form.
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const tokenHash = params.get("token_hash");
      const code = params.get("code");
      const vektissResetToken = params.get("reset_token");
      const email = params.get("email");
      const accessToken = params.get("access_token") || hashParams.get("access_token");
      const refreshToken = params.get("refresh_token") || hashParams.get("refresh_token");
      const type = params.get("type") === "invite" ? "invite" : "recovery";

      if (email) setResetEmail(email);

      if (vektissResetToken) {
        if (cancelled) return;
        setResetToken(vektissResetToken);
        setHasSession(true);
        setReady(true);
        window.history.replaceState(null, "", window.location.pathname);
        return;
      }

      if (tokenHash) {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });
        if (error) toast.error(error.message);
        if (cancelled) return;
        setHasSession(!!data.session);
        setReady(true);
        window.history.replaceState(null, "", window.location.pathname);
        return;
      }

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) toast.error(error.message);
        if (cancelled) return;
        setHasSession(!!data.session);
        setReady(true);
        window.history.replaceState(null, "", window.location.pathname);
        return;
      }

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) toast.error(error.message);
        if (cancelled) return;
        setHasSession(!!data.session);
        setReady(true);
        window.history.replaceState(null, "", window.location.pathname);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setHasSession(!!data.session);
      setReady(true);

      // Clean the hash from the URL once consumed.
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setHasSession(!!session);
      setReady(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    if (resetToken) {
      try {
        const result = await setPasswordWithResetToken({
          data: { resetToken, password },
        });
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: result.email,
          password,
        });
        if (signInError) {
          toast.success("Password set. Please sign in with your new password.");
          navigate({ to: "/login" });
          return;
        }
        toast.success("Password set! Welcome to Vektiss.");
        navigate({ to: "/dashboard" });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to set password.");
      } finally {
        setLoading(false);
      }
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password set! Welcome to Vektiss.");
    navigate({ to: "/dashboard" });
  };

  const sendFreshReset = async () => {
    const target = resetEmail.trim();
    if (!target) {
      toast.error("Enter your email first.");
      return;
    }

    setResetSendLoading(true);
    try {
      await sendPasswordResetEmail({
        data: {
          email: target,
          redirectTo: `${window.location.origin}/set-password`,
        },
      });
      toast.success(`New password reset email sent to ${target}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reset email.");
    } finally {
      setResetSendLoading(false);
    }
  };

  return (
    <div className="bg-grid flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <img src={vektissLogo} alt="Vektiss" className="h-10" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Set your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a password to finish setting up your account.
        </p>

        {!ready ? (
          <div className="mt-8 h-24 animate-pulse rounded-md bg-muted" />
        ) : !hasSession ? (
          <div className="mt-6 space-y-4 rounded-md border border-border bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">
              This password reset link is missing, invalid, or expired. Send yourself a fresh link, then open it to set your password on this page.
            </p>
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                autoComplete="email"
                placeholder="rrose@vektiss.com"
              />
            </div>
            <Button type="button" className="w-full" onClick={sendFreshReset} disabled={resetSendLoading}>
              {resetSendLoading ? "Sending..." : "Send fresh reset link"}
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Set password & continue"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
