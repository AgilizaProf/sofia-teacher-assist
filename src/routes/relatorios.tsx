import { createFileRoute } from "@tanstack/react-router";
import { Relatorios } from "@/pages/Relatorios";

export const Route = createFileRoute("/relatorios")({
  // Sanitiza search params: qualquer valor inválido/ausente cai pro padrão
  // (tab=all, sem turma/pcd/focus) sem lançar erro — a página renderiza normalmente.
  validateSearch: (s: Record<string, unknown>): { tab?: "all" | "todo" | "draft" | "review" | "done"; turma?: string; pcd?: "todos" | "apenas"; focus?: "turmas" | "alunos" | "pareceres" | "horas"; range?: "week" } => {
    const safe = (s ?? {}) as Record<string, unknown>;
    const ALLOWED_TABS = ["all", "todo", "draft", "review", "done"] as const;
    type Tab = (typeof ALLOWED_TABS)[number];
    let tab: Tab | undefined;
    let turma: string | undefined;
    let pcd: "todos" | "apenas" | undefined;
    let focus: "turmas" | "alunos" | "pareceres" | "horas" | undefined;
    let range: "week" | undefined;
    try {
      const tabIn = typeof safe.tab === "string" ? safe.tab.trim().toLowerCase() : "";
      if ((ALLOWED_TABS as readonly string[]).includes(tabIn)) tab = tabIn as Tab;
      const turmaIn = typeof safe.turma === "string" ? safe.turma.trim().slice(0, 120) : "";
      if (turmaIn.length > 0) turma = turmaIn;
      const pcdIn = typeof safe.pcd === "string" ? safe.pcd.trim().toLowerCase() : "";
      if (pcdIn === "todos" || pcdIn === "apenas") pcd = pcdIn;
      const focusIn = typeof safe.focus === "string" ? safe.focus.trim().toLowerCase() : "";
      if (focusIn === "turmas" || focusIn === "alunos" || focusIn === "pareceres" || focusIn === "horas") {
        focus = focusIn;
      }
      const rangeIn = typeof safe.range === "string" ? safe.range.trim().toLowerCase() : "";
      if (rangeIn === "week") range = "week";
    } catch (err) {
      console.warn("[/relatorios] search params inválidos, usando padrão:", err);
    }
    return { tab, turma, pcd, focus, range };
  },
  head: () => ({
    meta: [
      { title: "Relatórios · Pareceres descritivos — AgilizaProf" },
      { name: "description", content: "Gerencie pareceres descritivos do bimestre. Gere com a Sofia, revise rascunhos e finalize em minutos." },
      { property: "og:title", content: "Relatórios · Pareceres descritivos — AgilizaProf" },
      { property: "og:description", content: "Pareceres descritivos alinhados à BNCC, gerados com IA e prontos pra revisão." },
    ],
  }),
  component: Relatorios,
});
