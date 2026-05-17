import { createFileRoute } from "@tanstack/react-router";
import { Planejamento } from "@/pages/Planejamento";
import { sanitizeFilter } from "@/lib/sofia/m6Filters";

// Sanitização compartilhada vive em @/lib/sofia/m6Filters — também é
// reaproveitada pela página ao restaurar o estado persistido em localStorage.

type MKey = "atv" | "pcd" | "m1" | "m4" | "m5" | "m6" | "trilhas";
type Search = {
  m?: MKey;
  /** Filtro por tag do diário (M6). */
  tag?: string;
  /** Filtro por turma do diário (M6). */
  turma?: string;
  /** Filtro por nome de aluno mencionado no diário (M6). */
  aluno?: string;
};

// Mapa "rótulo visível para o usuário (M1..M7)" → chave interna da aba.
// Permite que qualquer deep-link da Sofia ou do Dashboard use a numeração
// que o usuário enxerga ("Ir a M3" abre a aba M3, e não a aba interna m1).
// As chaves internas continuam aceitas para retrocompatibilidade.
const UI_TO_INTERNAL: Record<string, MKey> = {
  m1: "atv",
  m2: "pcd",
  m3: "m1",
  m4: "m4",
  m5: "m5",
  m6: "m6",
  m7: "trilhas",
};
const INTERNAL_KEYS: MKey[] = ["atv", "pcd", "m1", "m4", "m5", "m6", "trilhas"];

export function normalizePlanejamentoTab(raw: unknown): MKey {
  if (typeof raw !== "string") return "atv";
  const key = raw.toLowerCase();
  // Rótulo visível tem prioridade — é o que o usuário clica.
  if (key in UI_TO_INTERNAL) return UI_TO_INTERNAL[key];
  if ((INTERNAL_KEYS as string[]).includes(key)) return key as MKey;
  return "atv";
}

export const Route = createFileRoute("/planejamento")({
  validateSearch: (s: Record<string, unknown>): Search => {
    return {
      m: normalizePlanejamentoTab(s.m),
      tag: sanitizeFilter(s.tag),
      turma: sanitizeFilter(s.turma),
      aluno: sanitizeFilter(s.aluno),
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
