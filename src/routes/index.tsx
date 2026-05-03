import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/pages/Dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgilizaProf — Painel da professora" },
      { name: "description", content: "Assistente pedagógica com IA alinhada à BNCC. Pareceres, planos de aula e PEI em minutos." },
      { property: "og:title", content: "AgilizaProf — Painel da professora" },
      { property: "og:description", content: "Economize 10 horas por semana com a Sofia, sua assistente pedagógica." },
    ],
  }),
  component: Index,
});

function Index() {
  return <Dashboard />;
}
