import { useEffect, useState } from "react";
import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { SofiaProvider } from "@/components/sofia/SofiaProvider";
import { SofiaWidget } from "@/components/sofia/SofiaWidget";
import { SofiaContextProvider } from "@/lib/sofia/sofiaContext";
import { SofiaUserDataProvider } from "@/lib/sofia/SofiaUserContext";
// import { SofiaNotificationsProvider } from "@/lib/sofia/notifications";
// import { SofiaNotificationsWidget } from "@/components/sofia/SofiaNotificationsWidget";
import { SofiaAutoReminders } from "@/lib/sofia/autoReminders";
import { SofiaErrorBoundary } from "@/components/sofia/SofiaErrorBoundary";
import { RootErrorBoundary } from "@/components/RootErrorBoundary";
import { installHydrationTelemetry } from "@/lib/sofia/hydrationTelemetry";
import { useReducedMotion } from "@/hooks/useReducedMotion";
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
      { title: "AgilizaProf" },
      { name: "description", content: "Sofia for Teachers is a pedagogical AI assistant for Brazilian educators." },
      { name: "author", content: "AgilizaProf" },
      { name: "application-name", content: "AgilizaProf" },
      { property: "og:title", content: "AgilizaProf" },
      { property: "og:description", content: "Sofia for Teachers is a pedagogical AI assistant for Brazilian educators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "AgilizaProf" },
      { name: "twitter:description", content: "Sofia for Teachers is a pedagogical AI assistant for Brazilian educators." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9850110d-5b52-4bee-9778-fa385c45daab/id-preview-65bc6e08--78454ba7-01c4-4f0e-9022-57d7e6100742.lovable.app-1777824672365.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9850110d-5b52-4bee-9778-fa385c45daab/id-preview-65bc6e08--78454ba7-01c4-4f0e-9022-57d7e6100742.lovable.app-1777824672365.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
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
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
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
  const { ready, authed, isPublicRoute } = useAuthGuard();
  const showSofia = ready && authed && !isPublicRoute;
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
              <MaintenanceBanner />
              {showSofia && <MobileTopBar />}
              <Outlet />
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
