import { useEffect, useState } from "react";
import "@/lib/pwa/useInstalarApp";
import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
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
import { RootErrorBoundary, PaginaNaoEncontrada, TelaErro } from "@/components/RootErrorBoundary";
import { installHydrationTelemetry } from "@/lib/sofia/hydrationTelemetry";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useFontSize, useHighContrast } from "@/hooks/useA11y";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { installServerFnAuthFetch } from "@/integrations/supabase/server-fn-fetch";
import { installGetUserCache } from "@/lib/supabase/cacheGetUser";
import {
  installPlatformTelemetry,
  trackPageVisit,
  trackEvent as trackInterno,
} from "@/lib/admin/track";
import { supabase } from "@/integrations/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { syncOnboardingFlagIfPending } from "@/lib/onboarding";
import { MaintenanceBanner } from "@/components/admin/MaintenanceBanner";
import { useLocation } from "@tanstack/react-router";
import { PencilLogo } from "@/components/painel/PainelNav";
import { META_PIXEL_ID, trackPageView } from "@/lib/tracking";

import appCss from "../styles.css?url";

// Antes de qualquer tela montar: evita dezenas de getUser() iguais ao servidor.
if (typeof window !== "undefined") installGetUserCache();

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0B7A55" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "AgilizaProf" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { title: "AgilizaProf — Planejamento, pareceres e inclusão com a Sofia" },
      {
        name: "description",
        content:
          "Plataforma de inteligência artificial pedagógica para professores brasileiros. Crie planos de aula, relatórios e atividades personalizadas em minutos.",
      },
      // O app é área logada: o Google não deve listar essas telas. Só entrar,
      // privacidade e termos liberam a indexação (cada rota sobrescreve esta tag).
      // A página de vendas, que deve aparecer no Google, é www.agilizaprof.com.br.
      { name: "robots", content: "noindex, follow" },
      { name: "author", content: "AgilizaProf" },
      { name: "application-name", content: "AgilizaProf" },
      {
        property: "og:title",
        content: "AgilizaProf — Planejamento, pareceres e inclusão com a Sofia",
      },
      {
        property: "og:description",
        content:
          "Plataforma de inteligência artificial pedagógica para professores brasileiros. Crie planos de aula, relatórios e atividades personalizadas em minutos.",
      },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:site_name", content: "AgilizaProf" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "AgilizaProf — IA pedagógica para educadores" },
      {
        name: "twitter:description",
        content:
          "IA pedagógica para educadores brasileiros. Planos de aula, relatórios e atividades em minutos.",
      },
      // Redes sociais e WhatsApp só leem a imagem com endereço completo.
      { property: "og:image", content: "https://agilizaprof.app.br/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "AgilizaProf: planejamento, pareceres e inclusão em minutos",
      },
      { name: "twitter:image", content: "https://agilizaprof.app.br/og-image.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico?v=2" },
      { rel: "icon", type: "image/png", sizes: "96x96", href: "/favicon-96x96.png?v=2" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg?v=2" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png?v=2" },
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
  notFoundComponent: PaginaNaoEncontrada,
  errorComponent: ({ error }) => {
    console.error("[root errorComponent]", error);
    return <TelaErro />;
  },
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        {/* Meta Pixel (A2/LGPD): sem coleta automática de cliques/formulários
            (autoConfig false), sem PageView automático em troca de rota
            (disablePushState). O PageView sai do RouteTracker (trackPageView),
            só nas páginas de funil permitidas. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq.disablePushState = true;
          fbq('set', 'autoConfig', false, '${META_PIXEL_ID}');
          fbq('init', '${META_PIXEL_ID}');
        `,
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
          #ap-splash{position:fixed;inset:0;background:#EDF0F5;
            display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;z-index:9999;
            transition:opacity .2s ease;font-family:'DM Sans',-apple-system,sans-serif;}
          #ap-splash.hide{opacity:0;visibility:hidden;pointer-events:none;transition:opacity .2s ease,visibility 0s .2s;}
          #ap-splash .ap-logo{font-family:'Sora',Georgia,serif;font-weight:800;font-size:40px;color:#14161F;letter-spacing:-.03em;}
          #ap-splash .ap-logo span{color:#0B7A55;}
          #ap-splash .ap-sub{font-size:13px;color:#596074;font-weight:500;letter-spacing:.04em;}
          #ap-splash .ap-ring{width:36px;height:36px;border:2.5px solid rgba(11,122,85,.25);border-top-color:#0B7A55;
            border-radius:50%;animation:ap-spin 0.9s linear infinite;}
          @keyframes ap-spin{to{transform:rotate(360deg);}}
        `,
          }}
        />
      </head>
      <body>
        <div id="ap-splash" suppressHydrationWarning>
          <div className="ap-logo">
            Agiliza<span>Prof</span>
          </div>
          <div className="ap-ring"></div>
          <div className="ap-sub">Conectando à sua sala de aula…</div>
        </div>
        {children}
        <Scripts />
        <script
          dangerouslySetInnerHTML={{
            __html: `
          window.addEventListener('load', function(){
            setTimeout(function(){
              var s = document.getElementById('ap-splash');
              if(s){s.classList.add('hide');}
            }, 300);
          });
        `,
          }}
        />
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
    // PageView ao Meta só em páginas de funil (filtro em trackPageView).
    // Nada de caminho com id ou parâmetros de busca vai para terceiros.
    trackPageView();
    void supabase.rpc("touch_last_seen" as never).then(
      () => {},
      () => {},
    );
  }, [loc.pathname]);
  return null;
}

/** Troca ids (uuid, números longos, prefixo db:) por ":id" antes de gravar. */
function rotaSemIds(pathname: string): string {
  return pathname
    .split("/")
    .map((seg) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg) ||
      /^\d{4,}$/.test(seg) ||
      /^db:/i.test(seg)
        ? ":id"
        : seg,
    )
    .join("/");
}

/**
 * Cliques: telemetria INTERNA (Supabase), nunca Meta. Só elementos marcados
 * com `data-track="nome-fixo"`; nada de texto do botão, aria-label ou href.
 */
function GlobalClickTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      const el = target?.closest?.("[data-track]") as HTMLElement | null;
      if (!el) return;
      const nome = (el.getAttribute("data-track") || "").trim();
      if (!/^[a-z0-9_.-]{1,60}$/i.test(nome)) return;
      void trackInterno("click", {
        data_track: nome,
        tag: el.tagName.toLowerCase(),
        rota: rotaSemIds(window.location.pathname),
      });
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);
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
  useEffect(() => {
    installHydrationTelemetry();
  }, []);
  useEffect(() => {
    installServerFnAuthFetch();
  }, []);
  useEffect(() => {
    installPlatformTelemetry();
  }, []);
  useEffect(() => {
    void syncOnboardingFlagIfPending();
  }, []);
  const loc = useLocation();
  useEffect(() => {
    trackPageVisit(loc.pathname);
  }, [loc.pathname]);
  useEffect(() => {
    let prevUserId: string | null = null;
    void supabase.auth.getUser().then((res) => {
      prevUserId = res.data.user?.id ?? null;
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
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
  // Rolagem: o roteador (scrollRestoration) já leva ao topo nas páginas novas e
  // devolve a posição ao voltar. Forçar o topo aqui fazia o "voltar" perder o lugar.

  useReducedMotion();
  useFontSize();
  useHighContrast();
  const { ready, authed, isPublicRoute } = useAuthGuard();
  // A tela de abertura sai assim que o app sabe o que mostrar, sem esperar
  // o carregamento de scripts de terceiros (Pixel) e imagens.
  useEffect(() => {
    if (ready || isPublicRoute) document.getElementById("ap-splash")?.classList.add("hide");
  }, [ready, isPublicRoute]);
  // No primeiro acesso a pessoa só informa nome e celular; a Sofia aparece depois.
  const showSofia = ready && authed && !isPublicRoute && loc.pathname !== "/onboarding";

  if (!ready && !isPublicRoute) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          background: "#EDF0F5",
          color: "#14161F",
          fontFamily: "'DM Sans',-apple-system,sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "'Sora',sans-serif",
            fontWeight: 800,
            fontSize: 34,
            letterSpacing: "-.04em",
          }}
        >
          <PencilLogo size={52} />
          <span>
            Agiliza<span style={{ color: "#0B7A55" }}>Prof</span>
          </span>
        </div>
        <div
          style={{
            width: 30,
            height: 30,
            border: "3px solid #CDEFE2",
            borderTopColor: "#0B7A55",
            borderRadius: "50%",
            animation: "ap-spin .9s linear infinite",
          }}
        />
        <div style={{ fontSize: 14, fontWeight: 600, color: "#596074" }}>
          Conectando à sua sala de aula…
        </div>
        <style>{`@keyframes ap-spin{to{transform:rotate(360deg);}}`}</style>
      </div>
    );
  }

  return (
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RealtimeSyncMount />
        <RouteTracker />
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
