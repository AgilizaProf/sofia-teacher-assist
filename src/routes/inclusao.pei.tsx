import { createFileRoute } from "@tanstack/react-router";
import { PeiPdi } from "@/pages/PeiPdi";

export const Route = createFileRoute("/inclusao/pei")({
  head: () => ({
    meta: [
      { title: "PEI/PDI · Inclusão — AgilizaProf" },
      { name: "description", content: "Sofia gera o Plano Educacional Individualizado completo por aluno PCD com objetivos, estratégias e versionamento." },
      { property: "og:title", content: "PEI/PDI por aluno · AgilizaProf" },
      { property: "og:description", content: "PEI completo com IA, editável e versionado." },
    ],
  }),
  component: PeiPdi,
});