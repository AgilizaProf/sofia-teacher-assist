import { createFileRoute } from "@tanstack/react-router";
import { Inclusao } from "@/pages/Inclusao";

type Search = { tab?: "anam" | "pei" | "plan" | "reg" | "rel" | "doc" };

export const Route = createFileRoute("/inclusao")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const t = s.tab;
    const allowed = ["anam", "pei", "plan", "reg", "rel", "doc"] as const;
    return { tab: allowed.includes(t as never) ? (t as Search["tab"]) : "anam" };
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
