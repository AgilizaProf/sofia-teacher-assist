import { createFileRoute } from "@tanstack/react-router";
import { Planejamento } from "@/pages/Planejamento";

type MKey = "m1" | "m2" | "m3" | "m4" | "m5" | "m6";
type Search = {
  m?: MKey;
  /** Filtro por tag do diário (M6). */
  tag?: string;
  /** Filtro por turma do diário (M6). */
  turma?: string;
  /** Filtro por nome de aluno mencionado no diário (M6). */
  aluno?: string;
};

export const Route = createFileRoute("/planejamento")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const ms: MKey[] = ["m1", "m2", "m3", "m4", "m5", "m6"];
    const str = (k: string): string | undefined => {
      const v = s[k];
      return typeof v === "string" && v.trim().length > 0 ? v : undefined;
    };
    return {
      m: ms.includes(s.m as MKey) ? (s.m as MKey) : "m5",
      tag: str("tag"),
      turma: str("turma"),
      aluno: str("aluno"),
    };
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
