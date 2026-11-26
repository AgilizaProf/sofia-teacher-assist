import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { falhouSalvarNaNuvem, salvouNaNuvem } from "./avisoNuvem";
import { detectShapeMismatch, reportStorageIssue, previewOf, shapeOf } from "./storageDiagnostics";

type Snapshot = { data: unknown; updated_at: string } | null;

// Leitura agrupada: as telas abrem vários usePersistentState ao mesmo tempo.
// Em vez de um pedido ao banco por chave (e às vezes dois, pelo getSession e
// pelo onAuthStateChange), junta as chaves pedidas no mesmo instante numa
// consulta só e reaproveita a resposta por alguns segundos.
const FRESCO_MS = 3000;
const recentes = new Map<string, { at: number; p: Promise<Snapshot> }>();
let fila: { uid: string; keys: Map<string, (s: Snapshot) => void>; fail: Array<() => void> } | null = null;

function lerSnapshot(uid: string, key: string, forcar = false): Promise<Snapshot> {
  const id = `${uid}:${key}`;
  const r = recentes.get(id);
  if (!forcar && r && Date.now() - r.at < FRESCO_MS) return r.p;
  const p = new Promise<Snapshot>((resolve, reject) => {
    let lote = fila;
    if (!lote || lote.uid !== uid) {
      const atual: NonNullable<typeof fila> = { uid, keys: new Map(), fail: [] };
      lote = fila = atual;
      setTimeout(async () => {
        if (fila === atual) fila = null;
        const chaves = [...atual.keys.keys()];
        try {
          const { data, error } = await supabase
            .from("app_snapshots")
            .select("key, data, updated_at")
            .eq("user_id", uid)
            .in("key", chaves);
          if (error) throw error;
          const porChave = new Map((data ?? []).map((d) => [d.key as string, d]));
          for (const [k, done] of atual.keys) {
            const d = porChave.get(k);
            done(d ? { data: d.data, updated_at: d.updated_at as string } : null);
          }
        } catch {
          atual.fail.forEach((f) => f());
        }
      }, 25);
    }
    const prev = lote.keys.get(key);
    lote.keys.set(key, (snap) => {
      prev?.(snap);
      resolve(snap);
    });
    lote.fail.push(() => reject(new Error("snapshot_read_failed")));
  });
  recentes.set(id, { at: Date.now(), p });
  p.catch(() => recentes.delete(id));
  return p;
}

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
  const [state, setState] = useState<T>(initial);
  const initialRef = useRef<T>(initial);
  const userIdRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);
  // Marca true assim que o usuário (ou app) muda o estado depois do mount.
  // Garante que pullRemote não sobrescreva uma edição local ainda não enviada,
  // e que pushRemote sempre rode após hidratação independente da ordem.
  const userTouchedRef = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Identidade única desta instância do hook. Usada para que uma instância
  // não reaja ao próprio broadcast de gravação local (evita loop).
  const idRef = useRef(Math.random().toString(36).slice(2));
  // Quando true, o próximo write veio de uma sincronização entre instâncias
  // (mesma aba ou outra aba) e NÃO deve ser re-anunciado nem empurrado ao
  // remoto — quem originou a mudança já cuida disso.
  const externalApplyRef = useRef(false);

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
        const prev = previewOf(parsed);
        reportStorageIssue({
          key,
          source: "localStorage",
          kind: mismatch.kind,
          expectedType: mismatch.expectedType,
          receivedType: mismatch.receivedType,
          message: `Valor incompatível em "${key}" — esperava ${mismatch.expectedType}, recebeu ${mismatch.receivedType}. Mantendo valor inicial.`,
          rawPreview: prev.text,
          rawSize: prev.size,
          expectedShape: shapeOf(initialRef.current),
          receivedShape: shapeOf(parsed),
        });
        return;
      }
      setState(parsed as T);
    } catch (err) {
      const prev = raw ? previewOf(raw) : undefined;
      reportStorageIssue({
        key,
        source: "localStorage",
        kind: "parse-error",
        expectedType: typeof initialRef.current === "object" && initialRef.current !== null ? (Array.isArray(initialRef.current) ? "array" : "object") : typeof initialRef.current,
        receivedType: "string(corrupted)",
        message: `Falha ao parsear localStorage["${lsKey}"]: ${(err as Error)?.message ?? String(err)}`,
        rawPreview: prev?.text,
        rawSize: prev?.size,
        expectedShape: shapeOf(initialRef.current),
        receivedShape: "string(corrupted)",
      });
    }
  }, [lsKey]);

  // Persist to localStorage on every change
  const firstPersistRef = useRef(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    // NÃO grava o valor inicial sintético do useState no mount. Antes desta
    // guarda, o efeito (a) sobrescrevia um valor válido já presente no
    // localStorage com o default e (b) bumpava o ":ts" para "agora", fazendo
    // o pullRemote nunca "ganhar" a comparação de timestamp — então o snapshot
    // remoto era descartado em qualquer dispositivo cujo localStorage estivesse
    // vazio para esta chave, e a preferência (ex.: "Não mostrar" os cartões da
    // Sofia) voltava ao default a cada carregamento. Só persistimos a partir da
    // 1ª mudança REAL de estado (restore do localStorage ou ação do usuário).
    if (firstPersistRef.current) {
      firstPersistRef.current = false;
      return;
    }
    try {
      window.localStorage.setItem(lsKey, JSON.stringify(state));
      window.localStorage.setItem(lsKey + ":ts", String(Date.now()));
    } catch { /* ignore */ }
    // Se esta mudança veio de uma sincronização entre instâncias, apenas
    // consome a flag e NÃO re-anuncia (evita tempestade de broadcasts).
    if (externalApplyRef.current) {
      externalApplyRef.current = false;
      return;
    }
    // Anuncia para as outras instâncias do MESMO key, na MESMA aba, que o
    // localStorage mudou. Sem isso, dois componentes que usam a mesma chave
    // (ex.: Planejamento M3/M4 e o editor de Atividades M1/M2) ficam com
    // cópias divergentes e um sobrescreve o outro.
    try {
      window.dispatchEvent(
        new CustomEvent("aprof:ls-write", { detail: { key, senderId: idRef.current } }),
      );
    } catch { /* ignore */ }
  }, [state, lsKey]);

  // Mantém todas as instâncias do mesmo key sincronizadas DENTRO da aba
  // (CustomEvent "aprof:ls-write") e ENTRE abas (evento nativo "storage").
  // Ao receber, re-lê o localStorage e aplica sem re-anunciar nem empurrar
  // ao remoto (externalApplyRef).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyFromRaw = (raw: string | null) => {
      if (raw == null) return;
      try {
        const parsed = JSON.parse(raw) as unknown;
        const mismatch = detectShapeMismatch(parsed, initialRef.current);
        if (mismatch) return;
        externalApplyRef.current = true;
        setState(parsed as T);
      } catch { /* ignore */ }
    };
    const onLocalWrite = (ev: Event) => {
      const detail = (ev as CustomEvent<{ key?: string; senderId?: string }>).detail;
      if (!detail || detail.key !== key || detail.senderId === idRef.current) return;
      applyFromRaw(window.localStorage.getItem(lsKey));
    };
    const onStorage = (ev: StorageEvent) => {
      if (ev.key !== lsKey) return;
      applyFromRaw(ev.newValue);
    };
    window.addEventListener("aprof:ls-write", onLocalWrite);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("aprof:ls-write", onLocalWrite);
      window.removeEventListener("storage", onStorage);
    };
  }, [key, lsKey]);

  const pullRemote = useCallback(async (uid: string, forcar = false) => {
    try {
      // Se o usuário já mexeu no estado local antes do remote responder,
      // NÃO sobrescreva. Apenas marca como hidratado para liberar o push.
      if (userTouchedRef.current) { hydratedRef.current = true; return; }
      const data = await lerSnapshot(uid, key, forcar);
      if (!data) { hydratedRef.current = true; return; }
      const mismatch = detectShapeMismatch(data.data, initialRef.current);
      if (mismatch) {
        const prev = previewOf(data.data);
        reportStorageIssue({
          key,
          source: "remote-snapshot",
          kind: mismatch.kind,
          expectedType: mismatch.expectedType,
          receivedType: mismatch.receivedType,
          message: `Snapshot remoto incompatível em "${key}" — esperava ${mismatch.expectedType}, recebeu ${mismatch.receivedType}. Mantendo valor local.`,
          rawPreview: prev.text,
          rawSize: prev.size,
          expectedShape: shapeOf(initialRef.current),
          receivedShape: shapeOf(data.data),
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
      // Envia o valor; na nova tentativa usa o que estiver no aparelho (o mais novo).
      const enviar = async (v: unknown): Promise<boolean> => {
        try {
          const { error } = await supabase
            .from("app_snapshots")
            .upsert([{ user_id: uid, key, data: JSON.parse(JSON.stringify(v)), updated_at: new Date().toISOString() }], { onConflict: "user_id,key" });
          return !error;
        } catch {
          return false;
        }
      };
      const ok = await enviar(value);
      if (ok) {
        salvouNaNuvem(`${uid}:${key}`);
        return;
      }
      falhouSalvarNaNuvem(`${uid}:${key}`, async () => {
        if (userIdRef.current !== uid) return true; // trocou de conta: não envia para a errada
        let atual: unknown = value;
        try {
          const raw = window.localStorage.getItem(lsKey);
          if (raw) atual = JSON.parse(raw);
        } catch { /* usa o valor da última tentativa */ }
        return enviar(atual);
      });
    }, 800);
  }, [key, lsKey]);

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
    // Realtime: re-pull this key when another device updates app_snapshots.
    const onSnapChange = (ev: Event) => {
      const detail = (ev as CustomEvent<{ key?: string }>).detail;
      if (!detail || detail.key !== key) return;
      const uid = userIdRef.current;
      if (!uid) return;
      // Suspende a proteção userTouched para permitir overwrite remoto recente.
      userTouchedRef.current = false;
      hydratedRef.current = false;
      void pullRemote(uid, true);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("aprof:snapshot-changed", onSnapChange);
    }
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("aprof:snapshot-changed", onSnapChange);
      }
    };
  }, [pullRemote]);

  // Push on state change (only after hydration to avoid clobbering remote).
  useEffect(() => {
    const uid = userIdRef.current;
    if (!uid) return;
    // Só envia mudanças feitas pelo usuário/app — nunca o valor inicial
    // sintético do useState. Antes da hidratação remota, igualmente envia
    // (se já houve toque), evitando perda quando o usuário salva rápido.
    if (!userTouchedRef.current) return;
    pushRemote(uid, state);
  }, [state, pushRemote]);

  // Wrapper de setState que marca userTouchedRef. Mesma assinatura de useState.
  const setStateTouch: typeof setState = useCallback((value) => {
    userTouchedRef.current = true;
    setState(value);
  }, []);

  return [state, setStateTouch] as const;
}
