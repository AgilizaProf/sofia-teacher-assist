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
    nome: "Professora",
    primeiro_nome: "Professora",
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
      const { data } = await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("user_id", uid)
        .maybeSingle();
      if (!mounted) return;
      const nome =
        (data?.display_name && data.display_name.trim()) ||
        (metaName && metaName.trim()) ||
        (data?.email && data.email.split("@")[0]) ||
        (fallbackEmail && fallbackEmail.split("@")[0]) ||
        "Professora";
      const primeiro = nome.split(" ")[0];
      setAuthUser({ nome, primeiro_nome: primeiro });
    }
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (!u) { setAuthUser(null); return; }
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const metaName =
        (typeof meta.display_name === "string" ? meta.display_name : null) ||
        (typeof meta.name === "string" ? meta.name : null) ||
        (typeof meta.full_name === "string" ? meta.full_name : null);
      loadProfile(u.id, u.email ?? null, metaName);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      const u = s?.user;
      if (!u) { setAuthUser(null); return; }
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const metaName =
        (typeof meta.display_name === "string" ? meta.display_name : null) ||
        (typeof meta.name === "string" ? meta.name : null) ||
        (typeof meta.full_name === "string" ? meta.full_name : null);
      loadProfile(u.id, u.email ?? null, metaName);
    });
    const onProfileUpdate = () => {
      supabase.auth.getSession().then(({ data }) => {
        const u = data.session?.user;
        if (u) loadProfile(u.id, u.email ?? null, null);
      });
    };
    window.addEventListener("sofia:profile-updated", onProfileUpdate);
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      window.removeEventListener("sofia:profile-updated", onProfileUpdate);
    };
  }, []);

  const value = useMemo(() => {
    const base = buildContext(account, route, alunoId);
    if (!authUser) return base;
    return { ...base, user: { ...base.user, nome: authUser.nome, primeiro_nome: authUser.primeiro_nome } };
  }, [account, route, alunoId, tick, authUser]);
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
