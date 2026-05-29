import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMe } from "@/lib/me";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminGate,
});

function AdminGate() {
  const me = useMe();
  const navigate = useNavigate();
  useEffect(() => {
    if (me.profile.role !== "super_admin") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [me, navigate]);
  if (me.profile.role !== "super_admin") return null;
  return <Outlet />;
}
