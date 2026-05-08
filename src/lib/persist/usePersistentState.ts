import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { detectShapeMismatch, reportStorageIssue } from "./storageDiagnostics";

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
  // Always start with `initial` so SSR HTML matches the first client render.
  // Reading from localStorage during useState init causes a hydration mismatch
  // because the server has no access to it. We restore the persisted value in
  // a useEffect after mount instead.
  const [state, setState] = useState<T>(initial);
  const initialRef = useRef<T>(initial);
  const userIdRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore from localStorage after hydration (client-only).
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (typeof window === "undefined") return;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(lsKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      const mismatch = detectShapeMismatch(parsed, initialRef.current);
      if (mismatch) {
        reportStorageIssue({
          key,
          source: "localStorage",
          kind: mismatch.kind,
          expectedType: mismatch.expectedType,
          receivedType: mismatch.receivedType,
          message: `Valor incompatível em "${key}" — esperava ${mismatch.expectedType}, recebeu ${mismatch.receivedType}. Mantendo valor inicial.`,
          rawPreview: raw.length > 160 ? raw.slice(0, 160) + "…" : raw,
        });
        return;
      }
      setState(parsed as T);
    } catch (err) {
      reportStorageIssue({
        key,
        source: "localStorage",
        kind: "parse-error",
        expectedType: typeof initialRef.current === "object" && initialRef.current !== null ? (Array.isArray(initialRef.current) ? "array" : "object") : typeof initialRef.current,
        receivedType: "string(corrupted)",
        message: `Falha ao parsear localStorage["${lsKey}"]: ${(err as Error)?.message ?? String(err)}`,
        rawPreview: raw ? (raw.length > 160 ? raw.slice(0, 160) + "…" : raw) : undefined,
      });
    }
  }, [lsKey]);

  // Persist to localStorage on every change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(lsKey, JSON.stringify(state));
      window.localStorage.setItem(lsKey + ":ts", String(Date.now()));
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
      const mismatch = detectShapeMismatch(data.data, initialRef.current);
      if (mismatch) {
        reportStorageIssue({
          key,
          source: "remote-snapshot",
          kind: mismatch.kind,
          expectedType: mismatch.expectedType,
          receivedType: mismatch.receivedType,
          message: `Snapshot remoto incompatível em "${key}" — esperava ${mismatch.expectedType}, recebeu ${mismatch.receivedType}. Mantendo valor local.`,
          rawPreview: (() => { try { return JSON.stringify(data.data).slice(0, 160); } catch { return undefined; } })(),
        });
        hydratedRef.current = true;
        return;
      }
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
          .upsert([{ user_id: uid, key, data: JSON.parse(JSON.stringify(value)), updated_at: new Date().toISOString() }], { onConflict: "user_id,key" });
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