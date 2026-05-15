import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { askSofia, listSofiaConversations, getSofiaConversation } from "@/lib/sofia.functions";

export type SofiaMessage = {
  role: "user" | "assistant";
  content: string;
  issues?: Array<{ term: string; suggestion: string; principle: string }> | null;
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
  prompt?: string;       // pre-fills composer
  send?: boolean;        // send immediately
  context?: string;      // append route/widget context
  newConversation?: boolean;
};

type SofiaCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  openSofia: (opts?: OpenOptions) => void;
  messages: SofiaMessage[];
  loading: boolean;
  draft: string;
  setDraft: (s: string) => void;
  send: (text?: string) => Promise<void>;
  conversationId: string | null;
  startNew: () => void;
  conversations: SofiaConversationSummary[];
  loadConversation: (id: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
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
};

const Ctx = createContext<SofiaCtx | null>(null);

function useRouteContext() {
  const loc = useLocation();
  return useMemo(() => {
    const p = loc.pathname;
    if (p.startsWith("/inclusao")) return "Você está na tela Inclusão (PEI, anamnese, pareceres).";
    if (p.startsWith("/planejamento")) return "Você está na tela Planejamento (planos de aula, BNCC).";
    if (p.startsWith("/relatorios")) return "Você está na tela Relatórios.";
    if (p.startsWith("/agenda")) return "Você está na Agenda escolar.";
    if (p.startsWith("/assistente")) return "Você está na tela do Assistente IA (chat principal).";
    if (p.startsWith("/configuracoes")) return "Você está nas Configurações.";
    return "Você está na Página inicial (painel da professora).";
  }, [loc.pathname]);
}

function useRouteName() {
  const loc = useLocation();
  return useMemo(() => {
    const p = loc.pathname;
    if (p.startsWith("/inclusao")) return "Inclusão";
    if (p.startsWith("/planejamento")) return "Planejamento";
    if (p.startsWith("/relatorios")) return "Relatórios";
    if (p.startsWith("/agenda")) return "Agenda";
    if (p.startsWith("/assistente")) return "Assistente IA";
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
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<SofiaConversationSummary[]>([]);
  const [isAuthed, setIsAuthed] = useState(false);
  const [unread, setUnread] = useState(0);
  const [proactive, setProactive] = useState<SofiaProactive | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
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
          setTimeout(() => { refreshConversationsRef.current?.(); }, 0);
          const nome = (s.user.user_metadata?.display_name as string | undefined)
            || (s.user.user_metadata?.name as string | undefined)
            || (s.user.email ? s.user.email.split("@")[0] : "professora");
          setTimeout(() => {
            pushProactiveRef.current?.({
              id: "sofia-welcome",
              message: `Olá, ${nome}! Sou a Sofia e já estou conectada. Posso ajudar com planejamento, pareceres, inclusão e agenda. É só me chamar. ✨`,
              action: { label: "Conversar com a Sofia" },
            });
          }, 600);
        }
        if (event === "SIGNED_OUT") {
          setMessages([]);
          setConversationId(null);
          setConversations([]);
        }
      });
      sub = res.data;
    } catch (err) {
      console.warn("[Sofia] onAuthStateChange falhou ao registrar:", err);
    }
    return () => { mounted = false; try { sub?.subscription.unsubscribe(); } catch { /* ignore */ } };
  }, [bootstrap]);

  const refreshConversations = useCallback(async () => {
    if (!isAuthed) return;
    const list = await safeListSofiaConversations();
    setConversations(list);
  }, [isAuthed]);

  // Refs para uso dentro do listener de auth (que roda apenas uma vez).
  const refreshConversationsRef = useRef(refreshConversations);
  useEffect(() => { refreshConversationsRef.current = refreshConversations; }, [refreshConversations]);

  useEffect(() => { if (isAuthed && open) refreshConversations(); }, [isAuthed, open, refreshConversations]);

  // Quando a professora navega entre telas com uma conversa ativa,
  // registra um marcador invisível para a próxima pergunta.
  useEffect(() => {
    if (!conversationId) return;
    const marker = `[professora navegou para ${routeName} — ${loc.pathname}]`;
    if (marker === lastRouteMarker.current) return;
    lastRouteMarker.current = marker;
    pendingRouteMarker.current = marker;
  }, [loc.pathname, routeName, conversationId]);

  const send = useCallback(async (raw?: string) => {
    const text = (raw ?? draft).trim();
    if (!text || loading) return;
    if (!isAuthed) {
      navigate({ to: "/auth" });
      return;
    }
    const next: SofiaMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setDraft("");
    setLoading(true);
    // Compõe o routeContext com o marcador invisível, se houver.
    const marker = pendingRouteMarker.current;
    pendingRouteMarker.current = null;
    const composedRouteContext = marker
      ? `${routeContext}\n${marker}`
      : routeContext;
    try {
      const stream = await askSofia({
        data: {
          conversationId: conversationId ?? undefined,
          messages: next.map(({ role, content }) => ({ role, content })),
          routeContext: composedRouteContext,
          originRoute: loc.pathname,
        },
      });
      let assistantStarted = false;
      let acc = "";
      let finalConversationId: string | null = conversationId ?? null;
      for await (const chunk of stream) {
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
          if (!assistantStarted) {
            setMessages((m) => [...m, { role: "assistant", content: finalContent, issues: chunk.issues }]);
          } else {
            setMessages((m) => m.map((mm, i) => (
              i === m.length - 1
                ? { ...mm, content: finalContent, issues: chunk.issues }
                : mm
            )));
          }
        }
      }
      if (finalConversationId) setConversationId(finalConversationId);
      if (!open) setUnread((n) => n + 1);
      refreshConversations();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao consultar a Sofia.";
      setMessages((m) => [...m, { role: "assistant", content: `_${msg}_` }]);
    } finally {
      setLoading(false);
    }
  }, [draft, loading, messages, conversationId, routeContext, loc.pathname, isAuthed, navigate, refreshConversations, open]);

  const startNew = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setDraft("");
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const { messages: msgs } = await getSofiaConversation({ data: { id } });
      setConversationId(id);
      setMessages(
        (msgs as Array<{ role: string; content: string; issues: unknown }>).
          filter((m) => m.role === "user" || m.role === "assistant").
          map((m) => ({ role: m.role as "user" | "assistant", content: m.content, issues: m.issues as SofiaMessage["issues"] }))
      );
    } catch (err) {
      console.warn("[Sofia] getSofiaConversation falhou:", err);
      setMessages((m) => [...m, { role: "assistant", content: "_Não foi possível carregar a conversa agora. Tente novamente em instantes._" }]);
    } finally {
      setLoading(false);
    }
  }, []);

  const openSofia = useCallback((opts?: OpenOptions) => {
    if (opts?.newConversation) startNew();
    if (opts?.context && opts.prompt) {
      setDraft(`${opts.prompt}\n\n[Contexto: ${opts.context}]`);
    } else if (opts?.prompt) {
      setDraft(opts.prompt);
    }
    if (opts?.send && opts.prompt) {
      pendingAutoSend.current = opts.context ? `${opts.prompt}\n\n[Contexto: ${opts.context}]` : opts.prompt;
    }
    setOpen(true);
    setUnread(0);
    setProactive(null);
  }, [startNew]);

  const dismissProactive = useCallback(() => {
    if (proactiveTimer.current) clearTimeout(proactiveTimer.current);
    proactiveTimer.current = null;
    setProactive(null);
  }, []);

  const pushProactive = useCallback((p: Omit<SofiaProactive, "id"> & { id?: string }) => {
    if (proactiveTimer.current) clearTimeout(proactiveTimer.current);
    const item: SofiaProactive = { id: p.id ?? crypto.randomUUID(), message: p.message, action: p.action };
    setProactive(item);
    setUnread((n) => n + 1);
    proactiveTimer.current = setTimeout(() => setProactive(null), 12000);
  }, []);

  const pushProactiveRef = useRef(pushProactive);
  useEffect(() => { pushProactiveRef.current = pushProactive; }, [pushProactive]);

  const resetUnread = useCallback(() => setUnread(0), []);

  // Wrap setOpen so opening clears unread/proactive
  const setOpenWrapped = useCallback((v: boolean) => {
    setOpen(v);
    if (v) { setUnread(0); dismissProactive(); }
  }, [dismissProactive]);

  // Trigger pending auto-send after open
  useEffect(() => {
    if (open && pendingAutoSend.current) {
      const text = pendingAutoSend.current;
      pendingAutoSend.current = null;
      send(text);
    }
  }, [open, send]);

  const value: SofiaCtx = {
    open, setOpen: setOpenWrapped, openSofia, messages, loading, draft, setDraft, send,
    conversationId, startNew, conversations, loadConversation, refreshConversations,
    isAuthed, routeContext, routeName, unread, resetUnread,
    proactive, pushProactive, dismissProactive,
    bootError, retryBootstrap,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSofia() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSofia must be used within <SofiaProvider>");
  return c;
}