import type { SofiaNotifAction } from "./notifications";

// ─────────────────────────────────────────────────────────────────────────────
// Deep-links para o Dashboard (rota "/").
//
// Ao clicar em uma notificação criada por estes helpers, a página Dashboard
// lê os search params, rola até a seção certa, destaca-a e abre o modal
// correspondente (turma / aluno / planejamento). Veja o useEffect de
// "open"/"target" em src/pages/Dashboard.tsx.
//
// Estes helpers são usados pela Sofia para vincular cada lembrete a um
// elemento real do painel — nunca inventando dados.
// ─────────────────────────────────────────────────────────────────────────────

export type DashboardOpenTarget = "schools" | "classes" | "students" | "agenda" | "planning";

/** Abre a seção de turmas, opcionalmente focando uma turma específica. */
export function actionOpenTurma(turmaNome?: string, label = "Abrir turma"): SofiaNotifAction {
  return {
    label,
    to: "/",
    search: { open: "classes", target: turmaNome },
  };
}

/** Abre a seção de alunos, opcionalmente focando o aluno por nome. */
export function actionOpenAluno(alunoNome?: string, label = "Ver aluno"): SofiaNotifAction {
  return {
    label,
    to: "/",
    search: { open: "students", target: alunoNome },
  };
}

/** Abre a seção de escolas. */
export function actionOpenEscolas(label = "Ver escolas"): SofiaNotifAction {
  return { label, to: "/", search: { open: "schools" } };
}

/** Abre a agenda do painel. */
export function actionOpenAgenda(label = "Abrir agenda"): SofiaNotifAction {
  return { label, to: "/", search: { open: "agenda" } };
}

/** Vai para a tela de Planejamento, opcionalmente em uma aba específica (m1..m6). */
export function actionOpenPlanejamento(aba?: "m1" | "m2" | "m3" | "m4" | "m5" | "m6", label = "Abrir planejamento"): SofiaNotifAction {
  return {
    label,
    to: "/planejamento",
    search: aba ? { m: aba } : undefined,
  };
}