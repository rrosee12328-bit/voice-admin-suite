import { createFileRoute, useSearch } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import vektissLogo from "@/assets/vektiss-logo.png";


type SuccessSearch = { email?: string };

export const Route = createFileRoute("/success")({
  validateSearch: (search: Record<string, unknown>): SuccessSearch => ({
    email: typeof search.email === "string" ? search.email : undefined,
  }),
  component: SuccessPage,
});

function SuccessPage() {
  const { email } = useSearch({ from: "/success" });

  return (
    <div className="bg-grid flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <img src={vektissLogo} alt="Vektiss" className="h-10" />
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Payment confirmed!</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            We've sent a login invitation to{" "}
            <span className="font-medium text-foreground">{email ?? "your email"}</span>. Check your
            inbox to set up your account password.
          </p>

          <p className="mt-6 text-sm text-muted-foreground">
            Check your email to set your password — once you've set it, you'll be able to log in to your dashboard.
          </p>

          <p className="mt-6 text-xs text-muted-foreground">
            Didn't receive it? Check your spam folder or contact{" "}
            <a
              href="mailto:info@vektiss.com"
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              info@vektiss.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
