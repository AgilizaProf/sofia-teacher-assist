/**
 * Telemetria leve para detectar falhas de hidratação envolvendo a Sofia.
 *
 * Por que existe: já tivemos um incidente em que o relógio do servidor
 * (UTC) e o do cliente divergiam, gerando "Hydration failed" e jogando
 * a árvore inteira no errorBoundary ("Something went wrong"). Queremos
 * detectar regressões parecidas o quanto antes, sem precisar de um
 * provider de APM externo.
 *
 * Estratégia (100% client-side, custo zero):
 *  - escuta `window.error` e `unhandledrejection`
 *  - faz match nas mensagens conhecidas do React 18/19 para hydration
 *  - se a stack/componente contiver "Sofia", marca como "sofia"
 *  - registra em sessionStorage (anel de 10) e dispara um CustomEvent
 *    `sofia:hydration-error` para qualquer dashboard/dev tool ouvir
 *  - loga uma única vez via console.warn com prefixo `[sofia-hydration]`
 *
 * Não envia nada para a rede. Se quisermos plugar em um backend depois,
 * basta ouvir o CustomEvent ou ler `getHydrationEvents()`.
 */

const STORAGE_KEY = "sofia_hydration_events";
const MAX_EVENTS = 10;

export type HydrationEvent = {
  at: string;             // ISO timestamp
  route: string;          // pathname no momento do erro
  scope: "sofia" | "app"; // se a stack menciona Sofia ou não
  message: string;
  stack?: string;
  userAgent?: string;
  tzOffsetMin: number;    // ajuda a correlacionar com bugs de timezone
};

// Padrões usados pelo React para erros de hidratação. Mantemos uma lista
// curta e tolerante a variações de versão.
const HYDRATION_PATTERNS = [
  /hydrat(ion|ing|ed)/i,
  /did not match/i,
  /Text content does not match/i,
  /server rendered HTML/i,
  /Minified React error #(418|419|421|422|423|425)/, // hydration mismatch family
];

function isHydrationMessage(msg: string | undefined): boolean {
  if (!msg) return false;
  return HYDRATION_PATTERNS.some((re) => re.test(msg));
}

function mentionsSofia(text: string | undefined): boolean {
  if (!text) return false;
  return /sofia/i.test(text);
}

function readEvents(): HydrationEvent[] {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function pushEvent(ev: HydrationEvent) {
  try {
    const list = readEvents();
    list.push(ev);
    while (list.length > MAX_EVENTS) list.shift();
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* sessionStorage indisponível — silencia */
  }
}

export function getHydrationEvents(): HydrationEvent[] {
  if (typeof window === "undefined") return [];
  return readEvents();
}

export function clearHydrationEvents() {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

function record(message: string, stack: string | undefined) {
  const scope: HydrationEvent["scope"] = mentionsSofia(`${message}\n${stack ?? ""}`) ? "sofia" : "app";
  const ev: HydrationEvent = {
    at: new Date().toISOString(),
    route: typeof location !== "undefined" ? location.pathname : "",
    scope,
    message: message.slice(0, 500),
    stack: stack?.slice(0, 1500),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    tzOffsetMin: new Date().getTimezoneOffset(),
  };
  pushEvent(ev);
  // Aviso único por evento — nunca usar console.error para não confundir
  // com erros reais já reportados pelo React.
  console.warn(`[sofia-hydration] ${scope === "sofia" ? "Sofia" : "App"} hydration mismatch detectado`, ev);
  try {
    window.dispatchEvent(new CustomEvent("sofia:hydration-error", { detail: ev }));
  } catch { /* ignore */ }
}

let installed = false;

/** Instala os listeners uma única vez. Chamar dentro de useEffect no root. */
export function installHydrationTelemetry() {
  if (typeof window === "undefined" || installed) return;
  installed = true;

  window.addEventListener("error", (event) => {
    const msg = event.message || (event.error && (event.error as Error).message);
    const stack = event.error instanceof Error ? event.error.stack : undefined;
    if (isHydrationMessage(msg) || isHydrationMessage(stack)) {
      record(msg ?? "hydration error", stack);
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason as unknown;
    const msg = reason instanceof Error ? reason.message : typeof reason === "string" ? reason : undefined;
    const stack = reason instanceof Error ? reason.stack : undefined;
    if (isHydrationMessage(msg) || isHydrationMessage(stack)) {
      record(msg ?? "hydration rejection", stack);
    }
  });
}