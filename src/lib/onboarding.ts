import { supabase } from "@/integrations/supabase/client";

function hasValidPhone(phone?: string | null): boolean {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 11;
}

const OK_KEY = (uid: string) => `aprof:onboarding_ok:${uid}`;

async function lerPerfil(userId: string) {
  return supabase
    .from("profiles")
    .select("onboarding_concluido, telefone")
    .eq("user_id", userId)
    .maybeSingle();
}

/** Returns true if the onboarding should be shown for this user.
 *  Telefone é obrigatório, então sem resposta do banco o padrão continua sendo
 *  mostrar o primeiro acesso. A exceção: quem já passou pela checagem neste
 *  aparelho não é mandado de volta só porque a internet falhou na hora. */
export async function shouldShowOnboarding(userId: string): Promise<boolean> {
  const jaPassou = () => {
    try {
      return window.localStorage.getItem(OK_KEY(userId)) === "1";
    } catch {
      return false;
    }
  };
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      const { data, error } = await lerPerfil(userId);
      if (error) throw error;
      if (!data) return true; // no profile yet → first login
      const precisa = data.onboarding_concluido === false || !hasValidPhone(data.telefone);
      try {
        if (precisa) window.localStorage.removeItem(OK_KEY(userId));
        else window.localStorage.setItem(OK_KEY(userId), "1");
      } catch {
        /* ignore */
      }
      return precisa;
    } catch {
      if (tentativa === 0) await new Promise((r) => setTimeout(r, 1200));
    }
  }
  return !jaPassou();
}

/** Marks onboarding as concluded for the current user (Supabase only).
 *  Optionally persists lead data (name + phone) captured in the onboarding flow. */
export async function markOnboardingDone(lead?: { name?: string; phone?: string; etapa?: string }): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    const uid = user?.id;
    if (!uid) return false;
    const name = lead?.name?.trim();
    const phone = lead?.phone?.trim();
    if (!phone || !hasValidPhone(phone)) return false;
    const patch: {
      onboarding_concluido: boolean;
      display_name?: string;
      email?: string | null;
      telefone?: string;
      etapa_ensino?: string;
      user_id: string;
    } = { onboarding_concluido: true, user_id: uid };
    if (name) patch.display_name = name;
    patch.telefone = phone;
    if (lead?.etapa) patch.etapa_ensino = lead.etapa;
    patch.email = user.email ?? null;
    const { error } = await supabase
      .from("profiles")
      .upsert(patch, { onConflict: "user_id" });
    return !error;
  } catch {
    /* ignore — fail silently per spec */
    return false;
  }
}

/** Deprecated: onboarding state is now Supabase-only. Kept as no-op for compat. */
export async function syncOnboardingFlagIfPending(): Promise<void> {
  // no-op: kept for backward compatibility with existing callers
}