import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/ei")({
  beforeLoad: () => {
    throw redirect({ to: "/planejamento/ei" });
  },
});