import { supabase } from "@/integrations/supabase/client";

/** Returns true if the onboarding should be shown for this user. */
export async function shouldShowOnboarding(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("onboarding_concluido")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return false; // fail-safe: do not block user
    if (!data) return true; // no profile yet → first login
    return data.onboarding_concluido === false;
  } catch {
    return false;
  }
}

/** Marks onboarding as concluded for the current user (Supabase only).
 *  Optionally persists lead data (name + phone) captured in the onboarding flow. */
export async function markOnboardingDone(lead?: { name?: string; phone?: string }): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return;
    const patch: Record<string, unknown> = { onboarding_concluido: true };
    const name = lead?.name?.trim();
    const phone = lead?.phone?.trim();
    if (name) patch.display_name = name;
    if (phone) patch.telefone = phone;
    await supabase
      .from("profiles")
      .update(patch)
      .eq("user_id", uid);
  } catch {
    /* ignore — fail silently per spec */
  }
}

/** Deprecated: onboarding state is now Supabase-only. Kept as no-op for compat. */
export async function syncOnboardingFlagIfPending(): Promise<void> {
  // no-op: kept for backward compatibility with existing callers
}