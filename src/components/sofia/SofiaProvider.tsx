import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  askSofia,
  listSofiaConversations,
  getSofiaConversation,
  deleteSofiaConversation,
  clearSofiaConversations,
} from "@/lib/sofia.functions";
import { useSofiaContextOptional } from "@/lib/sofia/sofiaContext";
import { inferirNivelEnsino } from "@/lib/sofia/nivelEnsino";
import { reportError } from "@/lib/admin/track";
import { registrarMensagemSofia, consumirCreditos } from "@/lib/creditos/consume";
import { CUSTOS } from "@/lib/creditos/policy";
import { useCurriculoMunicipal } from "@/hooks/useCurriculoMunicipal";
import { useSofiaUserDataOptional } from "@/lib/sofia/SofiaUserContext";
import { brDateKey } from "@/lib/datetime";
import { comControle, SofiaCanceladaError, SofiaTempoEsgotadoError } from "./streamControl";

export type SofiaMessage = {
  role: "user" | "assistant";
  content: string;
  issues?: Array<{ term: string; suggestion: string; principle: string }> | null;
  /** true quando a resposta foi cortada por limite de tokens. */
  truncated?: boolean;
  /** true quando é um aviso de erro (não vai para o histórico enviado à IA). */
  error?: boolean;
  /** Texto do pedido que falhou, para o botão "Tentar de novo". */
  retryText?: string;
  /** true quando a professora tocou em "Parar" no meio da resposta. */
  interrupted?: boolean;
};

export type SofiaConversationSummary = {
  id: string;
  title: string;
  origin_route: string | null;
  updated_at: string;
};

export type SofiaProactive = {
  id: string;
  message: string;
  action?: { label: string; prompt?: string; to?: string };
};

async function safeListSofiaConversations(): Promise<SofiaConversationSummary[]> {
  try {
    const res = await listSofiaConversations();
    if (res && typeof res === "object" && "conversations" in res) {
      const list = (res as { conversations: unknown }).conversations;
      if (Array.isArray(list)) return list as SofiaConversationSummary[];
    }
    console.warn("[Sofia] Resposta inesperada de listSofiaConversations:", res);
    return [];
  } catch (err) {
    console.warn("[Sofia] listSofiaConversations falhou:", err);
    return [];
  }
}

type OpenOptions = {
  prompt?: string; // pre-fills composer
  send?: boolean; // send immediately
  context?: string; // append route/widget context
  newConversation?: boolean;
};

type SofiaCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  openSofia: (opts?: OpenOptions) => void;
  messages: SofiaMessage[];
  loading: boolean;
  /** true do envio até o fim da resposta (inclui o tempo em que o texto vai aparecendo). */
  busy: boolean;
  draft: string;
  setDraft: (s: string) => void;
  send: (text?: string) => Promise<void>;
  /** Para a resposta que está chegando (botão "Parar"). */
  stop: () => void;
  conversationId: string | null;
  startNew: () => void;
  conversations: SofiaConversationSummary[];
  loadConversation: (id: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  clearConversations: () => Promise<void>;
  isAuthed: boolean;
  routeContext: string;
  routeName: string;
  unread: number;
  resetUnread: () => void;
  proactive: SofiaProactive | null;
  pushProactive: (p: Omit<SofiaProactive, "id"> & { id?: string }) => void;
  dismissProactive: () => void;
  bootError: string | null;
  retryBootstrap: () => Promise<void>;
  /** Contexto pedagógico salvo pela professora — injetado no system prompt a cada mensagem. */
  userContext: string;
  setUserContext: (ctx: string) => void;
};

const Ctx = createContext<SofiaCtx | null>(null);

function useRouteContext() {
  const loc = useLocation();
  const sofia = useSofiaContextOptional();
  const { curriculo, isAtivo: municipalAtivo } = useCurriculoMunicipal();
  const userData = useSofiaUserDataOptional();
  return useMemo(() => {
    const p = loc.pathname;
    let tela = "Você está na Página inicial (painel do(a) educador(a)).";
    if (p.startsWith("/inclusao")) {
      const alunoAtual = sofia?.entity?.aluno_atual;
      if (alunoAtual) {
        tela = [
          `Você está na tela Inclusão, com o aluno(a) "${alunoAtual.nome}" aberto(a).`,
          `Diagnóstico/condição: ${alunoAtual.condicao_label || "não informado"}.`,
          `Ano escolar: ${alunoAtual.ano_escolar || "não informado"}.`,
          `Turma: ${alunoAtual.turma || "não informada"}.`,
          `Anamnese: ${alunoAtual.anamnese_eixos_preenchidos}/${alunoAtual.anamnese_eixos_total} eixos preenchidos.`,
          `PEI: ${alunoAtual.pei_status === "completo" ? "completo" : alunoAtual.pei_status === "rascunho" ? "em rascunho" : "não criado"}.`,
          `Adaptações registradas: ${alunoAtual.adaptacoes_registradas}.`,
          `Quando a professora fizer perguntas sobre este aluno(a), responda sempre no contexto do perfil acima.`,
        ].join(" ");
      } else {
        tela = "Você está na tela Inclusão (PEI, anamnese, pareceres).";
      }
    } else if (p.startsWith("/planejamento"))
      tela = "Você está na tela Planejar (planos de aula, BNCC, Diário de bordo e Trilhas).";
    else if (p.startsWith("/relatorios")) tela = "Você está na tela Pareceres.";
    else if (p.startsWith("/agenda")) tela = "Você está na Agenda escolar.";
    else if (p.startsWith("/assistente"))
      tela = "Você está na tela da Sofia (conversa completa, com histórico).";
    else if (p.startsWith("/configuracoes")) tela = "Você está nas Configurações.";
    else if (p.startsWith("/questoes") || p.startsWith("/simulados"))
      tela = "Você está na tela Questões (banco de questões e provas).";
    else if (p.startsWith("/biblioteca")) tela = "Você está na tela Minha Biblioteca.";
    else if (p.startsWith("/confirmar"))
      tela = "Você está na tela Para confirmar (mensagens do WhatsApp).";
    else if (p.startsWith("/cadernos")) tela = "Você está na tela Cadernos prontos.";
    else if (p.startsWith("/jogos")) tela = "Você está na tela Jogos e atividades interativas.";

    const turma = sofia?.entity?.turma_atual;
    const pcd = sofia?.entity?.todos_alunos_pcd ?? [];
    const etapaPerfil = sofia?.user?.etapa_ensino ?? null;
    const nivel =
      inferirNivelEnsino(turma?.ano) ??
      inferirNivelEnsino(turma?.nome) ??
      inferirNivelEnsino(etapaPerfil) ??
      (etapaPerfil && etapaPerfil.trim() ? etapaPerfil.trim() : null);
    const ds = sofia?.dataState;
    const linhas = [tela];
    const nome = sofia?.user?.primeiro_nome;
    if (nome && nome !== "Educador(a)") linhas.push(`Primeiro nome do(a) educador(a): ${nome}.`);

    if (ds && ds.turmas_count > 0) {
      linhas.push(`Total de turmas cadastradas: ${ds.turmas_count}.`);
      linhas.push(`Total de alunos cadastrados: ${ds.alunos_count}.`);
    }

    if (turma) {
      linhas.push(
        `Turma em foco: ${turma.nome}${turma.ano ? ` (${turma.ano})` : ""} — ${turma.total_alunos ?? 0} aluno(s).`,
      );
    } else if (!ds || ds.turmas_count === 0) {
      linhas.push("Turma atual: NENHUMA cadastrada ainda.");
    }

    if (pcd.length > 0) {
      const listaPcd = pcd
        .map((a) => `${a.nome}${a.condicao ? ` (${a.condicao})` : ""}`)
        .join(", ");
      linhas.push(`Alunos PCD cadastrados: ${listaPcd}.`);
      linhas.push("Adapte sempre as atividades e sugestões para incluir esses alunos.");
    } else if (ds && ds.alunos_count > 0) {
      linhas.push("Nenhum aluno PCD cadastrado.");
    }

    if (nivel) {
      linhas.push(
        `Nível de ensino da turma: ${nivel}. Adapte TODAS as suas respostas (atividades, estratégias, linguagem, sugestões de vídeos, relatórios e planejamentos) para esse público, conforme o bloco "ADAPTAÇÃO POR NÍVEL DE ENSINO" da sua Constituição.`,
      );
    } else {
      linhas.push(
        'Nível de ensino: NÃO INFORMADO. Antes de responder qualquer pedido pedagógico, pergunte: "Para te ajudar melhor, com qual nível de ensino você está trabalhando? 🧸 Educação Infantil  📚 Ensino Fundamental  🎓 Ensino Médio". Use a resposta para adaptar toda a conversa.',
      );
    }
    // ── Currículo municipal ─────────────────────────────────────────────
    if (
      municipalAtivo &&
      curriculo &&
      Array.isArray(curriculo.habilidades) &&
      curriculo.habilidades.length > 0
    ) {
      const nome = `${curriculo.municipio}${curriculo.estado ? ` (${curriculo.estado})` : ""}`;
      linhas.push(`\nCURRÍCULO MUNICIPAL ATIVO: ${nome}.`);
      linhas.push(
        `O professor(a) usa o Currículo Municipal de ${nome} como referencial — NÃO cite códigos BNCC quando responder sobre planejamento ou habilidades, use os códigos municipais quando disponíveis.`,
      );
      const habResumidas = curriculo.habilidades
        .slice(0, 40)
        .map(
          (h) =>
            `  - [${h.codigo || "—"}] ${h.descricao} (${h.ano || "—"} · ${h.disciplina || "—"})`,
        )
        .join("\n");
      linhas.push(`Habilidades do currículo municipal (amostra):\n${habResumidas}`);
    } else {
      linhas.push("Referencial curricular: BNCC (nenhum currículo municipal anexado).");
    }

    // ── Agenda real ─────────────────────────────────────────────────────
    const agenda = userData?.agenda ?? [];
    if (agenda.length > 0) {
      const hoje = brDateKey();
      const proximos = agenda
        .filter((e) => e.date >= hoje)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 10);
      if (proximos.length > 0) {
        const linhasAgenda = proximos
          .map((e) => {
            const data = e.date.split("-").reverse().join("/");
            return `  - ${data}${e.hora ? ` às ${e.hora}` : ""}: ${e.title || "(sem título)"}${e.type ? ` [${e.type}]` : ""}${e.notas ? ` — ${e.notas}` : ""}`;
          })
          .join("\n");
        linhas.push(`\nAGENDA (próximos eventos):\n${linhasAgenda}`);
      }
    }

    return linhas.join("\n");
  }, [
    loc.pathname,
    sofia?.user?.primeiro_nome,
    sofia?.entity?.turma_atual,
    sofia?.entity?.aluno_atual,
    sofia?.entity?.todos_alunos_pcd,
    sofia?.user?.etapa_ensino,
    sofia?.dataState,
    curriculo,
    municipalAtivo,
    userData?.agenda,
  ]);
}

function useRouteName() {
  const loc = useLocation();
  return useMemo(() => {
    const p = loc.pathname;
    if (p.startsWith("/inclusao")) return "Inclusão";
    if (p.startsWith("/planejamento")) return "Planejar";
    if (p.startsWith("/relatorios")) return "Pareceres";
    if (p.startsWith("/agenda")) return "Agenda";
    if (p.startsWith("/assistente")) return "Sofia";
    if (p.startsWith("/questoes") || p.startsWith("/simulados")) return "Questões";
    if (p.startsWith("/biblioteca")) return "Minha Biblioteca";
    if (p.startsWith("/confirmar")) return "Para confirmar";
    if (p.startsWith("/cadernos")) return "Cadernos prontos";
    if (p.startsWith("/jogos")) return "Jogos";
    if (p.startsWith("/configuracoes")) return "Configurações";
    if (p.startsWith("/auth")) return "Login";
    return "Página inicial";
  }, [loc.pathname]);
}

export function SofiaProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const loc = useLocation();
  const routeContext = useRouteContext();
  const routeName = useRouteName();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SofiaMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  // Cada envio ganha um número. Pedaços de um envio antigo (que a professora
  // parou, ou cuja conversa trocou) são ignorados.
  const runIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const loadSeqRef = useRef(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);
  const [conversations, setConversations] = useState<SofiaConversationSummary[]>([]);
  const [isAuthed, setIsAuthed] = useState(false);
  const [unread, setUnread] = useState(0);
  const [proactive, setProactive] = useState<SofiaProactive | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  // Contexto pedagógico persistido — injetado no system prompt a cada mensagem.
  const [userContext, setUserContextState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("aprof:sofia_user_context") ?? "";
  });
  const setUserContext = useCallback((ctx: string) => {
    setUserContextState(ctx);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("aprof:sofia_user_context", ctx);
    }
  }, []);
  const proactiveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAutoSend = useRef<string | null>(null);
  // Marcador invisível de navegação — anexado ao próximo envio.
  // Não vira mensagem visível; é mandado via routeContext extra.
  const pendingRouteMarker = useRef<string | null>(null);
  const lastRouteMarker = useRef<string | null>(null);

  // Inicialização da Sofia (sessão + conversas). Extraída para permitir
  // que o usuário acione "Tentar novamente" sem recarregar a página.
  const bootstrap = useCallback(async () => {
    setBootError(null);
    let authedNow = false;
    try {
      const { data } = await supabase.auth.getSession();
      authedNow = !!data.session;
      setIsAuthed(authedNow);
    } catch (err) {
      console.warn("[Sofia] getSession falhou:", err);
      setIsAuthed(false);
      setBootError(err instanceof Error ? err.message : "Não foi possível conectar a Sofia.");
      return;
    }
    if (authedNow) {
      const list = await safeListSofiaConversations();
      setConversations(list);
      if (list.length === 0) {
        // Não trato como erro fatal — apenas seguimos com lista vazia.
        // Se quiser sinalizar problema de carregamento, descomente:
        // setBootError("Não foi possível carregar suas conversas agora.");
      }
    }
  }, []);

  const retryBootstrap = useCallback(() => bootstrap(), [bootstrap]);

  useEffect(() => {
    let mounted = true;
    void bootstrap();
    let sub: { subscription: { unsubscribe: () => void } } | null = null;
    try {
      const res = supabase.auth.onAuthStateChange((event, s) => {
        if (!mounted) return;
        setIsAuthed(!!s);
        if (event === "SIGNED_IN" && s) {
          setTimeout(() => {
            refreshConversationsRef.current?.();
          }, 0);
          const nome =
            (s.user.user_metadata?.display_name as string | undefined) ||
            (s.user.user_metadata?.name as string | undefined) ||
            (s.user.email ? s.user.email.split("@")[0] : "educador(a)");
          setTimeout(() => {
            pushProactiveRef.current?.({
              id: "sofia-welcome",
              message: `Olá, ${nome}! Sou a Sofia e já estou conectada. Posso ajudar com planejamento, pareceres, inclusão e agenda. É só me chamar. ✨`,
              action: { label: "Conversar com a Sofia" },
            });
          }, 600);
        }
        if (event === "SIGNED_OUT") {
          runIdRef.current++;
          abortRef.current?.abort();
          abortRef.current = null;
          busyRef.current = false;
          setBusy(false);
          setLoading(false);
          setMessages([]);
          setConversationId(null);
          setConversations([]);
        }
      });
      sub = res.data;
    } catch (err) {
      console.warn("[Sofia] onAuthStateChange falhou ao registrar:", err);
    }
    return () => {
      mounted = false;
      try {
        sub?.subscription.unsubscribe();
      } catch {
        /* ignore */
      }
    };
  }, [bootstrap]);

  const refreshConversations = useCallback(async () => {
    if (!isAuthed) return;
    const list = await safeListSofiaConversations();
    setConversations(list);
  }, [isAuthed]);

  // Refs para uso dentro do listener de auth (que roda apenas uma vez).
  const refreshConversationsRef = useRef(refreshConversations);
  useEffect(() => {
    refreshConversationsRef.current = refreshConversations;
  }, [refreshConversations]);

  useEffect(() => {
    if (isAuthed && open) refreshConversations();
  }, [isAuthed, open, refreshConversations]);

  // Quando a professora navega entre telas com uma conversa ativa,
  // registra um marcador invisível para a próxima pergunta.
  useEffect(() => {
    if (!conversationId) return;
    const marker = `[educador(a) navegou para ${routeName} — ${loc.pathname}]`;
    if (marker === lastRouteMarker.current) return;
    lastRouteMarker.current = marker;
    pendingRouteMarker.current = marker;
  }, [loc.pathname, routeName, conversationId]);

  const send = useCallback(
    async (raw?: string) => {
      const text = (raw ?? draft).trim();
      if (!text || loading || busyRef.current) return;
      if (!isAuthed) {
        navigate({ to: "/auth" });
        return;
      }
      // Avisos de erro ficam só na tela: não entram no histórico da IA.
      let prev = messages;
      const last = prev[prev.length - 1];
      if (last?.error) {
        prev = prev.slice(0, -1);
        // "Tentar de novo": não duplica o pedido que falhou.
        if (last.retryText === text && prev[prev.length - 1]?.role === "user")
          prev = prev.slice(0, -1);
      }
      const base = prev.filter((m) => !m.error);
      const next: SofiaMessage[] = [...base, { role: "user", content: text }];
      setMessages(next);
      setDraft("");
      setLoading(true);
      busyRef.current = true;
      setBusy(true);
      const runId = ++runIdRef.current;
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const atual = () => runIdRef.current === runId;
      let assistantStarted = false;
      let acc = "";
      // Compõe o routeContext com o marcador invisível, se houver.
      const marker = pendingRouteMarker.current;
      pendingRouteMarker.current = null;
      const composedRouteContext = marker ? `${routeContext}\n${marker}` : routeContext;
      try {
        const stream = await askSofia({
          data: {
            conversationId: conversationId ?? undefined,
            messages: next
              .filter((m) => m.content.trim())
              .map(({ role, content }) => ({ role, content })),
            routeContext: composedRouteContext,
            originRoute: loc.pathname,
            userContext: userContext || undefined,
          },
        });
        let finalConversationId: string | null = conversationId ?? null;
        for await (const chunk of comControle(stream, { signal: ctrl.signal })) {
          if (!atual()) break;
          if (chunk.type === "delta") {
            if (!assistantStarted) {
              assistantStarted = true;
              setLoading(false);
              setMessages((m) => [...m, { role: "assistant", content: "" }]);
            }
            acc += chunk.content;
            setMessages((m) => {
              const last = m[m.length - 1];
              if (!last || last.role !== "assistant") return m;
              return m.map((mm, i) => (i === m.length - 1 ? { ...mm, content: acc } : mm));
            });
          } else if (chunk.type === "done") {
            finalConversationId = chunk.conversationId;
            const finalContent = chunk.content || acc;
            const wasTruncated = Boolean((chunk as { truncated?: boolean }).truncated);
            if (!assistantStarted) {
              setMessages((m) => [
                ...m,
                {
                  role: "assistant",
                  content: finalContent,
                  issues: chunk.issues,
                  truncated: wasTruncated,
                },
              ]);
            } else {
              setMessages((m) =>
                m.map((mm, i) =>
                  i === m.length - 1
                    ? {
                        ...mm,
                        content: finalContent,
                        issues: chunk.issues,
                        truncated: wasTruncated,
                      }
                    : mm,
                ),
              );
            }
          }
        }
        if (!atual()) return;
        if (finalConversationId) setConversationId(finalConversationId);
        if (!open) setUnread((n) => n + 1);
        refreshConversations();
        // Cobrança:
        // - Geração longa (resposta com 1500+ caracteres): 5 créditos nesta mensagem.
        // - Chat curto: 1 crédito a cada 10 mensagens.
        if ((acc || "").trim().length >= 1500) {
          void consumirCreditos(CUSTOS.chat_sofia_longa, "Chat — geração longa");
        } else {
          void registrarMensagemSofia();
        }
      } catch (err) {
        // Conversa trocada ou nova conversa: o envio antigo some sem aviso.
        if (!atual()) return;
        if (err instanceof SofiaCanceladaError) {
          // "Parar": mantém o que já chegou; se nada chegou, oferece reenviar.
          setMessages((m) => {
            const last = m[m.length - 1];
            if (assistantStarted && last?.role === "assistant" && !last.error) {
              if (!last.content.trim()) {
                return [
                  ...m.slice(0, -1),
                  {
                    role: "assistant",
                    content: "Você parou a resposta.",
                    error: true,
                    retryText: text,
                  },
                ];
              }
              return m.map((mm, i) => (i === m.length - 1 ? { ...mm, interrupted: true } : mm));
            }
            return [
              ...m,
              {
                role: "assistant",
                content: "Você parou a resposta.",
                error: true,
                retryText: text,
              },
            ];
          });
          return;
        }
        const msg =
          err instanceof Error ? err.message : "A Sofia teve um problema para responder agora.";
        const errConv = (err as { conversationId?: string | null } | null)?.conversationId;
        if (errConv) setConversationId(errConv);
        // Remove a resposta parcial (se houver) e mostra um aviso com "Tentar de novo".
        // A mensagem do usuário sai da lista: o botão reenvia o mesmo texto.
        setMessages((m) => {
          const semParcial =
            m.length && m[m.length - 1].role === "assistant" && !m[m.length - 1].error
              ? m.slice(0, -1)
              : m;
          const semPedido =
            semParcial.length && semParcial[semParcial.length - 1].role === "user"
              ? semParcial.slice(0, -1)
              : semParcial;
          return [
            ...semPedido,
            { role: "user", content: text },
            { role: "assistant", content: msg, error: true, retryText: text },
          ];
        });
        // Telemetria: registra a falha em platform_errors sem expor conteúdo
        // de alunos, mensagens do usuário ou contexto sensível.
        void reportError(`[sofia.chat] ${msg}`, {
          stack: err instanceof Error ? err.stack : undefined,
          severity: "error",
          metadata: {
            task: "sofia.chat",
            origin_route: loc.pathname,
            had_conversation: Boolean(conversationId),
            error_name: err instanceof Error ? err.name : "unknown",
            timeout: err instanceof SofiaTempoEsgotadoError,
          },
        });
      } finally {
        if (atual()) {
          if (abortRef.current === ctrl) abortRef.current = null;
          setLoading(false);
          busyRef.current = false;
          setBusy(false);
        }
      }
    },
    [
      draft,
      loading,
      messages,
      conversationId,
      routeContext,
      userContext,
      loc.pathname,
      isAuthed,
      navigate,
      refreshConversations,
      open,
    ],
  );
  /** Encerra o envio em andamento. `descartar` ignora até o aviso de "parou". */
  const cancelarEnvio = useCallback((descartar: boolean) => {
    const ctrl = abortRef.current;
    if (!ctrl) return;
    abortRef.current = null;
    if (descartar) runIdRef.current++;
    ctrl.abort();
    if (descartar) {
      setLoading(false);
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  const stop = useCallback(() => cancelarEnvio(false), [cancelarEnvio]);

  const startNew = useCallback(() => {
    cancelarEnvio(true);
    loadSeqRef.current++;
    setMessages([]);
    setConversationId(null);
    setDraft("");
  }, [cancelarEnvio]);

  const loadConversation = useCallback(
    async (id: string) => {
      cancelarEnvio(true);
      const seq = ++loadSeqRef.current;
      setLoading(true);
      try {
        const { messages: msgs } = await getSofiaConversation({ data: { id } });
        // Outra conversa foi aberta enquanto esta carregava.
        if (seq !== loadSeqRef.current) return;
        setConversationId(id);
        setMessages(
          (msgs as Array<{ role: string; content: string; issues: unknown }>)
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
              issues: m.issues as SofiaMessage["issues"],
            })),
        );
      } catch (err) {
        console.warn("[Sofia] getSofiaConversation falhou:", err);
        if (seq !== loadSeqRef.current) return;
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: "Não foi possível carregar a conversa agora. Tente de novo em instantes.",
            error: true,
          },
        ]);
      } finally {
        if (seq === loadSeqRef.current) setLoading(false);
      }
    },
    [cancelarEnvio],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      // Excluir a conversa aberta enquanto a Sofia escreve: para a resposta.
      if (id === conversationIdRef.current) cancelarEnvio(true);
      try {
        await deleteSofiaConversation({ data: { id } });
      } catch (err) {
        console.warn("[Sofia] deleteSofiaConversation falhou:", err);
        throw err;
      }
      setConversations((list) => list.filter((c) => c.id !== id));
      if (conversationIdRef.current === id) {
        setMessages([]);
        setConversationId(null);
      }
    },
    [cancelarEnvio],
  );

  const clearConversations = useCallback(async () => {
    cancelarEnvio(true);
    try {
      await clearSofiaConversations();
    } catch (err) {
      console.warn("[Sofia] clearSofiaConversations falhou:", err);
      throw err;
    }
    setConversations([]);
    setConversationId(null);
    setMessages([]);
  }, [cancelarEnvio]);

  const openSofia = useCallback(
    (opts?: OpenOptions) => {
      if (opts?.newConversation) startNew();
      if (opts?.context && opts.prompt) {
        setDraft(`${opts.prompt}\n\n[Contexto: ${opts.context}]`);
      } else if (opts?.prompt) {
        setDraft(opts.prompt);
      }
      if (opts?.send && opts.prompt) {
        pendingAutoSend.current = opts.context
          ? `${opts.prompt}\n\n[Contexto: ${opts.context}]`
          : opts.prompt;
      }
      setOpen(true);
      setUnread(0);
      setProactive(null);
    },
    [startNew],
  );

  const dismissProactive = useCallback(() => {
    if (proactiveTimer.current) clearTimeout(proactiveTimer.current);
    proactiveTimer.current = null;
    setProactive(null);
  }, []);

  const pushProactive = useCallback((p: Omit<SofiaProactive, "id"> & { id?: string }) => {
    // Respeita a preferência "Mostrar cartões da Sofia ao navegar" (Configurações).
    // Se desligada, não exibimos os cartões proativos — o resto da Sofia segue normal.
    try {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem("aprof:ui_sofia_tips");
        if (raw && JSON.parse(raw) === "off") return;
      }
    } catch {
      /* se falhar a leitura, mantém o padrão (mostrar) */
    }
    if (proactiveTimer.current) clearTimeout(proactiveTimer.current);
    const item: SofiaProactive = {
      id: p.id ?? crypto.randomUUID(),
      message: p.message,
      action: p.action,
    };
    setProactive(item);
    setUnread((n) => n + 1);
    proactiveTimer.current = setTimeout(() => setProactive(null), 12000);
  }, []);

  const pushProactiveRef = useRef(pushProactive);
  useEffect(() => {
    pushProactiveRef.current = pushProactive;
  }, [pushProactive]);

  const resetUnread = useCallback(() => setUnread(0), []);

  // Wrap setOpen so opening clears unread/proactive
  const setOpenWrapped = useCallback(
    (v: boolean) => {
      setOpen(v);
      if (v) {
        setUnread(0);
        dismissProactive();
      }
    },
    [dismissProactive],
  );

  // Trigger pending auto-send after open
  useEffect(() => {
    if (open && pendingAutoSend.current) {
      const text = pendingAutoSend.current;
      pendingAutoSend.current = null;
      send(text);
    }
  }, [open, send]);

  const value: SofiaCtx = {
    open,
    setOpen: setOpenWrapped,
    openSofia,
    messages,
    loading,
    busy,
    draft,
    setDraft,
    send,
    stop,
    conversationId,
    startNew,
    conversations,
    loadConversation,
    refreshConversations,
    deleteConversation,
    clearConversations,
    isAuthed,
    routeContext,
    routeName,
    unread,
    resetUnread,
    proactive,
    pushProactive,
    dismissProactive,
    bootError,
    retryBootstrap,
    userContext,
    setUserContext,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSofia() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSofia must be used within <SofiaProvider>");
  return c;
}

/** Versão tolerante: retorna null se for chamada fora do <SofiaProvider>. */
export function useSofiaOptional() {
  return useContext(Ctx);
}
