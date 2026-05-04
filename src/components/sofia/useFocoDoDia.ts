import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FocoAluno = { id: string; nome: string; condicao: string | null };
export type FocoAula = { disciplina: string; quando: string; tempo_restante: string; data_aula: string };
export type FocoSugestao = { tipo: string; tempo_geracao: string; fonte: string };
/**
 * CONTRATO DA RESPOSTA — idêntico ao que uma futura server route
 * `GET /api/sofia/foco-do-dia` deverá devolver. Não adicione/renomeie
 * campos sem atualizar o server e o componente <SofiaFocoCard /> juntos.
 */
export type FocoDoDia = {
  exibir: boolean;
  motivo?: "sem_aula" | "sem_alunos" | "ok";
  aluno?: FocoAluno;
  aula?: FocoAula;
  sugestao?: FocoSugestao;
  prompt_pre_preenchido?: string;
};

type Student = {
  id: string;
  name: string;
  turma?: string;
  diag?: string;     // diagnóstico/laudo (texto curto, ex.: "TDAH")
  cid?: string;
  pareceresPendentes?: number;
  diarioAtencao?: boolean;
  adaptacaoFeitaPara?: string[]; // ids de aulas já adaptadas
};

type AgendaEvento = {
  id: string;
  tipo: string;            // "aula" | "evento" | ...
  disciplina?: string;
  turma?: string;
  inicio_em: string;       // ISO
};

const JANELA_MIN = 120;

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function formatTempoRestante(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min}min`;
  const h = Math.round(min / 60);
  return `${h}h`;
}

function quandoLabel(d: Date): string {
  const now = new Date();
  const isSameDay = d.toDateString() === now.toDateString();
  if (isSameDay) return "hoje";
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return "amanhã";
  return d.toLocaleDateString("pt-BR", { weekday: "long" });
}

/** Mock de agenda: lê de localStorage `agenda_eventos`. Se vazio, gera uma
 *  aula sintética para a próxima hora cheia, usando a primeira turma cadastrada. */
function getProximaAula(students: Student[]): AgendaEvento | null {
  const ag = readJSON<AgendaEvento[]>("agenda_eventos", []);
  const now = Date.now();
  const limite = now + JANELA_MIN * 60_000;
  const candidata = ag
    .filter((e) => e.tipo === "aula")
    .map((e) => ({ ...e, ts: new Date(e.inicio_em).getTime() }))
    .filter((e) => e.ts >= now && e.ts <= limite)
    .sort((a, b) => a.ts - b.ts)[0];
  if (candidata) {
    const { ts: _ts, ...rest } = candidata;
    return rest;
  }
  // Fallback sintético — próxima hora cheia, usa primeira turma com aluno PCD.
  if (students.length === 0) return null;
  const next = new Date();
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  const turma = students[0].turma || "Turma";
  return {
    id: `synth_${next.getTime()}`,
    tipo: "aula",
    disciplina: "matemática",
    turma,
    inicio_em: next.toISOString(),
  };
}

function pickAluno(students: Student[], aulaId: string, turma?: string): { aluno: Student; razao: "pcd" | "atencao" | "parecer" | "generico" } | null {
  const pool = turma ? students.filter((s) => (s.turma || "") === turma) : students;
  if (!pool.length) return null;
  // a) PCD com laudo, sem adaptação para esta aula
  const pcd = pool.find((s) => (s.diag || s.cid) && !(s.adaptacaoFeitaPara || []).includes(aulaId));
  if (pcd) return { aluno: pcd, razao: "pcd" };
  // b) atenção no diário
  const atn = pool.find((s) => s.diarioAtencao);
  if (atn) return { aluno: atn, razao: "atencao" };
  // c) parecer pendente
  const par = pool.find((s) => (s.pareceresPendentes || 0) > 0);
  if (par) return { aluno: par, razao: "parecer" };
  return { aluno: pool[0], razao: "generico" };
}

/**
 * TODO: migrar para createServerFn quando alunos/agenda forem para o Supabase.
 *
 * Contrato esperado da futura server route `GET /api/sofia/foco-do-dia`
 * (createServerFn({ method: "GET" }) com middleware `requireSupabaseAuth`):
 *
 *   Input  — nenhum (usa o usuário autenticado para resolver alunos/agenda).
 *   Output — `FocoDoDia` (vide tipo acima). Mesmas chaves, mesmos tipos.
 *            • `exibir: false` quando não houver aula na janela de 120min,
 *              quando o professor não tiver alunos ou quando a sugestão já
 *              tiver sido dispensada na sessão (controle anti-repetição
 *              continua sendo do cliente, via sessionStorage).
 *            • `aluno`, `aula`, `sugestao`, `prompt_pre_preenchido` populados
 *              somente quando `exibir: true`.
 *
 * Quando migrar:
 *   1. Mover esta função para `src/server/sofia-foco.server.ts` com a mesma
 *      assinatura, lendo `students`/`agenda` via `supabase` do middleware.
 *   2. Trocar `useFocoDoDia` para usar `useQuery({ queryFn: getFocoDoDia })`
 *      mantendo o mesmo shape de retorno — nenhum componente da UI muda.
 *   3. O cliente continua dono do dismiss (sessionStorage `sofia_foco_dismissed_*`).
 */
function buildFoco(students: Student[]): FocoDoDia {
  if (students.length === 0) return { exibir: false, motivo: "sem_alunos" };
  const aula = getProximaAula(students);
  if (!aula) return { exibir: false, motivo: "sem_aula" };
  const pick = pickAluno(students, aula.id, aula.turma);
  if (!pick) return { exibir: false, motivo: "sem_alunos" };
  const { aluno, razao } = pick;
  const dataAula = new Date(aula.inicio_em);
  const tempoMs = dataAula.getTime() - Date.now();
  const tempo_restante = formatTempoRestante(tempoMs);
  const quando = quandoLabel(dataAula);
  const condicao = aluno.diag || (aluno.cid && aluno.cid !== "nao_informado" ? aluno.cid : null);
  const firstName = aluno.name.split(" ")[0];

  const tipo =
    razao === "pcd" ? "atividade adaptada" :
    razao === "atencao" ? "observação no diário" :
    razao === "parecer" ? "revisão de parecer" :
    "atividade adaptada";
  const tempo_geracao = razao === "parecer" ? "1 minuto" : "2 minutos";
  const fonte =
    razao === "pcd" ? "no laudo já cadastrado" :
    razao === "atencao" ? "no histórico do aluno" :
    razao === "parecer" ? "no PEI ativo" :
    "na BNCC";

  const disciplina = aula.disciplina || "aula";
  const prompt_pre_preenchido =
    razao === "parecer"
      ? `Revise o parecer pendente do(a) aluno(a) ${aluno.name}${condicao ? ` (${condicao})` : ""}, considerando o PEI e o histórico.`
      : razao === "atencao"
      ? `Sugira uma observação para o diário do(a) aluno(a) ${aluno.name} para a aula de ${disciplina} de ${quando}, com base no histórico recente.`
      : `Crie uma ${tipo} para o(a) aluno(a) ${aluno.name}${condicao ? ` (${condicao})` : ""} para a aula de ${disciplina} de ${quando}, considerando o laudo/PEI já cadastrado e mantendo o objetivo da BNCC.`;

  return {
    exibir: true,
    motivo: "ok",
    aluno: { id: aluno.id, nome: firstName, condicao },
    aula: { disciplina, quando, tempo_restante, data_aula: dataAula.toISOString().slice(0, 10) },
    sugestao: { tipo, tempo_geracao, fonte },
    prompt_pre_preenchido,
  };
}

export function useFocoDoDia() {
  const [foco, setFoco] = useState<FocoDoDia>({ exibir: false });
  // `storageKey` é estado puramente do cliente (anti-repetição via sessionStorage)
  // e por isso fica FORA do contrato `FocoDoDia` que será espelhado pelo server.
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => mounted && setUserId(data.session?.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  // refetch a cada 5 minutos + escuta de mudanças no localStorage
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5 * 60 * 1000);
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "inc_students" || e.key === "agenda_eventos") setTick((t) => t + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => { clearInterval(id); window.removeEventListener("storage", onStorage); };
  }, []);

  useEffect(() => {
    const students = readJSON<Student[]>("inc_students", []);
    const next = buildFoco(students);
    if (next.exibir && next.aluno && next.aula && userId) {
      const key = `sofia_foco_dismissed_${userId}_${next.aluno.id}_${next.aula.data_aula}`;
      setStorageKey(key);
      try {
        if (window.sessionStorage.getItem(key)) {
          setFoco({ exibir: false, motivo: "ok" });
          return;
        }
      } catch { /* ignore */ }
    } else {
      setStorageKey(null);
    }
    setFoco(next);
  }, [userId, tick]);

  const dismiss = useCallback(() => {
    if (storageKey) {
      try { window.sessionStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
    }
    setFoco({ exibir: false, motivo: "ok" });
  }, [storageKey]);

  return { foco, dismiss, refetch: () => setTick((t) => t + 1) };
}