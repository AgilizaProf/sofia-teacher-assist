import { useEffect, useState } from "react";
import "@/lib/pwa/useInstalarApp";
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
import { PencilLogo } from "@/components/painel/PainelNav";
import { trackEvent, trackPageView } from "@/lib/tracking";

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
    { name: "theme-color", content: "#0B7A55" },
    { name: "mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-title", content: "AgilizaProf" },
    { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    { title: "AgilizaProf — Planejamento, pareceres e inclusão com a Sofia" },
    { name: "description", content: "Plataforma de inteligência artificial pedagógica para professores brasileiros. Crie planos de aula, relatórios e atividades personalizadas em minutos." },
    { name: "author", content: "AgilizaProf" },
    { name: "application-name", content: "AgilizaProf" },
    { property: "og:title", content: "AgilizaProf — Planejamento, pareceres e inclusão com a Sofia" },
    { property: "og:description", content: "Plataforma de inteligência artificial pedagógica para professores brasileiros. Crie planos de aula, relatórios e atividades personalizadas em minutos." },
    { property: "og:type", content: "website" },
    { property: "og:locale", content: "pt_BR" },
    { property: "og:site_name", content: "AgilizaProf" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "AgilizaProf — IA pedagógica para educadores" },
    { name: "twitter:description", content: "IA pedagógica para educadores brasileiros. Planos de aula, relatórios e atividades em minutos." },
    // Redes sociais e WhatsApp só leem a imagem com endereço completo.
    { property: "og:image", content: "https://agilizaprof.app.br/og-image.png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: "AgilizaProf: planejamento, pareceres e inclusão em minutos" },
    { name: "twitter:image", content: "https://agilizaprof.app.br/og-image.png" },
  ],
  links: [
    { rel: "stylesheet", href: appCss },
    { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
    { rel: "icon", type: "image/png", sizes: "96x96", href: "/favicon-96x96.png" },
    { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
    { rel: "manifest", href: "/site.webmanifest" },
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Sora:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap",
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
        <script dangerouslySetInnerHTML={{ __html: `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '966501615841208');
          fbq('track', 'PageView');
        `}} />
        <style dangerouslySetInnerHTML={{ __html: `
          #ap-splash{position:fixed;inset:0;background:#EDF0F5;
            display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;z-index:9999;
            transition:opacity .4s ease;font-family:'DM Sans',-apple-system,sans-serif;}
          #ap-splash.hide{opacity:0;pointer-events:none;}
          #ap-splash .ap-logo{font-family:'Sora',Georgia,serif;font-weight:900;font-size:40px;color:#14161F;letter-spacing:-.03em;}
          #ap-splash .ap-logo span{color:#0B7A55;}
          #ap-splash .ap-sub{font-size:13px;color:#596074;font-weight:500;letter-spacing:.04em;}
          #ap-splash .ap-ring{width:36px;height:36px;border:2.5px solid rgba(11,122,85,.25);border-top-color:#0B7A55;
            border-radius:50%;animation:ap-spin 0.9s linear infinite;}
          @keyframes ap-spin{to{transform:rotate(360deg);}}
        `}} />
      </head>
      <body>
        <noscript>
          <img height={1} width={1} style={{ display: "none" }} src="https://www.facebook.com/tr?id=966501615841208&ev=PageView&noscript=1" alt="" />
        </noscript>
        <div id="ap-splash" suppressHydrationWarning>
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
              if(s){s.classList.add('hide');}
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

function RouteTracker() {
  const loc = useLocation();
  useEffect(() => {
    trackEvent("page_view", {
      location: loc.pathname,
      page_path: loc.pathname,
      page_search: loc.search ? JSON.stringify(loc.search) : "",
    });
    trackPageView();
    void supabase.rpc("touch_last_seen" as never).then(() => {}, () => {});
  }, [loc.pathname]);
  return null;
}

function IdleTracker() {
  const loc = useLocation();
  useEffect(() => {
    if (typeof window === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let fired = false;
    const reset = () => {
      if (timer) clearTimeout(timer);
      fired = false;
      timer = setTimeout(() => {
        if (fired) return;
        fired = true;
        trackEvent("user_idle_30s", { location: window.location.pathname });
      }, 30000);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [loc.pathname]);
  return null;
}

function GlobalClickTracker() {
  const loc = useLocation();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      const el = target.closest(
        'button, a, [role="button"], [role="link"], [data-track]',
      ) as HTMLElement | null;
      if (!el) return;
      const text = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("title") || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
      const href = el.getAttribute("href") || undefined;
      const id = el.id || undefined;
      const dataTrack = el.getAttribute("data-track") || undefined;
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute("role") || undefined;
      try {
        trackEvent("click", {
          location: window.location.pathname,
          label: text || dataTrack || id || tag,
          tag,
          role,
          href,
          element_id: id,
          data_track: dataTrack,
        });
      } catch {
        /* noop */
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [loc.pathname]);
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
  // No primeiro acesso a pessoa só informa nome e celular; a Sofia aparece depois.
  const showSofia = ready && authed && !isPublicRoute && loc.pathname !== "/onboarding";

  if (!ready && !isPublicRoute) {
    return (
      <div
        style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 18,
          background: "#EDF0F5", color: "#14161F",
          fontFamily: "'DM Sans',-apple-system,sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 34, letterSpacing: "-.04em" }}>
          <PencilLogo size={52} />
          <span>
            Agiliza<span style={{ color: "#0B7A55" }}>Prof</span>
          </span>
        </div>
        <div style={{
          width: 30, height: 30,
          border: "3px solid #CDEFE2",
          borderTopColor: "#0B7A55",
          borderRadius: "50%",
          animation: "ap-spin .9s linear infinite",
        }} />
        <div style={{ fontSize: 14, fontWeight: 600, color: "#596074" }}>Conectando à sua sala de aula…</div>
        <style>{`@keyframes ap-spin{to{transform:rotate(360deg);}}`}</style>
      </div>
    );
  }

  return (
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RealtimeSyncMount />
        <RouteTracker />
        <IdleTracker />
        <GlobalClickTracker />
      {/* Ordem dos providers (externo → interno):
          1. SofiaContextProvider     — contexto base (rota, turma, aluno)
          2. SofiaUserDataProvider    — dados do usuário (depende do contexto base)
          3. SofiaNotificationsProvider — notificações (depende do user data)
          4. SofiaProvider            — chat Sofia (consome todos os anteriores)
          Componentes filhos sempre dentro dos providers que eles consomem. */}
      <SofiaContextProvider>
        <SofiaUserDataProvider>
          <SofiaNotificationsProvider>
            <SofiaProvider>
              <CreditosGateProvider>
                <MaintenanceBanner />
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
         </SofiaNotificationsProvider>
        </SofiaUserDataProvider>
      </SofiaContextProvider>
      </QueryClientProvider>
    </RootErrorBoundary>
  );
}
