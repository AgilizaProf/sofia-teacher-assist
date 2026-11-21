// ====== AgilizaProf — Meta Pixel (só marketing) ======
//
// LGPD (auditoria A2): ao Meta só vão eventos de marketing de uma lista
// FECHADA, com parâmetros fixos. Nunca texto de botão, nome de aluno,
// diagnóstico, e-mail, rota com id ou parâmetros de busca.
//  - `trackEvent` com um nome fora da lista não envia nada ao Meta.
//  - O Pixel só dispara em páginas públicas/de funil (`META_ROTAS_PERMITIDAS`).
//  - O carregamento do Pixel (em __root.tsx) desliga a coleta automática
//    (`autoConfig`) e o PageView automático em mudança de rota.
// Telemetria interna (uso do app) fica em `@/lib/admin/track` (Supabase).

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fbq?: ((...args: any[]) => void) & { disablePushState?: boolean };
  }
}

export const META_PIXEL_ID = "966501615841208";

/**
 * Páginas onde o Pixel pode disparar: entrada, cadastro, onboarding, planos,
 * indicações e confirmação de pagamento. Nenhuma tem dado de aluno.
 * Também vale o link curto de indicação (`/CODIGO`).
 * Mantido como string para ser usado também no script inline de __root.tsx.
 */
export const META_ROTAS_PERMITIDAS_RE_SRC =
  "^/(|auth|auth/callback|reset-password|termos|privacidade|onboarding|configuracoes|indicacoes|pagamento-confirmado-mensal|pagamento-confirmado-anual|[A-Z0-9]{4,12})/?$";

const META_ROTAS_PERMITIDAS = new RegExp(META_ROTAS_PERMITIDAS_RE_SRC);

export function metaPermitidoNaRota(pathname: string): boolean {
  return META_ROTAS_PERMITIDAS.test(pathname || "/");
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
  if (!metaPermitidoNaRota(window.location.pathname)) return;
  const fb = window.fbq;
  if (typeof fb !== "function") return;
  try {
    fb(...args);
  } catch {
    /* noop */
  }
}

export function trackPageView() {
  fbqSafe("track", "PageView");
}

const PLANOS = new Set(["mensal", "anual"]);
const plano = (p: unknown) => (typeof p === "string" && PLANOS.has(p) ? p : "plano");
const valor = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/**
 * Lista fechada de eventos que chegam ao Meta. Os parâmetros são montados
 * aqui, nunca repassados de quem chama.
 */
const META_EVENTOS: Record<string, (props: TrackProps) => void> = {
  // Autenticação
  click_logar: () => fbqSafe("track", "Lead", { content_name: "login" }),
  click_entrar: () => fbqSafe("track", "Lead", { content_name: "entrar" }),
  click_cadastrar_gratis: () =>
    fbqSafe("track", "CompleteRegistration", { content_name: "cadastro_gratuito" }),
  cadastro_concluido: () =>
    fbqSafe("track", "CompleteRegistration", { content_name: "registro_completo" }),
  login_concluido: () => fbqSafe("track", "Lead", { content_name: "login_sucesso" }),
  // Planos
  click_fazer_plano: (p) =>
    fbqSafe("track", "InitiateCheckout", {
      content_name: plano(p.plan),
      value: valor(p.value),
      currency: "BRL",
    }),
  click_ver_planos: () => fbqSafe("track", "ViewContent", { content_name: "pagina_planos" }),
  plano_contratado: (p) =>
    fbqSafe(
      "track",
      "Purchase",
      { content_name: plano(p.plan), value: valor(p.value), currency: "BRL" },
      // eventID permite ao Meta descartar duplicatas do mesmo pagamento
      typeof p.event_id === "string" ? { eventID: p.event_id } : undefined,
    ),
  // Onboarding
  onboarding_iniciado: () => fbqSafe("track", "ViewContent", { content_name: "onboarding_start" }),
  onboarding_concluido: () => fbqSafe("trackCustom", "OnboardingConcluido"),
  // Indicação (só o que é funil de aquisição)
  ref_cadastro_via_link: () =>
    fbqSafe("track", "Lead", { content_name: "ref_link", content_category: "referral" }),
};

export function trackEvent(eventName: string, props: TrackProps = {}) {
  const enviar = Object.prototype.hasOwnProperty.call(META_EVENTOS, eventName)
    ? META_EVENTOS[eventName]
    : undefined;
  if (enviar) enviar(props);

  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[AgilizaProf Track]", eventName, enviar ? "(Meta)" : "(só local)");
  }
}

/**
 * Evento do funil de indicação: grava no backend (`referral_events`) para o
 * painel interno. Ao Meta só vai o que estiver em `META_EVENTOS` (sem o
 * código nem metadados). Pode ser chamado sem login (visita /CODIGO).
 */
export async function trackReferral(
  event:
    | "ref_visualizar_secao"
    | "ref_copiar_link"
    | "ref_compartilhar"
    | "ref_cadastro_via_link"
    | "ref_registrado"
    | "ref_registro_falhou"
    | "ref_conversao",
  opts: { code?: string | null; meta?: Record<string, unknown> } = {},
) {
  trackEvent(event);
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.rpc as any)("log_referral_event", {
      _event: event,
      _code: opts.code ?? null,
      _meta: opts.meta ?? null,
    });
  } catch {
    /* best-effort — não bloqueia UX */
  }
}
