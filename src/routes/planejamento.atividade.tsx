import { createFileRoute } from "@tanstack/react-router";
import { PlanejamentoAtividade } from "@/pages/PlanejamentoAtividade";

type Search = { dia?: string; turma?: string };

export const Route = createFileRoute("/planejamento/atividade")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    dia: typeof s.dia === "string" ? s.dia : undefined,
    turma: typeof s.turma === "string" ? s.turma : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Nova atividade · Planejamento alinhado à BNCC — AgilizaProf" },
      { name: "description", content: "Crie uma atividade pedagógica alinhada à BNCC com apoio da Sofia: ano, disciplina, habilidade, objetivo, sequência didática e adaptações." },
      { property: "og:title", content: "Nova atividade · Planejamento alinhado à BNCC" },
      { property: "og:description", content: "Gere uma atividade alinhada à BNCC em poucos cliques. Sofia cuida da habilidade, objetivos e sequência." },
    ],
  }),
  component: PlanejamentoAtividade,
});