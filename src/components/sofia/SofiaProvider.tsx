import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { askSofia, listSofiaConversations, getSofiaConversation } from "@/server/sofia.functions";

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

export function SofiaProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const loc = useLocation();
  const routeContext = useRouteContext();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SofiaMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<SofiaConversationSummary[]>([]);
  const [isAuthed, setIsAuthed] = useState(false);
  const pendingAutoSend = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => mounted && setIsAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setIsAuthed(!!s));
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const refreshConversations = useCallback(async () => {
    if (!isAuthed) return;
    try {
      const { conversations: list } = await listSofiaConversations();
      setConversations(list as SofiaConversationSummary[]);
    } catch { /* ignore */ }
  }, [isAuthed]);

  useEffect(() => { if (isAuthed && open) refreshConversations(); }, [isAuthed, open, refreshConversations]);

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
    try {
      const data = await askSofia({
        data: {
          conversationId: conversationId ?? undefined,
          messages: next.map(({ role, content }) => ({ role, content })),
          routeContext,
          originRoute: loc.pathname,
        },
      });
      setConversationId(data.conversationId);
      setMessages((m) => [...m, { role: "assistant", content: data.content || "", issues: data.issues }]);
      refreshConversations();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao consultar a Sofia.";
      setMessages((m) => [...m, { role: "assistant", content: `_${msg}_` }]);
    } finally {
      setLoading(false);
    }
  }, [draft, loading, messages, conversationId, routeContext, loc.pathname, isAuthed, navigate, refreshConversations]);

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
  }, [startNew]);

  // Trigger pending auto-send after open
  useEffect(() => {
    if (open && pendingAutoSend.current) {
      const text = pendingAutoSend.current;
      pendingAutoSend.current = null;
      send(text);
    }
  }, [open, send]);

  const value: SofiaCtx = {
    open, setOpen, openSofia, messages, loading, draft, setDraft, send,
    conversationId, startNew, conversations, loadConversation, refreshConversations,
    isAuthed, routeContext,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSofia() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSofia must be used within <SofiaProvider>");
  return c;
}