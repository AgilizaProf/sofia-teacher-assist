// ====== AgilizaProf — Tracking Service (Meta Pixel) ======
// GA4 será adicionado em outro momento; por ora só Meta Pixel.

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { fbq?: (...args: any[]) => void }
}

type TrackLocation =
  | "login_page"
  | "register_page"
  | "onboarding"
  | "dashboard"
  | "plan_page"
  | "nav"
  | "sidebar"
  | "modal"
  | "button"
  | string;

export interface TrackProps {
  location?: TrackLocation;
  value?: number;
  currency?: string;
  plan?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

function fbqSafe(...args: unknown[]) {
  if (typeof window === "undefined") return;
  const fb = window.fbq;
  if (typeof fb !== "function") return;
  try { fb(...args); } catch { /* noop */ }
}

export function trackPageView() {
  fbqSafe("track", "PageView");
}

export function trackEvent(eventName: string, props: TrackProps = {}) {
  const defaultProps = { app: "agilizaprof", ...props };

  const metaEventMap: Record<string, () => void> = {
    // Autenticação
    click_logar:            () => fbqSafe("track", "Lead", { content_name: "login", content_category: props.location }),
    click_entrar:           () => fbqSafe("track", "Lead", { content_name: "entrar", content_category: props.location }),
    click_cadastrar_gratis: () => fbqSafe("track", "CompleteRegistration", { content_name: "cadastro_gratuito" }),
    cadastro_concluido:     () => fbqSafe("track", "CompleteRegistration", { content_name: "registro_completo" }),
    login_concluido:        () => fbqSafe("track", "Lead", { content_name: "login_sucesso" }),
    // Planos
    click_fazer_plano:      () => fbqSafe("track", "InitiateCheckout", { content_name: props.plan || "plano", value: props.value, currency: "BRL" }),
    click_ver_planos:       () => fbqSafe("track", "ViewContent", { content_name: "pagina_planos" }),
    plano_contratado:       () => fbqSafe("track", "Purchase", { content_name: props.plan || "plano", value: props.value, currency: "BRL" }),
    // Engajamento
    clicou_gerar_relatorio: () => fbqSafe("trackCustom", "GerarRelatorio", defaultProps),
    relatorio_gerado:       () => fbqSafe("trackCustom", "RelatorioGerado", defaultProps),
    clicou_criar_plano:     () => fbqSafe("trackCustom", "CriarPlano", defaultProps),
    plano_gerado:           () => fbqSafe("trackCustom", "PlanoGerado", defaultProps),
    adaptacao_inclusiva:    () => fbqSafe("trackCustom", "AdaptacaoInclusiva", defaultProps),
    clicou_sofia_chat:      () => fbqSafe("trackCustom", "SofiaChat", defaultProps),
    // Tour / Onboarding
    onboarding_iniciado:    () => fbqSafe("track", "ViewContent", { content_name: "onboarding_start" }),
    onboarding_concluido:   () => fbqSafe("trackCustom", "OnboardingConcluido", defaultProps),
  };

  if (metaEventMap[eventName]) metaEventMap[eventName]();
  // Dispara também como custom genérico para análise no Events Manager
  fbqSafe("trackCustom", eventName, defaultProps);

  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[AgilizaProf Track]", eventName, defaultProps);
  }
}