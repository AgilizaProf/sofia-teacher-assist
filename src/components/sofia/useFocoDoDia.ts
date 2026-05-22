import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAgenda } from "@/hooks/useAgenda";
import { useInclusaoStudents } from "@/hooks/useInclusaoStudents";
import type { AgendaEventUI } from "@/lib/db/agenda";
import type { StudentUI } from "@/lib/db/inclusao";

export type FocoAluno = { id: string; nome: string; condicao: string | null };
export type FocoAula = { disciplina: string; quando: string; tempo_restante: string; data_aula: string };
export type FocoSugestao = { tipo: string; tempo_geracao: string; fonte: string };
export type FocoDoDia = {
  exibir: boolean;
  motivo?: "sem_aula" | "sem_alunos" | "ok";
  aluno?: FocoAluno;
  aula?: FocoAula;
  sugestao?: FocoSugestao;
  prompt_pre_preenchido?: string;
};

const JANELA_MIN = 120;

// ─── Tipos do M4 ────────────────────────────────────────────────────────────
type M4Cat = "aulas" | "aval" | "eventos" | "feriados" | "bncc" | "sofia";
type M4UserEvt = {
  id: string;
  cat: M4Cat;
  title: string;
  meta?: string;
  source: "atv" | "pcd" | "m3";
};

function formatTempoRestante(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min}min`;
  const h = Math.round(min / 60);
  return `${h}h`;
}

function quandoLabel(d: Date): string {
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "hoje";
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return "amanhã";
  return d.toLocaleDateString("pt-BR", { weekday: "long" });
}

function todayKey(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ─── Agenda Supabase ─────────────────────────────────────────────────────────
/** Próximo evento de tipo aula/plan dentro de 120 min no Supabase. */
function getProximaAulaAgenda(events: AgendaEventUI[]): AgendaEventUI | null {
  const now = Date.now();
  const limite = now + JANELA_MIN * 60_000;
  const candidatas = events
    .filter((e) => e.type === "aula" || e.type === "plan")
    .map((e) => {
      const iso = e.time ? `${e.date}T${e.time}:00` : `${e.date}T00:00:00`;
      return { ...e, ts: new Date(iso).getTime() };
    })
    .filter((e) => e.ts >= now && e.ts <= limite)
    .sort((a, b) => a.ts - b.ts);
  if (!candidatas.length) return null;
  const { ts: _ts, ...rest } = candidatas[0];
  return rest;
}

// ─── M4 localStorage ─────────────────────────────────────────────────────────
/**
 * Lê atividades planejadas no M4 (Calendário com camadas) para hoje.
 * Retorna apenas categorias pedagógicas: aulas, sofia e atv.
 */
function getAtividadesM4Hoje(): M4UserEvt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("plan_m4_user_events");
    if (!raw) return [];
    const all: Record<string, M4UserEvt[]> = JSON.parse(raw);
    const hoje = todayKey();
    const evtsHoje = all[hoje] ?? [];
    // Filtra categorias relevantes para o card da Sofia
    return evtsHoje.filter((e) =>
      e.cat === "aulas" || e.cat === "sofia" || e.source === "atv" || e.source === "pcd",
    );
  } catch {
    return [];
  }
}

// ─── Seleção de aluno ─────────────────────────────────────────────────────────
function pickAluno(
  students: StudentUI[],
  turmaHint?: string,
): { aluno: StudentUI; razao: "pcd" | "generico" } | null {
  const pool = turmaHint
    ? students.filter((s) => (s.turma || "") === turmaHint)
    : students;
  if (!pool.length) return null;
  const pcd = pool.find(
    (s) =>
      (s.diag && s.diag.trim()) ||
      (s.cid && s.cid !== "nao_informado" && s.cid.trim()),
  );
  if (pcd) return { aluno: pcd, razao: "pcd" };
  return { aluno: pool[0], razao: "generico" };
}

// ─── buildFoco ────────────────────────────────────────────────────────────────
function buildFoco(students: StudentUI[], events: AgendaEventUI[]): FocoDoDia {
  if (!students.length) return { exibir: false, motivo: "sem_alunos" };

  // 1️⃣ Prioridade: aula na agenda do Supabase dentro de 120min
  const aulaAgenda = getProximaAulaAgenda(events);
  if (aulaAgenda) {
    const turmaHint = aulaAgenda.notes?.trim() || undefined;
    const pick = pickAluno(students, turmaHint);
    if (!pick) return { exibir: false, motivo: "sem_alunos" };
    const { aluno, razao } = pick;
    const dataAula = aulaAgenda.time
      ? new Date(`${aulaAgenda.date}T${aulaAgenda.time}:00`)
      : new Date(`${aulaAgenda.date}T00:00:00`);
    const tempoMs = dataAula.getTime() - Date.now();
    const quando = quandoLabel(dataAula);
    const condicao =
      aluno.diag?.trim() ||
      (aluno.cid && aluno.cid !== "nao_informado" ? aluno.cid : null) ||
      null;
    const firstName = aluno.name.split(" ")[0];
    const disciplina = aulaAgenda.title || "aula";
    const fonte = razao === "pcd" ? "no laudo já cadastrado" : "na BNCC";
    return {
      exibir: true,
      motivo: "ok",
      aluno: { id: aluno.id, nome: firstName, condicao },
      aula: {
        disciplina,
        quando,
        tempo_restante: formatTempoRestante(tempoMs),
        data_aula: aulaAgenda.date,
      },
      sugestao: { tipo: "atividade adaptada", tempo_geracao: "2 minutos", fonte },
      prompt_pre_preenchido:
        razao === "pcd"
          ? `Crie uma atividade adaptada para ${aluno.name}${condicao ? ` (${condicao})` : ""} para ${disciplina} de ${quando}, considerando o laudo/PEI cadastrado e mantendo o objetivo da BNCC.`
          : `Crie uma atividade para ${disciplina} de ${quando} alinhada à BNCC.`,
    };
  }

  // 2️⃣ Fallback: atividades planejadas no M4 para hoje
  const m4Hoje = getAtividadesM4Hoje();
  if (m4Hoje.length > 0) {
    const evt = m4Hoje[0];
    const pick = pickAluno(students);
    if (!pick) return { exibir: false, motivo: "sem_alunos" };
    const { aluno, razao } = pick;
    const hoje = new Date();
    const condicao =
      aluno.diag?.trim() ||
      (aluno.cid && aluno.cid !== "nao_informado" ? aluno.cid : null) ||
      null;
    const firstName = aluno.name.split(" ")[0];
    const disciplina = evt.title || "atividade planejada";
    const fonte = razao === "pcd" ? "no laudo já cadastrado" : "no M4 — Calendário";
    const tipo =
      evt.source === "pcd" ? "atividade adaptada (PCD)" :
      evt.cat === "sofia" ? "atividade da Sofia" :
      "atividade planejada";
    return {
      exibir: true,
      motivo: "ok",
      aluno: { id: aluno.id, nome: firstName, condicao },
      aula: {
        disciplina,
        quando: quandoLabel(hoje),
        tempo_restante: "hoje",
        data_aula: todayKey(),
      },
      sugestao: { tipo, tempo_geracao: "2 minutos", fonte },
      prompt_pre_preenchido:
        razao === "pcd"
          ? `Crie uma atividade adaptada para ${aluno.name}${condicao ? ` (${condicao})` : ""} para "${disciplina}" de hoje, considerando o laudo/PEI cadastrado.`
          : `Prepare a atividade "${disciplina}" planejada para hoje no M4. Sugira estratégias e materiais alinhados à BNCC.`,
    };
  }

  return { exibir: false, motivo: "sem_aula" };
}

// ─── Hook principal ───────────────────────────────────────────────────────────
export function useFocoDoDia() {
  const [foco, setFoco] = useState<FocoDoDia>({ exibir: false });
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // ✅ Dados reais do Supabase
  const { students } = useInclusaoStudents();
  const { events } = useAgenda();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) =>
      mounted && setUserId(data.session?.user?.id ?? null),
    );
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setUserId(s?.user?.id ?? null),
    );
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  // Reprocessa a cada 5min + quando M4 muda no localStorage
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5 * 60 * 1000);
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "plan_m4_user_events") setTick((t) => t + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => { clearInterval(id); window.removeEventListener("storage", onStorage); };
  }, []);

  useEffect(() => {
    const next = buildFoco(students, events);
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
  }, [students, events, userId, tick]);

  const dismiss = useCallback(() => {
    if (storageKey) {
      try { window.sessionStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
    }
    setFoco({ exibir: false, motivo: "ok" });
  }, [storageKey]);

  return { foco, dismiss, refetch: () => setTick((t) => t + 1) };
}
Concluído
Cole esse código no GitHub no lugar do anterior. A mensagem do commit pode ser:

feat: useFocoDoDia inclui atividades do M4 no card da Sofia
O que mudou:

A lógica agora tem duas fontes, em ordem de prioridade:

Agenda Supabase — evento do tipo aula ou plan nos próximos 120min (como antes)
M4 fallback — se não tiver nada na agenda, procura atividades planejadas no Calendário com camadas para hoje (categorias: aulas, sofia, atv, pcd)
O card atualiza automaticamente quando a professora adiciona algo no M4.



