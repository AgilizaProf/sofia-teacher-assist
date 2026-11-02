import type { SofiaNotifAction } from "./notifications";

// ─────────────────────────────────────────────────────────────────────────────
// Deep-links das notificações da Sofia. A antiga "Minha sala" saiu do app:
// escolas e turmas ficam em Configurações, alunos em Inclusão e a agenda
// na própria Agenda.
//
// Estes helpers são usados pela Sofia para vincular cada lembrete a um
// elemento real do painel — nunca inventando dados.
// ─────────────────────────────────────────────────────────────────────────────

export type DashboardOpenTarget = "schools" | "classes" | "students" | "agenda" | "planning";

/** Abre a seção de turmas, opcionalmente focando uma turma específica. */
export function actionOpenTurma(turmaNome?: string, label = "Abrir turma"): SofiaNotifAction {
  return {
    label,
    to: "/configuracoes",
    search: turmaNome ? { turma: turmaNome } : undefined,
  };
}

/** Abre a seção de alunos, opcionalmente focando o aluno por nome. */
export function actionOpenAluno(alunoNome?: string, label = "Ver aluno"): SofiaNotifAction {
  return {
    label,
    to: "/inclusao",
    search: alunoNome ? { aluno: alunoNome } : undefined,
  };
}

/**
 * Abre o Dashboard no contexto de um momento PCD (M1, M3 ou M5).
 * Filtra a lista de alunos por PCD e exibe um banner contextual.
 * Se `alunoNome` for passado, abre também o detalhe do aluno.
 */
export function actionOpenAlunoNoMomento(
  momento: "m1" | "m3" | "m5",
  alunoNome?: string,
  label = "Ver no painel",
): SofiaNotifAction {
  return {
    label,
    to: "/inclusao",
    search: alunoNome ? { aluno: alunoNome, m: momento } : { m: momento },
  };
}

/** Abre a seção de escolas. */
export function actionOpenEscolas(label = "Ver escolas"): SofiaNotifAction {
  return { label, to: "/configuracoes" };
}

/** Abre a agenda do painel. */
export function actionOpenAgenda(label = "Abrir agenda"): SofiaNotifAction {
  return { label, to: "/agenda" };
}

/**
 * Vai para a tela de Planejamento, opcionalmente em uma aba específica.
 * Use a numeração que o usuário enxerga na UI ("m1".."m7"). A rota
 * normaliza para a chave interna correta — ou seja, "m3" sempre abre
 * a aba M3 do Planejamento, "m1" sempre abre M1, etc.
 */
export function actionOpenPlanejamento(
  aba?: "m1" | "m2" | "m3" | "m4" | "m5" | "m6" | "m7",
  label = "Abrir planejamento",
): SofiaNotifAction {
  return {
    label,
    to: "/planejamento",
    search: aba ? { m: aba } : undefined,
  };
}

/**
 * Abre o diário (M6) já filtrado por tag, turma e/ou aluno citado.
 * Sofia usa estes deep-links no card de resumo semanal e em alertas
 * relacionados a um padrão específico.
 */
export function actionOpenDiarioFiltrado(
  filtro: { tag?: string; turma?: string; aluno?: string },
  label = "Abrir diário",
): SofiaNotifAction {
  const search: Record<string, string | number | undefined> = { m: "m6" };
  if (filtro.tag) search.tag = filtro.tag;
  if (filtro.turma) search.turma = filtro.turma;
  if (filtro.aluno) search.aluno = filtro.aluno;
  return { label, to: "/planejamento", search };
}