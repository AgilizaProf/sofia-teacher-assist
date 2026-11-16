import { supabase } from "@/integrations/supabase/client";
import { trackReferral } from "@/lib/tracking";

const KEY = "pending_ref_code";

/** Formato do código de indicação (gerado em maiúsculas pelo banco). */
export const REFERRAL_CODE_RE = /^[A-Z0-9]{4,12}$/;

/** Confere no banco se o código existe (RPC segura, devolve só true/false). */
export async function referralCodeExists(code: string): Promise<boolean> {
  const c = String(code || "")
    .trim()
    .toUpperCase();
  if (!REFERRAL_CODE_RE.test(c)) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)("referral_code_exists", { _code: c });
    if (error) {
      // Migration ainda não aplicada: não bloqueia o link (formato já conferido).
      if (
        /referral_code_exists|PGRST202|42883/i.test(`${error.code ?? ""} ${error.message ?? ""}`)
      ) {
        return true;
      }
      return false;
    }
    return data === true;
  } catch {
    return false;
  }
}

export function savePendingReferral(code: string) {
  if (typeof window === "undefined") return;
  const c = String(code || "")
    .trim()
    .toUpperCase();
  if (!REFERRAL_CODE_RE.test(c)) return;
  try {
    localStorage.setItem(KEY, c);
  } catch {
    /* ignore */
  }
}

export function captureReferralFromUrl() {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("ref");
    if (ref) savePendingReferral(ref);
  } catch {
    /* ignore */
  }
}

export function getPendingReferral(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearPendingReferral() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** If the current user has no referred_by_code yet, persist the pending one. */
export async function attachPendingReferral(userId: string) {
  const code = getPendingReferral();
  if (!code) return;
  try {
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("referred_by_code, referral_code")
      .eq("user_id", userId)
      .maybeSingle();
    if (profErr) throw profErr;
    if (!prof) {
      void trackReferral("ref_registro_falhou", { code, meta: { reason: "profile_not_found" } });
      return;
    }
    if (prof.referral_code && prof.referral_code === code) {
      void trackReferral("ref_registro_falhou", { code, meta: { reason: "self_referral" } });
      clearPendingReferral();
      return;
    }
    if (!prof.referred_by_code) {
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ referred_by_code: code })
        .eq("user_id", userId);
      if (updErr) {
        // O banco recusa código inexistente, a própria indicação ou troca
        // de código (trigger profiles_protege_colunas). Não tenta de novo.
        const motivo = /inexistente|auto_indicacao|ja_definido/.exec(updErr.message || "")?.[0];
        if (motivo) {
          void trackReferral("ref_registro_falhou", { code, meta: { reason: motivo } });
          clearPendingReferral();
          return;
        }
        throw updErr;
      }
      void trackReferral("ref_registrado", { code });
    } else if (prof.referred_by_code !== code) {
      void trackReferral("ref_registro_falhou", {
        code,
        meta: { reason: "already_referred", existing: prof.referred_by_code },
      });
    }
    clearPendingReferral();
  } catch (err) {
    void trackReferral("ref_registro_falhou", {
      code,
      meta: { reason: "exception", error: err instanceof Error ? err.message : String(err) },
    });
  }
}
