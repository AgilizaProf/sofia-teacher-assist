import { createFileRoute } from "@tanstack/react-router";
import PlanejamentoPedagogico from "@/components/PlanejamentoPedagogico";

export const Route = createFileRoute("/planejamento-pedagogico")({
  component: PlanejamentoPedagogico,
});