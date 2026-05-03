import { createFileRoute } from "@tanstack/react-router";
import { Planejamento } from "@/pages/Planejamento";

type MKey = "m1" | "m2" | "m3" | "m4" | "m5" | "m6";
type Search = { m?: MKey };

export const Route = createFileRoute("/planejamento")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const ms: MKey[] = ["m1", "m2", "m3", "m4", "m5", "m6"];
    return { m: ms.includes(s.m as MKey) ? (s.m as MKey) : "m5" };
  },
  head: () => ({
    meta: [
      { title: "Planejamento · Drag & drop e replicar — AgilizaProf" },
      { name: "description", content: "Planeje a semana com Sofia: arraste atividades entre dias, replique em outras turmas e ajuste em segundos." },
      { property: "og:title", content: "Planejamento · AgilizaProf" },
      { property: "og:description", content: "Drag & drop entre dias + replicar em N turmas. Choveu? Arrasta. Deu certo? Replica." },
    ],
  }),
  component: Planejamento,
});
