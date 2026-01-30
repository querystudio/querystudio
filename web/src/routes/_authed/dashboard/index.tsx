import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/dashboard/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/account" });
  },
});
