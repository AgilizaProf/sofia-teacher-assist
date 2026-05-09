import { createFileRoute } from "@tanstack/react-router";
import { PlanejamentoEi } from "@/pages/PlanejamentoEi";

export const Route = createFileRoute("/planejamento/ei")({
  head: () => ({
    meta: [
      { title: "Roteiro de Experiência · Educação Infantil — AgilizaProf" },
      { name: "description", content: "Sofia cria roteiros de experiência para Creche e Pré-escola com Campos de Experiência, direitos de aprendizagem e adaptação por faixa etária." },
      { property: "og:title", content: "Educação Infantil · Roteiro de Experiência" },
      { property: "og:description", content: "Sem habilidades BNCC do Fundamental — Campos de Experiência e marcos de desenvolvimento, do jeito certo." },
    ],
  }),
  component: PlanejamentoEi,
});