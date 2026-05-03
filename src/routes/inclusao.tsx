import { createFileRoute } from "@tanstack/react-router";
import { Inclusao } from "@/pages/Inclusao";

type Search = { tab?: "hoje" | "anam" | "plan" | "reg" | "rel" | "doc"; view?: "list" | "detail"; aluno?: string };

export const Route = createFileRoute("/inclusao")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const tabs = ["hoje", "anam", "plan", "reg", "rel", "doc"] as const;
    const views = ["list", "detail"] as const;
    return {
      tab: tabs.includes(s.tab as never) ? (s.tab as Search["tab"]) : "hoje",
      view: views.includes(s.view as never) ? (s.view as Search["view"]) : "list",
      aluno: typeof s.aluno === "string" ? s.aluno : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Inclusão · PEI e pareceres — AgilizaProf" },
      { name: "description", content: "PEI, anamnese, registros e pareceres descritivos com a Sofia. Conforme Lei 14.254/2021 e BNCC Inclusão." },
      { property: "og:title", content: "Inclusão · PEI e pareceres — AgilizaProf" },
      { property: "og:description", content: "Acompanhamento PCD com PEI institucional, anamnese guiada e pareceres com IA." },
    ],
  }),
  component: Inclusao,
});
