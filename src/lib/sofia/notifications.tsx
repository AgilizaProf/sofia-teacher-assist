import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────────────────────────────────────
// Notificações da Sofia (Fase 2 / consumidas por Fase 3+)
//
// Store global de itens que aparecem no drawer de notificações da Sofia:
// lembretes, alertas PCD, padrões detectados, conflitos. Persistido em
// localStorage por usuário para sobreviver a refresh.
// ─────────────────────────────────────────────────────────────────────────────

export type SofiaNotifCategory =
  | "lembrete"   // 🔔 Lembrete de atividade
  | "pcd"        // 🧒 Aluno PCD
  | "plano"      // 📋 Planejamento
  | "padrao"     // 📊 Padrão detectado
  | "alerta";    // ⚠️ Conflito ou alerta

export type SofiaNotifAction = {
  label: string;
  to?: string;            // rota
  search?: Record<string, string | number | undefined>; // search params (deep-link)
  prompt?: string;        // pergunta para a Sofia
  intent?: string;        // identificador customizado
};

export type SofiaNotification = {
  id: string;
  category: SofiaNotifCategory;
  text: string;
  createdAt: number;      // ms epoch
  read: boolean;
  dismissed?: boolean;    // descartada nesta sessão (não some, mas vira "ignorada")
  action?: SofiaNotifAction;
  /** Ações secundárias renderizadas como chips ao lado do botão principal. */
  actions?: SofiaNotifAction[];
  // dedupKey: identificador estável para evitar disparar 2x o mesmo lembrete.
  dedupKey?: string;
};

type Ctx = {
  items: SofiaNotification[];        // visíveis (não dismissed)
  all: SofiaNotification[];          // tudo
  unread: number;
  push: (n: Omit<SofiaNotification, "id" | "createdAt" | "read"> & { id?: string }) => string | null;
  hasDedup: (key: string) => boolean;
  markAllRead: () => void;
  markRead: (id: string) => void;
  dismiss: (id: string) => void;
  clear: () => void;
};

const NotifCtx = createContext<Ctx | null>(null);
const STORAGE_PREFIX = "aprof:sofia:notifs:";

function storageKey(userId: string | null): string {
  return STORAGE_PREFIX + (userId ?? "_anon");
}

function load(userId: string | null): SofiaNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const arr = JSON.parse(raw) as SofiaNotification[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function save(userId: string | null, items: SofiaNotification[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(items.slice(0, 100)));
  } catch { /* ignore */ }
}

export function SofiaNotificationsProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<SofiaNotification[]>([]);

  // hidrata por usuário
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      setItems(load(uid));
    }).catch(() => { if (mounted) setItems(load(null)); });
    let sub: { subscription: { unsubscribe: () => void } } | null = null;
    try {
      const res = supabase.auth.onAuthStateChange((_e, s) => {
        const uid = s?.user?.id ?? null;
        setUserId(uid);
        setItems(load(uid));
      });
      sub = res.data;
    } catch { /* ignore */ }
    return () => { mounted = false; try { sub?.subscription.unsubscribe(); } catch { /* ignore */ } };
  }, []);

  // persiste a cada mudança
  useEffect(() => { save(userId, items); }, [userId, items]);

  const push = useCallback<Ctx["push"]>((n) => {
    let createdId: string | null = null;
    setItems((prev) => {
      // dedup
      if (n.dedupKey && prev.some((x) => x.dedupKey === n.dedupKey)) return prev;
      const id = n.id ?? `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      createdId = id;
      const item: SofiaNotification = {
        id,
        category: n.category,
        text: n.text,
        action: n.action,
        actions: n.actions,
        dedupKey: n.dedupKey,
        createdAt: Date.now(),
        read: false,
      };
      return [item, ...prev];
    });
    return createdId;
  }, []);

  const hasDedup = useCallback((key: string) => items.some((x) => x.dedupKey === key), [items]);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((x) => (x.read ? x : { ...x, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, read: true } : x)));
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, dismissed: true, read: true } : x)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<Ctx>(() => {
    const visible = items.filter((x) => !x.dismissed);
    return {
      items: visible,
      all: items,
      unread: visible.filter((x) => !x.read).length,
      push,
      hasDedup,
      markAllRead,
      markRead,
      dismiss,
      clear,
    };
  }, [items, push, hasDedup, markAllRead, markRead, dismiss, clear]);

  return <NotifCtx.Provider value={value}>{children}</NotifCtx.Provider>;
}

export function useSofiaNotifications(): Ctx {
  const c = useContext(NotifCtx);
  if (!c) throw new Error("useSofiaNotifications must be used within <SofiaNotificationsProvider>");
  return c;
}