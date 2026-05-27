import { useEffect, useState } from "react";
import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { SofiaProvider } from "@/components/sofia/SofiaProvider";
import { SofiaWidget } from "@/components/sofia/SofiaWidget";
import { SofiaContextProvider } from "@/lib/sofia/sofiaContext";
import { SofiaUserDataProvider } from "@/lib/sofia/SofiaUserContext";
import { CreditosGateProvider } from "@/lib/creditos/CreditosGate";
import { SofiaNotificationsProvider } from "@/lib/sofia/notifications";
import { SofiaNotificationsWidget } from "@/components/sofia/SofiaNotificationsWidget";
import { SofiaAutoReminders } from "@/lib/sofia/autoReminders";
import { SofiaErrorBoundary } from "@/components/sofia/SofiaErrorBoundary";
import { RootErrorBoundary } from "@/components/RootErrorBoundary";
import { installHydrationTelemetry } from "@/lib/sofia/hydrationTelemetry";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useFontSize, useHighContrast } from "@/hooks/useA11y";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { installServerFnAuthFetch } from "@/integrations/supabase/server-fn-fetch";
import { installPlatformTelemetry, trackPageVisit } from "@/lib/admin/track";
import { supabase } from "@/integrations/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { syncOnboardingFlagIfPending } from "@/lib/onboarding";
import { MaintenanceBanner } from "@/components/admin/MaintenanceBanner";
import { useLocation } from "@tanstack/react-router";
import { MobileTopBar } from "@/components/MobileTopBar";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
  meta: [
    { charSet: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { title: "Sofia Teacher Assist | AgilizaProf — IA para Educadores Brasileiros" },
    { name: "description", content: "Plataforma de inteligência artificial pedagógica para professores brasileiros. Crie planos de aula, relatórios e atividades personalizadas em minutos." },
    { name: "author", content: "AgilizaProf" },
    { name: "application-name", content: "AgilizaProf" },
    { property: "og:title", content: "Sofia Teacher Assist | AgilizaProf — IA para Educadores Brasileiros" },
    { property: "og:description", content: "Plataforma de inteligência artificial pedagógica para professores brasileiros. Crie planos de aula, relatórios e atividades personalizadas em minutos." },
    { property: "og:type", content: "website" },
    { property: "og:locale", content: "pt_BR" },
    { property: "og:site_name", content: "AgilizaProf" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Sofia Teacher Assist | AgilizaProf" },
    { name: "twitter:description", content: "IA pedagógica para educadores brasileiros. Planos de aula, relatórios e atividades em minutos." },
    { property: "og:image", content: "/og-image.png" },
    { name: "twitter:image", content: "/og-image.png" },
  ],
  links: [
    { rel: "stylesheet", href: appCss },
    { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
    { rel: "icon", type: "image/png", sizes: "96x96", href: "/favicon-96x96.png" },
    { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Fraunces:wght@600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap",
    },
  ],
}),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ({ error }) => {
    console.error("[root errorComponent]", error);
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-foreground">Ops! Algo deu errado.</h1>
          <p className="mt-2 text-sm text-muted-foreground">Tente novamente em alguns instantes.</p>
          <button
            onClick={() => { if (typeof window !== "undefined") window.location.reload(); }}
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  },
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        <style dangerouslySetInnerHTML={{ __html: `
          #ap-splash{position:fixed;inset:0;background:linear-gradient(135deg,#1B2A4E 0%,#0F1B36 100%);
            display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;z-index:9999;
            transition:opacity .4s ease;font-family:'Inter',-apple-system,sans-serif;}
          #ap-splash.hide{opacity:0;pointer-events:none;}
          #ap-splash .ap-logo{font-family:'Fraunces',Georgia,serif;font-weight:900;font-size:40px;color:#fff;letter-spacing:-.03em;}
          #ap-splash .ap-logo span{color:#FF7A45;}
          #ap-splash .ap-sub{font-size:13px;color:rgba(255,255,255,.6);font-weight:500;letter-spacing:.04em;}
          #ap-splash .ap-ring{width:36px;height:36px;border:2.5px solid rgba(255,122,69,.25);border-top-color:#FF7A45;
            border-radius:50%;animation:ap-spin 0.9s linear infinite;}
          @keyframes ap-spin{to{transform:rotate(360deg);}}
        `}} />
      </head>
      <body>
        <div id="ap-splash">
          <div className="ap-logo">Agiliza<span>Prof</span></div>
          <div className="ap-ring"></div>
          <div className="ap-sub">Conectando à sua sala de aula…</div>
        </div>
        {children}
        <Scripts />
        <script dangerouslySetInnerHTML={{ __html: `
          window.addEventListener('load', function(){
            setTimeout(function(){
              var s = document.getElementById('ap-splash');
              if(s){s.classList.add('hide');setTimeout(function(){if(s.parentNode)s.parentNode.removeChild(s);},450);}
            }, 300);
          });
        `}} />
      </body>
    </html>
  );
}
function RealtimeSyncMount() {
  useRealtimeSync();
  return null;
}

function RootComponent() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60, // 1min default
            gcTime: 1000 * 60 * 30,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  useEffect(() => { installHydrationTelemetry(); }, []);
  useEffect(() => { installServerFnAuthFetch(); }, []);
  useEffect(() => { installPlatformTelemetry(); }, []);
  useEffect(() => { void syncOnboardingFlagIfPending(); }, []);
  const loc = useLocation();
  useEffect(() => { trackPageVisit(loc.pathname); }, [loc.pathname]);
  useEffect(() => {
    let prevUserId: string | null = null;
    void supabase.auth.getUser().then((res) => { prevUserId = res.data.user?.id ?? null; });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      const uid = session?.user?.id ?? null;
      if (event === "SIGNED_IN" && uid && uid !== prevUserId) {
        const meta = session?.user?.user_metadata ?? {};
        const created = session?.user?.created_at ? new Date(session.user.created_at).getTime() : 0;
        const isNew = created && Date.now() - created < 1000 * 60 * 5;
        void import("@/lib/admin/track").then(({ trackEvent }) =>
          trackEvent(isNew ? "auth_signup" : "auth_login", {
            provider: session?.user?.app_metadata?.provider ?? "email",
            email: session?.user?.email ?? null,
            display_name: meta.display_name ?? meta.name ?? null,
          }),
        );
      } else if (event === "SIGNED_OUT" && prevUserId) {
        void import("@/lib/admin/track").then(({ trackEvent }) =>
          trackEvent("auth_logout", { user_id: prevUserId }),
        );
      }
      prevUserId = uid;
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, [loc.pathname]);

  useReducedMotion();
  useFontSize();
  useHighContrast();
  const { ready, authed, isPublicRoute } = useAuthGuard();
  const showSofia = ready && authed && !isPublicRoute;

  if (!ready && !isPublicRoute) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16,
        background: "linear-gradient(135deg,#1B2A4E,#0F1B36)",
        fontFamily: "'Inter',-apple-system,sans-serif",
      }}>
        <div style={{ fontFamily: "'Fraunces',Georgia,serif", fontWeight: 900, fontSize: 38, color: "#fff", letterSpacing: "-.03em" }}>
          Agiliza<span style={{ color: "#FF7A45" }}>Prof</span>
        </div>
        <div style={{
          width: 34, height: 34,
          border: "2.5px solid rgba(255,122,69,.25)",
          borderTopColor: "#FF7A45",
          borderRadius: "50%",
          animation: "ap-spin .9s linear infinite",
        }} />
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)" }}>Conectando à sua sala de aula…</div>
        <style>{`@keyframes ap-spin{to{transform:rotate(360deg);}}`}</style>
      </div>
    );
  }

  return (
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RealtimeSyncMount />
      {/* Ordem dos providers (externo → interno):
          1. SofiaContextProvider     — contexto base (rota, turma, aluno)
          2. SofiaUserDataProvider    — dados do usuário (depende do contexto base)
          3. SofiaNotificationsProvider — notificações (depende do user data)
          4. SofiaProvider            — chat Sofia (consome todos os anteriores)
          Componentes filhos sempre dentro dos providers que eles consomem. */}
      <SofiaContextProvider>
        <SofiaUserDataProvider>
          {/* <SofiaNotificationsProvider> */}
            <SofiaProvider>
              <CreditosGateProvider>
                <MaintenanceBanner />
                {showSofia && <MobileTopBar />}
                <Outlet />
              </CreditosGateProvider>
              {showSofia && (
                <>
                  <SofiaErrorBoundary area="o assistente Sofia" silent>
                    <SofiaWidget />
                  </SofiaErrorBoundary>
                  <SofiaErrorBoundary area="os lembretes da Sofia" silent>
                    <SofiaAutoReminders />
                  </SofiaErrorBoundary>
                </>
              )}
              <Toaster position="top-right" richColors />
            </SofiaProvider>
         {/* </SofiaNotificationsProvider> */}
        </SofiaUserDataProvider>
      </SofiaContextProvider>
      </QueryClientProvider>
    </RootErrorBoundary>
  );
}
