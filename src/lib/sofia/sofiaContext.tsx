import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useParams } from "@tanstack/react-router";
import type { SofiaContext, RouteKey, SofiaUser, SofiaAluno, SofiaTurma, ProximaAula, DiaSemana, Periodo } from "./types";
import { getMockAccount, subscribeMockAccount, PRO_DATASET, type MockAccount } from "./mockAccount";
import { supabase } from "@/integrations/supabase/client";

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
  // Fim de bimestre (regra simples: bimestres terminam em mar/jun/ago/dez ~ último dia útil).
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

function buildProximaAula(turma: SofiaTurma | null): ProximaAula | null {
  if (!turma) return null;
  // Mock para conta Pro: "próxima aula" é sempre a próxima hora cheia, disciplina rotativa por dia.
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const disciplinas = ["Português", "Matemática", "Ciências", "História", "Geografia", "Arte"];
  const bnccs = ["EF02LP01", "EF02MA08", "EF02CI03", "EF02HI04", "EF02GE05", "EF15AR02"];
  const idx = d.getDay() % disciplinas.length;
  return {
    disciplina: disciplinas[idx],
    bncc_codigo: bnccs[idx],
    horario: d.toISOString(),
    minutos_ate: Math.max(1, Math.round((d.getTime() - Date.now()) / 60000)),
    turma: turma.nome,
  };
}

function buildContext(account: MockAccount, route: RouteKey, alunoId: string | null): SofiaContext {
  const temp = temporal();
  if (account === "pro_cheio") {
    const turma: SofiaTurma = PRO_DATASET.turma;
    const alunos = PRO_DATASET.alunos as SofiaAluno[];
    const aluno_atual: SofiaAluno | null =
      route === "inclusao" && alunoId ? alunos.find((a) => a.id === alunoId) ?? alunos[0] : null;
    const user: SofiaUser = PRO_DATASET.user;
    return {
      route,
      user,
      entity: {
        turma_atual: turma,
        aluno_atual,
        todos_alunos_pcd: alunos.map((a) => ({ nome: a.primeiro_nome, condicao: a.condicao_label ?? "" })),
      },
      dataState: {
        turmas_count: 1,
        alunos_count: turma.total_alunos,
        pareceres_finalizados: PRO_DATASET.pareceres.finalizados,
        pareceres_total_bimestre: PRO_DATASET.pareceres.total,
        eventos_agenda_mes: PRO_DATASET.eventos_mes,
        proxima_aula: buildProximaAula(turma),
      },
      temporal: temp,
    };
  }
  // free vazio
  const user: SofiaUser = {
    nome: "Educador(a)",
    primeiro_nome: "Educador(a)",
    plano: "free",
    streak_dias: 0,
    horas_economizadas_mes: 0,
    creditos_usados: 0,
    creditos_total: 3000,
  };
  return {
    route,
    user,
    entity: { turma_atual: null, aluno_atual: null, todos_alunos_pcd: [] },
    dataState: {
      turmas_count: 0,
      alunos_count: 0,
      pareceres_finalizados: 0,
      pareceres_total_bimestre: 0,
      eventos_agenda_mes: 0,
      proxima_aula: null,
    },
    temporal: temp,
  };
}

// ----- React context -----
const Ctx = createContext<SofiaContext | null>(null);

export function SofiaContextProvider({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const route = routeKeyOf(loc.pathname);
  // /inclusao usa search param `aluno` para o detail view
  const search = loc.search as Record<string, unknown>;
  const alunoId = typeof search?.aluno === "string" ? search.aluno : null;

  const [account, setAccount] = useState<MockAccount>(() => (typeof window === "undefined" ? "free_vazio" : getMockAccount()));
  const [tick, setTick] = useState(0);
  const [authUser, setAuthUser] = useState<{ nome: string; primeiro_nome: string } | null>(null);
  const [planInfo, setPlanInfo] = useState<{ plano: "free" | "pro"; ciclo: "mensal" | "anual" | null } | null>(null);

  useEffect(() => {
    const unsub = subscribeMockAccount(setAccount);
    const onMutate = () => setTick((t) => t + 1);
    window.addEventListener("sofia:mutate", onMutate);
    const interval = setInterval(() => setTick((t) => t + 1), 60_000); // recalcula minutos_ate
    return () => { unsub(); window.removeEventListener("sofia:mutate", onMutate); clearInterval(interval); };
  }, []);

  // Carrega o nome real do usuário autenticado (perfil do Supabase) para
  // usar no header / saudações da Sofia.
  useEffect(() => {
    let mounted = true;
    async function loadProfile(uid: string, fallbackEmail: string | null, metaName: string | null) {
      type ProfileRow = { display_name: string | null; email: string | null };
      let data: ProfileRow | null = null;
      try {
        const res = await supabase
          .from("profiles")
          .select("display_name, email")
          .eq("user_id", uid)
          .maybeSingle();
        data = (res.data ?? null) as ProfileRow | null;
      } catch (err) {
        // Falha de rede/permissão não pode travar a Sofia — usa fallback.
        console.warn("[SofiaContext] loadProfile falhou, usando fallback:", err);
      }
      if (!mounted) return;
      const nome =
        (data?.display_name && data.display_name.trim()) ||
        (metaName && metaName.trim()) ||
        (data?.email && data.email.split("@")[0]) ||
        (fallbackEmail && fallbackEmail.split("@")[0]) ||
        "Educador(a)";
      const primeiro = nome.split(" ")[0];
      setAuthUser({ nome, primeiro_nome: primeiro });
    }
    async function loadPlan(uid: string) {
      try {
        const { data } = await supabase
          .from("subscriptions")
          .select("plano, ciclo, status, current_period_end")
          .eq("user_id", uid)
          .maybeSingle();
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
    }).catch((err) => {
      console.warn("[SofiaContext] getSession falhou:", err);
      if (mounted) setAuthUser(null);
    });
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
      console.warn("[SofiaContext] onAuthStateChange falhou ao registrar:", err);
    }
    const onProfileUpdate = () => {
      supabase.auth.getSession().then(({ data }) => {
        const u = data.session?.user;
        if (u) { loadProfile(u.id, u.email ?? null, null); loadPlan(u.id); }
      }).catch(() => { /* ignore */ });
    };
    window.addEventListener("sofia:profile-updated", onProfileUpdate);
    const onPlanUpdate = () => {
      supabase.auth.getSession().then(({ data }) => {
        const u = data.session?.user;
        if (u) loadPlan(u.id);
      }).catch(() => { /* ignore */ });
    };
    window.addEventListener("sofia:plan-updated", onPlanUpdate);
    return () => {
      mounted = false;
      try { sub?.subscription.unsubscribe(); } catch { /* ignore */ }
      window.removeEventListener("sofia:profile-updated", onProfileUpdate);
      window.removeEventListener("sofia:plan-updated", onPlanUpdate);
    };
  }, []);

  const value = useMemo(() => {
    const base = buildContext(account, route, alunoId);
    const user = { ...base.user };
    if (authUser) {
      user.nome = authUser.nome;
      user.primeiro_nome = authUser.primeiro_nome;
    }
    if (planInfo) {
      user.plano = planInfo.plano;
      user.ciclo = planInfo.ciclo;
    }
    return { ...base, user };
  }, [account, route, alunoId, tick, authUser, planInfo]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSofiaContext(): SofiaContext {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSofiaContext must be used within <SofiaContextProvider>");
  return c;
}

export function notifySofiaMutation() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("sofia:mutate"));
}
