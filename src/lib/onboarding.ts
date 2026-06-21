import { supabase } from "@/integrations/supabase/client";

function hasValidPhone(phone?: string | null): boolean {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 11;
}

/** Returns true if the onboarding should be shown for this user. */
export async function shouldShowOnboarding(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("onboarding_concluido, telefone")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return true; // phone is mandatory: fail closed so users cannot bypass the gate
    if (!data) return true; // no profile yet → first login
    return data.onboarding_concluido === false || !hasValidPhone(data.telefone);
  } catch {
    return true;
  }
}

/** Marks onboarding as concluded for the current user (Supabase only).
 *  Optionally persists lead data (name + phone) captured in the onboarding flow. */
export async function markOnboardingDone(lead?: { name?: string; phone?: string }): Promise<boolean> {
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
      user_id: string;
    } = { onboarding_concluido: true, user_id: uid };
    if (name) patch.display_name = name;
    patch.telefone = phone;
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