import { supabase } from "@/integrations/supabase/client";

const LS_KEY = "agp_onboarding_completed";

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

/** Marks onboarding as concluded for the current user (Supabase + localStorage cache). */
export async function markOnboardingDone(): Promise<void> {
  try {
    localStorage.setItem(LS_KEY, "1");
  } catch {
    /* ignore */
  }
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return;
    await supabase
      .from("profiles")
      .update({ onboarding_concluido: true })
      .eq("user_id", uid);
  } catch {
    /* ignore — fail silently per spec */
  }
}

/** Sync helper: if local cache says done but DB might not yet, push it. */
export async function syncOnboardingFlagIfPending(): Promise<void> {
  try {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(LS_KEY) !== "1") return;
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return;
    const { data: prof } = await supabase
      .from("profiles")
      .select("onboarding_concluido")
      .eq("user_id", uid)
      .maybeSingle();
    if (prof && prof.onboarding_concluido === false) {
      await supabase
        .from("profiles")
        .update({ onboarding_concluido: true })
        .eq("user_id", uid);
    }
  } catch {
    /* ignore */
  }
}