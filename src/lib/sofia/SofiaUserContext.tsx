import React, { createContext, useContext, useMemo } from "react";
import { usePersistentState } from "@/lib/persist/usePersistentState";
import { useDashClasses, useDashStudents } from "@/hooks/useDashLegacyData";

// ─────────────────────────────────────────────────────────────────────────────
// SofiaUserContext (Fase 1)
//
// Objetivo: distribuir GLOBALMENTE os dados reais que o usuário logado já
// cadastrou no app, para que a Sofia fale apenas sobre o que existe — nunca
// invente dados. Se um campo estiver vazio, quem consome o contexto deve
// perguntar ao usuário se quer preencher (não fabricar valores).
//
// Fonte de verdade: as MESMAS chaves usadas pelas telas (usePersistentState),
// que já sincronizam com a tabela `app_snapshots` no Supabase (RLS por
// user_id). Assim o contexto é, na prática, "Supabase com RLS" sem duplicar
// estado nem rota de leitura.
// ─────────────────────────────────────────────────────────────────────────────

// ----- Shapes brutos lidos das mesmas chaves usadas pelas telas -----
type DashSchool = { name: string; network: string; stage: string; city: string; uf: string; classes: string };
type AgendaEvent = {
  id?: string;
  date: string;      // YYYY-MM-DD
  title: string;
  type?: string;
  hora?: string;
  notas?: string;
};
type M1Plan = unknown;
type M2Step = { id: string; titulo?: string; status?: string; data?: string; previstaPara?: string };
type Week = unknown;
type M6Entry = { id: string; emoji: string; title: string; text: string; tags: string[]; date: string; turma?: string; atividadeId?: string; atividadeTitulo?: string; alunoIds?: string[] };

// ----- Shapes expostos pelo contexto (normalizados) -----
export type SofiaTurmaInfo = {
  id: string;          // slug estável a partir do nome
  nome: string;
  escola: string;
  ano: string;
  turno: string;
  total_alunos: number;
};

export type SofiaAlunoInfo = {
  id: string;          // slug estável
  nome: string;
  primeiro_nome: string;
  turma: string;
  data_nascimento: string;
  idade: number | null;
  pcd: boolean;
  pcd_codigo: string | null;
  pcd_anotacoes: string;       // observações do cadastro
  observacoes: string[];        // lista mesclada (notes + registros futuros)
};

export type SofiaPlanejamentoInfo = {
  m1_tema: string;
  m1_plan: M1Plan;
  semana: Week;
  m5_turma: string;
  // mapa "YYYY-MM-DD" → status (ok | warn | next)
  diary: Record<string, "ok" | "warn" | "next" | undefined>;
};

export type SofiaSequenciaInfo = {
  steps: M2Step[];
  total: number;
  current_index: number;
  done_count: number;
  pct: number;
  em_andamento: boolean;
};

export type SofiaDiarioInfo = {
  entries: M6Entry[];
  total_no_mes: number;
  meta_mes: number;
  pct_mes: number;
  ultimas_datas: string[];      // formato cru salvo nos registros
};

export type SofiaUserData = {
  hasAnyData: boolean;
  turmas: SofiaTurmaInfo[];
  alunos: SofiaAlunoInfo[];
  alunosPorTurma: Record<string, SofiaAlunoInfo[]>;
  alunosPCD: SofiaAlunoInfo[];
  alunosPCDPorTurma: Record<string, SofiaAlunoInfo[]>;
  planejamento: SofiaPlanejamentoInfo;
  sequencia: SofiaSequenciaInfo;
  diario: SofiaDiarioInfo;
  agenda: AgendaEvent[];
};

const Ctx = createContext<SofiaUserData | null>(null);

// ----- Helpers -----
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function calcAge(birth: string): number | null {
  if (!birth) return null;
  try {
    const d = new Date(birth + "T00:00:00");
    if (Number.isNaN(d.getTime())) return null;
    const diff = Date.now() - d.getTime();
    const age = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
    return age > 0 ? age : null;
  } catch {
    return null;
  }
}

export function SofiaUserDataProvider({ children }: { children: React.ReactNode }) {
  // Fonte única de verdade: tabelas `turmas` e `alunos_inclusao` do Supabase.
  // Os hooks `useDashClasses`/`useDashStudents` adaptam o formato para o
  // mesmo shape que as telas usavam quando liam de `dash_classes`/
  // `dash_students` no localStorage.
  const [schools] = usePersistentState<DashSchool[]>("dash_schools", []);
  const classes = useDashClasses();
  const students = useDashStudents();
  const [agendaEvents] = usePersistentState<AgendaEvent[]>("agenda_events", []);

  // Planejamento
  const [m1Tema] = usePersistentState<string>("plan_m1_tema", "");
  const [m1Plan] = usePersistentState<M1Plan>("plan_m1_plan", null);
  const [week] = usePersistentState<Week>("plan_week", null);
  const [m5Turma] = usePersistentState<string>("plan_m5_turma", "");
  const [diary] = usePersistentState<Record<string, "ok" | "warn" | "next" | undefined>>("plan_diary", {});

  // Sequência didática (M2)
  const [m2Steps] = usePersistentState<M2Step[]>("plan_m2_steps", []);
  const [m2CurIdx] = usePersistentState<number>("plan_m2_cur_idx", 0);

  // Diário de bordo (M6) — leitura "hands-off": para evitar pré-popular com
  // os seeds da Planejamento, lê com array vazio e considera só o que o
  // usuário gravou de fato (não há mistura com mocks).
  const [m6Entries] = usePersistentState<M6Entry[]>("plan_m6_entries", []);

  const value = useMemo<SofiaUserData>(() => {
    // ── Turmas ─────────────────────────────────────────────────────────────
    const turmas: SofiaTurmaInfo[] = classes.map((c) => {
      const totalDecl = parseInt(c.students, 10);
      const cadastrados = students.filter((s) => s.classRef === c.name).length;
      return {
        id: slugify(c.name) || c.name,
        nome: c.name,
        escola: c.school || "",
        ano: c.grade || "",
        turno: c.shift || "",
        total_alunos: Number.isFinite(totalDecl) && totalDecl > 0 ? totalDecl : cadastrados,
      };
    });

    // ── Alunos ─────────────────────────────────────────────────────────────
    const alunos: SofiaAlunoInfo[] = students.map((s) => {
      const isPcd = !!s.pcd && s.pcd !== "nao" && s.pcd !== "nao_informado";
      const primeiro = s.name.split(/\s+/)[0] ?? s.name;
      return {
        id: slugify(`${s.classRef}-${s.name}-${s.createdAt ?? ""}`),
        nome: s.name,
        primeiro_nome: primeiro,
        turma: s.classRef || "",
        data_nascimento: s.birth || "",
        idade: calcAge(s.birth),
        pcd: isPcd,
        pcd_codigo: isPcd ? s.pcd : null,
        pcd_anotacoes: s.notes || "",
        observacoes: s.notes ? [s.notes] : [],
      };
    });

    const alunosPorTurma: Record<string, SofiaAlunoInfo[]> = {};
    const alunosPCDPorTurma: Record<string, SofiaAlunoInfo[]> = {};
    for (const a of alunos) {
      const k = a.turma || "_sem_turma";
      (alunosPorTurma[k] ??= []).push(a);
      if (a.pcd) (alunosPCDPorTurma[k] ??= []).push(a);
    }
    const alunosPCD = alunos.filter((a) => a.pcd);

    // ── Planejamentos ──────────────────────────────────────────────────────
    const planejamento: SofiaPlanejamentoInfo = {
      m1_tema: m1Tema,
      m1_plan: m1Plan,
      semana: week,
      m5_turma: m5Turma,
      diary,
    };

    // ── Sequência didática ─────────────────────────────────────────────────
    const total = m2Steps.length;
    const done = Math.min(m2CurIdx, total);
    const sequencia: SofiaSequenciaInfo = {
      steps: m2Steps,
      total,
      current_index: m2CurIdx,
      done_count: done,
      pct: total === 0 ? 0 : Math.round((done / total) * 100),
      em_andamento: total > 0 && m2CurIdx < total,
    };

    // ── Diário de bordo ────────────────────────────────────────────────────
    const now = new Date();
    const ano = now.getFullYear();
    const mes = now.getMonth();
    // Como `date` no M6 é texto livre ("Hoje · 10:42", "Ontem · 14:10"...),
    // contamos como "do mês" tudo que foi criado no mês corrente. Como não
    // temos timestamp absoluto na entry, usamos parser de id "e-<ts>" quando
    // disponível; senão, contamos como do mês se contém "Hoje"/"Ontem"
    // (heurística leve, suficiente para Fase 1 — Sofia só age se o usuário
    // tiver registros de fato).
    const noMes = m6Entries.filter((e) => {
      const m = /^e-(\d+)/.exec(e.id);
      if (m) {
        const d = new Date(Number(m[1]));
        return d.getFullYear() === ano && d.getMonth() === mes;
      }
      return /^(Hoje|Ontem)/i.test(e.date);
    }).length;
    const metaMes = 22; // mesmo valor exibido em M6 (placeholder configurável)
    const diario: SofiaDiarioInfo = {
      entries: m6Entries,
      total_no_mes: noMes,
      meta_mes: metaMes,
      pct_mes: Math.min(100, Math.round((noMes / Math.max(1, metaMes)) * 100)),
      ultimas_datas: m6Entries.slice(0, 10).map((e) => e.date),
    };

    const hasAnyData =
      turmas.length > 0 ||
      alunos.length > 0 ||
      m6Entries.length > 0 ||
      m2Steps.length > 0 ||
      agendaEvents.length > 0 ||
      !!m1Tema;

    return {
      hasAnyData,
      turmas,
      alunos,
      alunosPorTurma,
      alunosPCD,
      alunosPCDPorTurma,
      planejamento,
      sequencia,
      diario,
      agenda: agendaEvents,
    };
    // schools intencionalmente não está em deps — se quiser expor depois,
    // referenciamos para evitar warning de variável não usada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    classes,
    students,
    agendaEvents,
    m1Tema,
    m1Plan,
    week,
    m5Turma,
    diary,
    m2Steps,
    m2CurIdx,
    m6Entries,
  ]);

  // Mantém referência a `schools` para uso futuro (não quebra build).
  void schools;

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSofiaUserData(): SofiaUserData {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSofiaUserData must be used within <SofiaUserDataProvider>");
  return c;
}

/** Versão tolerante: retorna null quando não há provider acima (SSR / boot). */
export function useSofiaUserDataOptional(): SofiaUserData | null {
  return useContext(Ctx);
}

/**
 * Helper para os consumidores (toasts/sugestões) checarem se devem
 * perguntar ao usuário em vez de inventar dados.
 * Uso típico:
 *   const { isEmpty } = checkField(data.turmas);
 *   if (isEmpty) sofia.ask("Quer cadastrar suas turmas agora?");
 */
export function isFieldEmpty<T>(value: T | T[] | null | undefined): boolean {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "string") return value.trim().length === 0;
  if (typeof value === "object") return Object.keys(value as object).length === 0;
  return false;
}
