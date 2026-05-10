import { supabase } from "@/integrations/supabase/client";

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