import { createFileRoute } from "@tanstack/react-router";
import { Relatorios } from "@/pages/Relatorios";

export const Route = createFileRoute("/relatorios")({
  validateSearch: (s: Record<string, unknown>) => {
    const tabIn = typeof s.tab === "string" ? s.tab : undefined;
    const tab = tabIn && ["all", "todo", "draft", "review", "done"].includes(tabIn)
      ? (tabIn as "all" | "todo" | "draft" | "review" | "done")
      : undefined;
    const turma = typeof s.turma === "string" && s.turma.length > 0 ? s.turma : undefined;
    const pcdIn = typeof s.pcd === "string" ? s.pcd : undefined;
    const pcd = pcdIn === "todos" || pcdIn === "apenas" ? pcdIn : undefined;
    const focusIn = typeof s.focus === "string" ? s.focus : undefined;
    const focus = focusIn === "turmas" || focusIn === "alunos" || focusIn === "pareceres" || focusIn === "horas"
      ? focusIn
      : undefined;
    return { tab, turma, pcd, focus };
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