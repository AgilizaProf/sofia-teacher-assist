import { useEffect, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * useRealtimeSync
 * Subscribes to Postgres changes on the user's own rows in the main
 * tables and invalidates the corresponding React Query caches so that
 * edits made on one device appear automatically on the others.
 *
 * For `app_snapshots` (the local-first key/value store used by
 * usePersistentState), dispatches a window event so the hook can
 * re-pull the affected key without a full reload.
 */
const TABLE_TO_QUERY_KEY: Record<string, readonly unknown[] | null> = {
  turmas: ["turmas"],
  alunos_inclusao: ["inclusao_students"],
  agenda_eventos: ["agenda_events"],
  // outras tabelas: apenas dispara um invalidate genérico via custom event
  pei_pdi: null,
  relatorios_ei: null,
  observacoes_ei: null,
  roteiros_ei: null,
  planos_aula: null,
  trilhas: null,
  trilha_semanas: null,
  pareceres: null,
  alunos_registros: null,
  alunos_anamnese: null,
  marcos_desenvolvimento: null,
  defasagens: null,
  progressao_alunos: null,
  pei_evidencias: null,
  pei_progresso: null,
  profiles: null,
  // local-first key/value store — invalidation handled via custom event below
  app_snapshots: null,
};

export type RealtimeStatus = "connecting" | "live" | "fallback";

let realtimeStatus: RealtimeStatus = "connecting";
const statusListeners = new Set<() => void>();
function setStatus(next: RealtimeStatus) {
  if (realtimeStatus === next) return;
  realtimeStatus = next;
  statusListeners.forEach((fn) => fn());
}

/** Subscribe to the realtime sync status (live / fallback / connecting). */
export function useRealtimeStatus(): RealtimeStatus {
  return useSyncExternalStore(
    (cb) => {
      statusListeners.add(cb);
      return () => statusListeners.delete(cb);
    },
    () => realtimeStatus,
    () => "connecting" as RealtimeStatus,
  );
}

export function useRealtimeSync() {
  const qc = useQueryClient();

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    async function setup() {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid || cancelled) return;
      setStatus("connecting");
      if (fallbackTimer) clearTimeout(fallbackTimer);
      // If we never reach SUBSCRIBED within 8s, declare fallback mode.
      fallbackTimer = setTimeout(() => setStatus("fallback"), 8000);

      channel = supabase.channel(`rt-user-${uid}`);

      for (const [table, queryKey] of Object.entries(TABLE_TO_QUERY_KEY)) {
        channel = channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            if (queryKey) {
              void qc.invalidateQueries({ queryKey });
            }
            if (table === "app_snapshots") {
              const row = (payload.new ?? payload.old) as { key?: string } | null;
              if (row?.key && typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("aprof:snapshot-changed", { detail: { key: row.key } }),
                );
              }
            }
          },
        );
      }

      channel.subscribe((state) => {
        if (state === "SUBSCRIBED") {
          if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
          setStatus("live");
        } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") {
          setStatus("fallback");
        }
      });
    }

    void setup();

    // Re-setup when auth changes (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange((_e, _s) => {
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
      void setup();
    });

    // On tab visible again, force a refresh of the main caches
    // (helps mobile when the browser suspended the websocket)
    const onVis = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void qc.invalidateQueries();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVis);
    }

    return () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (channel) void supabase.removeChannel(channel);
      sub.subscription.unsubscribe();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVis);
      }
    };
  }, [qc]);
}