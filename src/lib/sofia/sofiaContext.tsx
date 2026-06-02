import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import type { SofiaContext, RouteKey, SofiaUser, SofiaAluno, DiaSemana, Periodo } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { useSofiaUserDataOptional } from "@/lib/sofia/SofiaUserContext";
import { inferirNivelEnsino } from "@/lib/sofia/nivelEnsino";

// ----- Helpers -----
function routeKeyOf(path: string): RouteKey {
  if (path.startsWith("/inclusao")) return "inclusao";
  if (path.startsWith("/planejamento")) return "planejamento";
  if (path.startsWith("/relatorios")) return "relatorios";
  if (path.startsWith("/agenda")) return "agenda";
  if (path.startsWith("/assistente")) return "assistente";
  if (path.startsWith("/configuracoes")) return "configuracoes";
  return "home";
}

function temporal(): SofiaContext["temporal"] {
  const d = new Date();
  const dias: DiaSemana[] = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
  const h = d.getHours();
  const periodo: Periodo = h < 12 ? "manha" : h < 18 ? "tarde" : "noite";
  const fimBim = [2, 5, 7, 11].map((m) => new Date(d.getFullYear(), m + 1, 0));
  const proxFim = fimBim.find((x) => x.getTime() >= d.getTime());
  const fim_de_bimestre_em_dias = proxFim
    ? Math.ceil((proxFim.getTime() - d.getTime()) / 86400000)
    : null;
  return {
    dia_semana: dias[d.getDay()],
    hora_local: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    periodo,
    fim_de_bimestre_em_dias,
    eh_inicio_de_mes: d.getDate() <= 5,
  };
}

// ----- React context -----
const Ctx = createContext<SofiaContext | null>(null);

export function SofiaContextProvider({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const route = routeKeyOf(loc.pathname);

  const [authUser, setAuthUser] = useState<{ nome: string; primeiro_nome: string } | null>(null);
  const [planInfo, setPlanInfo] = useState<{ plano: "free" | "pro"; ciclo: "mensal" | "anual" | null } | null>(null);
  const [tick, setTick] = useState(0);
  // Aluno em foco — estado real (antes era mutado direto no objeto memoizado,
  // o que dependia de re-renders incidentais e era apagado pelo tick de 60s).
  const [alunoAtual, setAlunoAtual] = useState<SofiaAluno | null>(null);

  // ✅ Dados reais do Supabase
  const userData = useSofiaUserDataOptional();

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Carrega nome e plano do usuário autenticado
  useEffect(() => {
    let mounted = true;

    async function loadProfile(uid: string, fallbackEmail: string | null, metaName: string | null) {
      type ProfileRow = { display_name: string | null; email: string | null };
      let data: ProfileRow | null = null;
      try {
        const res = await supabase.from("profiles").select("display_name, email").eq("user_id", uid).maybeSingle();
        data = (res.data ?? null) as ProfileRow | null;
      } catch (err) {
        console.warn("[SofiaContext] loadProfile falhou:", err);
      }
      if (!mounted) return;
      const nome =
        (data?.display_name && data.display_name.trim()) ||
        (metaName && metaName.trim()) ||
        (data?.email && data.email.split("@")[0]) ||
        (fallbackEmail && fallbackEmail.split("@")[0]) ||
        "Educador(a)";
      setAuthUser({ nome, primeiro_nome: nome.split(" ")[0] });
    }

    async function loadPlan(uid: string) {
      try {
        const { data } = await supabase.from("subscriptions").select("plano, ciclo, status, current_period_end").eq("user_id", uid).maybeSingle();
        if (!mounted) return;
        const row = data as { plano?: string; ciclo?: string | null; status?: string; current_period_end?: string | null } | null;
        const stillValid = !row?.current_period_end || new Date(row.current_period_end) > new Date();
        const isPro = row?.plano === "pro" && row?.status === "active" && stillValid;
        const ciclo: "mensal" | "anual" | null = isPro && (row?.ciclo === "mensal" || row?.ciclo === "anual") ? row!.ciclo as "mensal" | "anual" : null;
        setPlanInfo({ plano: isPro ? "pro" : "free", ciclo });
      } catch (err) {
        console.warn("[SofiaContext] loadPlan falhou:", err);
        if (mounted) setPlanInfo({ plano: "free", ciclo: null });
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (!u) { setAuthUser(null); setPlanInfo(null); return; }
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const metaName =
        (typeof meta.display_name === "string" ? meta.display_name : null) ||
        (typeof meta.name === "string" ? meta.name : null) ||
        (typeof meta.full_name === "string" ? meta.full_name : null);
      loadProfile(u.id, u.email ?? null, metaName);
      loadPlan(u.id);
    }).catch(() => { if (mounted) setAuthUser(null); });

    let sub: { subscription: { unsubscribe: () => void } } | null = null;
    try {
      const res = supabase.auth.onAuthStateChange((_e, s) => {
        const u = s?.user;
        if (!u) { setAuthUser(null); setPlanInfo(null); return; }
        const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
        const metaName =
          (typeof meta.display_name === "string" ? meta.display_name : null) ||
          (typeof meta.name === "string" ? meta.name : null) ||
          (typeof meta.full_name === "string" ? meta.full_name : null);
        loadProfile(u.id, u.email ?? null, metaName);
        loadPlan(u.id);
      });
      sub = res.data;
    } catch (err) {
      console.warn("[SofiaContext] onAuthStateChange falhou:", err);
    }

    const onProfileUpdate = () => {
      supabase.auth.getSession().then(({ data }) => {
        const u = data.session?.user;
        if (u) loadProfile(u.id, u.email ?? null, null);
      }).catch(() => {});
    };
    const onPlanUpdate = () => {
      supabase.auth.getSession().then(({ data }) => {
        const u = data.session?.user;
        if (u) loadPlan(u.id);
      }).catch(() => {});
    };
    window.addEventListener("sofia:profile-updated", onProfileUpdate);
    window.addEventListener("sofia:plan-updated", onPlanUpdate);

    return () => {
      mounted = false;
      try { sub?.subscription.unsubscribe(); } catch { /* ignore */ }
      window.removeEventListener("sofia:profile-updated", onProfileUpdate);
      window.removeEventListener("sofia:plan-updated", onPlanUpdate);
    };
  }, []);

  const value = useMemo<SofiaContext>(() => {
    const temp = temporal();

    // ── Usuário ──────────────────────────────────────────────────────────
    const user: SofiaUser = {
      nome: authUser?.nome ?? "Educador(a)",
      primeiro_nome: authUser?.primeiro_nome ?? "Educador(a)",
      plano: planInfo?.plano ?? "free",
      ciclo: planInfo?.ciclo ?? null,
      streak_dias: 0,
      horas_economizadas_mes: 0,
      creditos_usados: 0,
      creditos_total: 3000,
    };

    // ── Dados reais do Supabase ─────────────────────────────────────────
    if (!userData) {
      // Ainda carregando — retorna contexto mínimo sem mock
      return {
        route,
        user,
        entity: { turma_atual: null, aluno_atual: alunoAtual, todos_alunos_pcd: [] },
        dataState: { turmas_count: 0, alunos_count: 0, pareceres_finalizados: 0, pareceres_total_bimestre: 0, eventos_agenda_mes: 0, proxima_aula: null },
        temporal: temp,
        setAlunoAtual,
      };
    }

    const turmas = userData.turmas;
    const alunos = userData.alunos;
    const alunosPCD = userData.alunosPCD;

    // Turma atual: primeira turma cadastrada (ou null)
    const primeiraTurma = turmas[0] ?? null;
    const turma_atual = primeiraTurma
      ? {
          id: primeiraTurma.id,
          nome: primeiraTurma.nome,
          ano: primeiraTurma.ano || "",
          total_alunos: primeiraTurma.total_alunos,
        }
      : null;

    // Nível de ensino para o routeContext
    const nivel = turma_atual
      ? inferirNivelEnsino(turma_atual.ano) ?? inferirNivelEnsino(turma_atual.nome)
      : null;

    // Todos alunos PCD com nome e condição
    const todos_alunos_pcd = alunosPCD.map((a) => ({
      nome: a.primeiro_nome,
      condicao: a.pcd_codigo ?? "",
    }));

    // Agenda do mês (conta eventos do mês corrente)
    const agora = new Date();
    const eventos_agenda_mes = (userData.agenda ?? []).filter((e) => {
      try {
        const d = new Date(e.date);
        return d.getFullYear() === agora.getFullYear() && d.getMonth() === agora.getMonth();
      } catch { return false; }
    }).length;

    return {
      route,
      user,
      entity: {
        turma_atual,
        aluno_atual: alunoAtual,
        todos_alunos_pcd,
        nivel_ensino: nivel,
      },
      dataState: {
        turmas_count: turmas.length,
        alunos_count: alunos.length,
        pareceres_finalizados: 0,
        pareceres_total_bimestre: alunos.length,
        eventos_agenda_mes,
        proxima_aula: null,
      },
      temporal: temp,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, authUser, planInfo, userData, tick]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSofiaContext(): SofiaContext {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSofiaContext must be used within <SofiaContextProvider>");
  return c;
}

export function useSofiaContextOptional(): SofiaContext | null {
  return useContext(Ctx);
}

export function notifySofiaMutation() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("sofia:mutate"));
}
