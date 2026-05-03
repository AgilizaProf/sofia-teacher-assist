import { createFileRoute } from "@tanstack/react-router";
import { Assistente } from "@/pages/Assistente";

export const Route = createFileRoute("/assistente")({
  head: () => ({
    meta: [
      { title: "Assistente IA · Sofia — AgilizaProf" },
      { name: "description", content: "Converse com a Sofia, sua assistente pedagógica IA. Pareceres, planos, atividades e PEI em minutos." },
      { property: "og:title", content: "Assistente IA · Sofia" },
      { property: "og:description", content: "Sua assistente pedagógica com IA, alinhada à BNCC." },
    ],
  }),
  component: Assistente,
});