import { createFileRoute } from "@tanstack/react-router";
import { Cadernos } from "@/pages/Cadernos";

export const Route = createFileRoute("/cadernos")({
  validateSearch: (s: Record<string, unknown>): { q?: string } =>
    typeof s.q === "string" && s.q ? { q: s.q } : {},
  head: () => ({
    meta: [
      { title: "Cadernos prontos · AgilizaProf" },
      {
        name: "description",
        content:
          "Atividades prontas para imprimir por disciplina, ano e habilidade da BNCC, com versão PCD e caderno do professor. Acesso a partir de 13/03/2027.",
      },
    ],
  }),
  component: Cadernos,
});
