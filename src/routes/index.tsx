import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/login", replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="mx-auto h-2 w-32 animate-pulse rounded-full bg-muted" />
        <p className="mt-4 text-sm text-muted-foreground">Opening Vektiss Voice…</p>
        <Link to="/login" className="mt-3 inline-block text-sm font-medium text-foreground underline-offset-4 hover:underline">
          Go to sign in
        </Link>
      </div>
    </div>
  );
}
