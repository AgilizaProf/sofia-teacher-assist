import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { clearLocalAppData } from "@/lib/persist/clearLocalData";
import { shouldShowOnboarding } from "@/lib/onboarding";

const PUBLIC_ROUTES = ["/auth", "/reset-password", "/termos", "/privacidade"];

function isPublic(path: string) {
  return PUBLIC_ROUTES.some((p) => path === p || path.startsWith(p + "/"));
}

/**
 * Enforce session-only persistence when the user did NOT check
 * "Permanecer conectado". Implementation: on first boot of a tab,
 * if the flag says no-persist and there's no in-tab marker, sign out.
 */
export function enforceSessionPersistence() {
  if (typeof window === "undefined") return;
  try {
    const noPersist = localStorage.getItem("sofia_no_persist") === "1";
    const tabAlive = sessionStorage.getItem("sofia_tab_alive") === "1";
    if (noPersist && !tabAlive) {
      clearLocalAppData();
      void supabase.auth.signOut();
    }
    sessionStorage.setItem("sofia_tab_alive", "1");
  } catch {
    /* storage unavailable */
  }
}

export function useAuthGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  // Garante que a checagem de onboarding rode UMA vez por sessão/usuário
  // (não a cada navegação). Reseta no logout.
  const onboardingCheckedRef = useRef<string | null>(null);

  useEffect(() => {
    enforceSessionPersistence();
    let mounted = true;

    // Manda o usuário pro onboarding quando ainda não concluiu OU quando não
    // há telefone válido salvo. Só marca a checagem como resolvida quando o
    // perfil já está completo; assim ninguém volta ao app sem telefone.
    const gateOnboarding = (uid: string, pathname: string) => {
      if (isPublic(pathname) || pathname === "/onboarding") return;
      if (onboardingCheckedRef.current === uid) return;
      void shouldShowOnboarding(uid).then((show) => {
        if (!mounted) return;
        if (show) {
          onboardingCheckedRef.current = null;
          navigate({ to: "/onboarding" });
          return;
        }
        onboardingCheckedRef.current = uid;
      });
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const has = !!data.session;
      setAuthed(has);
      setReady(true);
      if (!has) {
        onboardingCheckedRef.current = null;
        if (!isPublic(location.pathname)) navigate({ to: "/auth" });
        return;
      }
      const uid = data.session?.user?.id;
      if (uid) gateOnboarding(uid, location.pathname);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const has = !!session;
      setAuthed(has);
      if (!has) {
        onboardingCheckedRef.current = null;
        if (!isPublic(window.location.pathname)) navigate({ to: "/auth" });
        return;
      }
      const uid = session?.user?.id;
      if (uid) gateOnboarding(uid, window.location.pathname);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return { ready, authed, isPublicRoute: isPublic(location.pathname) };
}
