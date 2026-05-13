import { createFileRoute } from "@tanstack/react-router";
import RelatorioPedagogico from "@/components/RelatorioPedagogico";

export const Route = createFileRoute("/relatorio-pedagogico")({
  component: RelatorioPedagogico,
});