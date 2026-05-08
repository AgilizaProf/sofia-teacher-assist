/**
 * Activity log — registro persistente das ações reais do professor.
 *
 * Outras telas chamam `logActivity(...)` quando algo importante acontece
 * (parecer gerado, planejamento finalizado, atividade adaptada, aluno
 * cadastrado, documento exportado). O Dashboard consome via
 * `useActivityFeed()` e mescla com itens derivados de outras chaves
 * persistidas que já carregam timestamp (alunos, agenda).
 */
import { useEffect, useMemo, useState } from "react";
import { usePersistentState } from "@/lib/persist/usePersistentState";

export type ActivityType =
  | "parecer"
  | "planejamento"
  | "adaptacao"
  | "aluno"
  | "exportacao";

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  ts: string; // ISO
  description: string;
  detail?: string;
}

const LS_KEY = "aprof:activity_log";
const MAX_ENTRIES = 200;

/** Append-only logger usado por outras telas. Seguro em SSR (no-op). */
export function logActivity(entry: Omit<ActivityEntry, "id" | "ts"> & { id?: string; ts?: string }): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    const current: ActivityEntry[] = raw ? (JSON.parse(raw) as ActivityEntry[]) : [];
    const list = Array.isArray(current) ? current : [];
    const full: ActivityEntry = {
      id: entry.id ?? `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: entry.ts ?? new Date().toISOString(),
      type: entry.type,
      description: entry.description,
      detail: entry.detail,
    };
    const next = [full, ...list].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(LS_KEY, JSON.stringify(next));
    window.localStorage.setItem(LS_KEY + ":ts", String(Date.now()));
    // Notifica listeners (outras abas + mesmo tab via custom event).
    window.dispatchEvent(new CustomEvent("aprof:activity"));
  } catch (err) {
    console.warn("[activityLog] falha ao registrar:", err);
  }
}

type DashStudent = { name: string; classRef?: string; createdAt?: string };
type AgendaEvent = { id: string; date: string; title: string; type?: string };

/**
 * Hook do feed: combina o log explícito + itens derivados (alunos com
 * `createdAt`, eventos da agenda já passados) e devolve em ordem decrescente.
 */
export function useActivityFeed() {
  const [logged] = usePersistentState<ActivityEntry[]>("activity_log", []);
  const [students] = usePersistentState<DashStudent[]>("dash_students", []);
  const [events] = usePersistentState<AgendaEvent[]>("agenda_events", []);
  const [tick, setTick] = useState(0);

  // Reage a logs feitos no mesmo tab (sem precisar recarregar).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onChange = () => setTick((t) => t + 1);
    window.addEventListener("aprof:activity", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("aprof:activity", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return useMemo(() => {
    const safeLogged: ActivityEntry[] = Array.isArray(logged) ? logged : [];
    const safeStudents: DashStudent[] = Array.isArray(students) ? students : [];
    const safeEvents: AgendaEvent[] = Array.isArray(events) ? events : [];

    const derived: ActivityEntry[] = [];

    // Alunos cadastrados (usa createdAt quando disponível).
    for (const s of safeStudents) {
      if (!s?.name || !s?.createdAt) continue;
      derived.push({
        id: `derived-aluno-${s.createdAt}-${s.name}`,
        type: "aluno",
        ts: s.createdAt,
        description: `Aluno cadastrado: ${s.name}`,
        detail: s.classRef ? `Turma ${s.classRef}` : undefined,
      });
    }

    // Eventos da agenda já realizados (data passada) — vira "registro".
    const todayISO = new Date().toISOString().slice(0, 10);
    for (const e of safeEvents) {
      if (!e?.date || !e?.title || e.date >= todayISO) continue;
      derived.push({
        id: `derived-agenda-${e.id}`,
        type: e.type === "report" ? "exportacao" : e.type === "plan" ? "planejamento" : "parecer",
        ts: `${e.date}T12:00:00.000Z`,
        description: e.title,
        detail: "Agenda concluída",
      });
    }

    // Dedup por id e ordena desc.
    const seen = new Set<string>();
    const all = [...safeLogged, ...derived]
      .filter((e) => e && e.id && !seen.has(e.id) && (seen.add(e.id), true))
      .sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));

    // "Esta semana" = últimos 7 dias.
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const week = all.filter((e) => {
      const t = Date.parse(e.ts);
      return Number.isFinite(t) && t >= weekAgo;
    });

    return { all, week };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logged, students, events, tick]);
}

/** Formata "há 2h", "ontem", "há 3d", "agora há pouco". */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora há pouco";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const days = Math.floor(h / 24);
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `há ${weeks} sem`;
  return new Date(t).toLocaleDateString("pt-BR");
}