import { supabase } from "@/integrations/supabase/client";
import { trackReferral } from "@/lib/tracking";

const KEY = "pending_ref_code";

export function captureReferralFromUrl() {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("ref");
    if (ref && /^[A-Z0-9]{4,12}$/i.test(ref)) {
      localStorage.setItem(KEY, ref.toUpperCase());
    }
  } catch {
    /* ignore */
  }
}

export function getPendingReferral(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function clearPendingReferral() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
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
      if (updErr) throw updErr;
      void trackReferral("ref_registrado", { code });
    } else if (prof.referred_by_code !== code) {
      void trackReferral("ref_registro_falhou", { code, meta: { reason: "already_referred", existing: prof.referred_by_code } });
    }
    clearPendingReferral();
  } catch (err) {
    void trackReferral("ref_registro_falhou", { code, meta: { reason: "exception", error: err instanceof Error ? err.message : String(err) } });
  }
}