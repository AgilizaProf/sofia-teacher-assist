import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/atividade")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/planejamento/atividade", search: search as never });
  },
});