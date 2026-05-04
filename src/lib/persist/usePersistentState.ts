import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Local-first persistent state with optional cloud sync (Supabase).
 *
 * - Reads from localStorage immediately (synchronous bootstrap).
 * - Writes to localStorage on every change.
 * - When a user is authenticated, pulls remote snapshot once (remote wins
 *   if remote.updated_at is newer), and pushes (debounced) on every change.
 * - When user logs in later, runs the pull/merge automatically.
 */
export function usePersistentState<T>(key: string, initial: T) {
  const lsKey = `aprof:${key}`;
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(lsKey);
      if (raw) return JSON.parse(raw) as T;
    } catch { /* ignore */ }
    return initial;
  });
  const userIdRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist to localStorage on every change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(lsKey, JSON.stringify(state));
      const ts = Date.now();
      window.localStorage.setItem(lsKey + ":ts", String(ts));
      lastLocalUpdate.current = ts as unknown as number;
    } catch { /* ignore */ }
  }, [state, lsKey]);

  const pullRemote = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("app_snapshots")
        .select("data, updated_at")
        .eq("user_id", uid)
        .eq("key", key)
        .maybeSingle();
      if (error || !data) { hydratedRef.current = true; return; }
      const remoteTs = new Date(data.updated_at).getTime();
      const localTs = Number(window.localStorage.getItem(lsKey + ":ts") || 0);
      // Remote wins if it's newer OR local is empty.
      const localRaw = window.localStorage.getItem(lsKey);
      if (!localRaw || remoteTs > localTs) {
        setState(data.data as T);
      }
    } catch { /* ignore */ }
    finally { hydratedRef.current = true; }
  }, [key, lsKey]);

  const pushRemote = useCallback((uid: string, value: T) => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      try {
        await supabase
          .from("app_snapshots")
          .upsert({ user_id: uid, key, data: value as object, updated_at: new Date().toISOString() }, { onConflict: "user_id,key" });
      } catch { /* ignore */ }
    }, 800);
  }, [key]);

  // Subscribe to auth: hydrate remote on login, push on changes.
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const uid = data.session?.user?.id ?? null;
      userIdRef.current = uid;
      if (uid) pullRemote(uid);
      else hydratedRef.current = true;
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      const uid = s?.user?.id ?? null;
      const prev = userIdRef.current;
      userIdRef.current = uid;
      if (uid && uid !== prev) {
        hydratedRef.current = false;
        pullRemote(uid);
      }
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [pullRemote]);

  // Push on state change (only after hydration to avoid clobbering remote).
  useEffect(() => {
    const uid = userIdRef.current;
    if (!uid || !hydratedRef.current) return;
    pushRemote(uid, state);
  }, [state, pushRemote]);

  return [state, setState] as const;
}