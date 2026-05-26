import { supabase } from "@/integrations/supabase/client";
// Catálogo central de eventos — use sempre estas constantes em vez de strings soltas.
// Isso garante consistência nos nomes e facilita buscas no Admin.
export const EVENTOS = {
  AUTH_SIGNUP: "auth_signup",
  AUTH_LOGIN: "auth_login",
  AUTH_LOGOUT: "auth_logout",

  TURMA_CRIADA: "turma_criada",
  ALUNO_CRIADO: "aluno_criado",

  TRILHA_GERADA: "trilha_gerada",
  PLANO_AULA_GERADO: "plano_aula_gerado",
  PLANO_AULA_SALVO: "plano_aula_salvo",
  ATIVIDADE_GERADA: "atividade_gerada",
  ATIVIDADE_PCD_GERADA: "atividade_pcd_gerada",
  ROTEIRO_EI_GERADO: "roteiro_ei_gerado",
  PEI_CRIADO: "pei_criado",
  PEI_ATUALIZADO: "pei_atualizado",
  PARECER_INCLUSAO_GERADO: "parecer_inclusao_gerado",
  RELATORIO_GERADO: "relatorio_gerado",
  CURRICULO_MUNICIPAL_UPLOAD: "curriculo_municipal_upload",
  AGENDA_EVENTO_CRIADO: "agenda_evento_criado",
  SOFIA_CHAT_MENSAGEM: "sofia_chat_mensagem",

  DOCUMENTO_EXPORTADO: "documento_exportado",
  DOCUMENTO_VISUALIZADO: "documento_visualizado",
  CREDITOS_INSUFICIENTES: "creditos_insuficientes",
  UPGRADE_CLICK: "upgrade_click",
  SOFIA_CARD_TOGGLED: "sofia_card_toggled",
  IA_FALHA: "ia_falha",
  SOFIA_FEEDBACK: "sofia_feedback",
  ONBOARDING_ETAPA: "onboarding_etapa",
  BUSCA_REALIZADA: "busca_realizada",
  FILTRO_APLICADO: "filtro_aplicado",
  FORM_ABANDONADO: "form_abandonado",
  SESSAO_INICIADA: "sessao_iniciada",
  COMPARTILHAMENTO: "compartilhamento",
  FIRST_VALUE_EVENT: "first_value_event",
} as const;

function uaInfo() {
  if (typeof navigator === "undefined") return { device_type: "desktop" as const, os: "", browser: "", ua: "" };
  const ua = navigator.userAgent || "";
  const mobile = /Mobi|Android|iPhone/i.test(ua);
  const tablet = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobi/i.test(ua));
  const device_type: "mobile" | "tablet" | "desktop" = tablet ? "tablet" : mobile ? "mobile" : "desktop";
  let os = "Other";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iOS/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  let browser = "Other";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\//.test(ua)) browser = "Opera";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Safari\//.test(ua)) browser = "Safari";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  return { device_type, os, browser, ua };
}

function sessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = sessionStorage.getItem("agp_session_id");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("agp_session_id", id);
    }
    return id;
  } catch { return "anon"; }
}

export async function trackPageVisit(route: string) {
  if (typeof window === "undefined") return;
  try {
    const { device_type, os, browser, ua } = uaInfo();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("page_visits").insert({
      session_id: sessionId(),
      user_id: user?.id ?? null,
      route,
      referrer: document.referrer || null,
      device_type,
      os,
      browser,
      viewport_w: window.innerWidth,
      viewport_h: window.innerHeight,
      is_login_page: route.startsWith("/auth"),
      user_agent: ua,
    });
  } catch { /* ignore */ }
}

export async function trackEvent(event_type: string, metadata: Record<string, unknown> = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("activity_events").insert({
      user_id: user?.id ?? null,
      event_type,
      route: typeof window !== "undefined" ? window.location.pathname : null,
      metadata: metadata as never,
    });
  } catch { /* ignore */ }
}

export async function reportError(message: string, opts: { stack?: string; severity?: "info"|"warn"|"error"|"fatal"; metadata?: Record<string, unknown> } = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("platform_errors").insert({
      user_id: user?.id ?? null,
      route: typeof window !== "undefined" ? window.location.pathname : null,
      message: String(message).slice(0, 2000),
      stack: opts.stack?.slice(0, 8000) ?? null,
      severity: opts.severity ?? "error",
      metadata: (opts.metadata ?? {}) as never,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch { /* ignore */ }
}

let installed = false;
export function installPlatformTelemetry() {
  if (typeof window === "undefined" || installed) return;
  installed = true;
  window.addEventListener("error", (e) => {
    reportError(e.message || "window.error", { stack: e.error?.stack, severity: "error" });
  });
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    reportError(reason?.message || String(reason), { stack: reason?.stack, severity: "error" });
  });
}
