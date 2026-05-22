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
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return "amanhã";
  return d.toLocaleDateString("pt-BR", { weekday: "long" });
}

/** Retorna o próximo evento do tipo "aula" ou "plan" dentro da janela de 120 min. */
function getProximaAula(events: AgendaEventUI[]): AgendaEventUI | null {
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

/** Escolhe o aluno mais relevante da turma para destacar no card. */
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

function buildFoco(students: StudentUI[], events: AgendaEventUI[]): FocoDoDia {
  if (!students.length) return { exibir: false, motivo: "sem_alunos" };
  const aula = getProximaAula(events);
  if (!aula) return { exibir: false, motivo: "sem_aula" };

  const turmaHint = aula.notes?.trim() || undefined;
  const pick = pickAluno(students, turmaHint);
  if (!pick) return { exibir: false, motivo: "sem_alunos" };

  const { aluno, razao } = pick;
  const dataAula = aula.time
    ? new Date(`${aula.date}T${aula.time}:00`)
    : new Date(`${aula.date}T00:00:00`);
  const tempoMs = dataAula.getTime() - Date.now();
  const tempo_restante = formatTempoRestante(tempoMs);
  const quando = quandoLabel(dataAula);
  const condicao =
    aluno.diag?.trim() ||
    (aluno.cid && aluno.cid !== "nao_informado" ? aluno.cid : null) ||
    null;
  const firstName = aluno.name.split(" ")[0];
  const disciplina = aula.title || "aula";

  const tipo = "atividade adaptada";
  const tempo_geracao = "2 minutos";
  const fonte = razao === "pcd" ? "no laudo já cadastrado" : "na BNCC";

  const prompt_pre_preenchido =
    razao === "pcd"
      ? `Crie uma atividade adaptada para o(a) aluno(a) ${aluno.name}${condicao ? ` (${condicao})` : ""} para ${disciplina} de ${quando}, considerando o laudo/PEI cadastrado e mantendo o objetivo da BNCC.`
      : `Crie uma atividade para ${disciplina} de ${quando} alinhada à BNCC.`;

  return {
    exibir: true,
    motivo: "ok",
    aluno: { id: aluno.id, nome: firstName, condicao },
    aula: { disciplina, quando, tempo_restante, data_aula: aula.date },
    sugestao: { tipo, tempo_geracao, fonte },
    prompt_pre_preenchido,
  };
}

export function useFocoDoDia() {
  const [foco, setFoco] = useState<FocoDoDia>({ exibir: false });
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // ✅ Dados reais do Supabase — sem localStorage
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
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
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
  }, [students, events, userId]);

  const dismiss = useCallback(() => {
    if (storageKey) {
      try { window.sessionStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
    }
    setFoco({ exibir: false, motivo: "ok" });
  }, [storageKey]);

  return { foco, dismiss, refetch: () => {} };
}
