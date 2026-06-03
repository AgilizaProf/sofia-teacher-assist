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

  useEffect(() => {
    enforceSessionPersistence();
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const has = !!data.session;
      setAuthed(has);
      setReady(true);
      if (!has && !isPublic(location.pathname)) {
        navigate({ to: "/auth" });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const has = !!session;
      setAuthed(has);
      if (!has && !isPublic(window.location.pathname)) {
        navigate({ to: "/auth" });
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return { ready, authed, isPublicRoute: isPublic(location.pathname) };
}
