import { createHmac, timingSafeEqual } from "crypto";

/** Parse `ts=...,v1=...` style x-signature header into a key/value map. */
export function parseSignatureHeader(header: string): Record<string, string> {
  return Object.fromEntries(
    (header || "")
      .split(",")
      .map((p) => p.trim().split("="))
      .filter((p) => p.length === 2)
      .map(([k, v]) => [k.trim(), v.trim()]),
  );
}

/** Build the canonical MP manifest string. */
export function buildManifest(dataId: string, requestId: string, ts: string): string {
  return `id:${dataId};request-id:${requestId};ts:${ts};`;
}

/** Compute the v1 HMAC-SHA256 hex signature for a manifest. */
export function computeV1(secret: string, manifest: string): string {
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

/** Constant-time compare two hex strings. Returns false on length mismatch. */
export function safeHexEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length === 0 || ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export interface VerifySignatureInput {
  secret: string;
  signatureHeader: string;
  requestId: string;
  dataId: string;
}
export interface VerifySignatureResult {
  valid: boolean;
  ts: string;
  v1Received: string;
  v1Expected: string;
  manifest: string;
}
export function verifySignature(input: VerifySignatureInput): VerifySignatureResult {
  const parts = parseSignatureHeader(input.signatureHeader);
  const ts = parts["ts"] || "";
  const v1 = parts["v1"] || "";
  const manifest = buildManifest(input.dataId, input.requestId, ts);
  const expected = input.secret ? computeV1(input.secret, manifest) : "";
  const valid = !!ts && !!v1 && !!input.requestId && !!input.dataId && safeHexEqual(expected, v1);
  return { valid, ts, v1Received: v1, v1Expected: expected, manifest };
}

export interface RawWebhookPayload {
  type?: string;
  action?: string;
  data?: { id?: string | number };
}
export interface ParsedEvent {
  payload: RawWebhookPayload;
  parseError: string | null;
  dataId: string;
  eventType: string;
  isPreapproval: boolean;
}

/** Parse raw body + URL params into an event descriptor. */
export function parseWebhookEvent(rawBody: string, url: URL): ParsedEvent {
  let payload: RawWebhookPayload = {};
  let parseError: string | null = null;
  try {
    payload = rawBody ? (JSON.parse(rawBody) as RawWebhookPayload) : {};
  } catch (e) {
    parseError = e instanceof Error ? e.message : "invalid JSON";
  }
  const dataId =
    payload?.data?.id?.toString() ||
    url.searchParams.get("data.id") ||
    url.searchParams.get("id") ||
    "";
  const eventType = (payload?.type || url.searchParams.get("type") || "").toLowerCase();
  const isPreapproval = eventType.includes("preapproval") || eventType.includes("subscription");
  return { payload, parseError, dataId, eventType, isPreapproval };
}

export type PlannedAction =
  | "skip:invalid_signature"
  | "skip:not_preapproval"
  | "skip:no_email"
  | "skip:no_profile"
  | "skip:active_admin_grant"
  | "upsert:active"
  | "update:canceled"
  | "update:metadata_only";

export interface DecideInput {
  signatureValid: boolean;
  isPreapproval: boolean;
  preapproval: { status?: string; payer_email?: string; external_reference?: string | null } | null;
  userId: string | null;
  currentSubscription: {
    source?: string | null;
    plano?: string | null;
    current_period_end?: string | null;
  } | null;
  /** Allows tests to fix "now" — defaults to Date.now(). */
  now?: Date;
}

/** Pure decision function — mirrors the live webhook + dry-run endpoint. */
export function decidePlannedAction(input: DecideInput): PlannedAction {
  if (!input.signatureValid) return "skip:invalid_signature";
  if (!input.isPreapproval) return "skip:not_preapproval";
  const email = normalizeEmail(input.preapproval?.payer_email);
  const extRef = userIdFromExternalReference(input.preapproval?.external_reference);
  if (!email && !extRef) return "skip:no_email";
  if (!input.userId) return "skip:no_profile";

  const now = input.now ?? new Date();
  const cur = input.currentSubscription;
  const blocking =
    !!cur &&
    cur.source === "admin_grant" &&
    cur.plano === "pro" &&
    !!cur.current_period_end &&
    new Date(cur.current_period_end) > now;
  if (blocking) return "skip:active_admin_grant";

  const status = (input.preapproval?.status || "").toLowerCase();
  if (status === "authorized") return "upsert:active";
  if (status === "paused" || status === "cancelled") return "update:canceled";
  return "update:metadata_only";
}
/* ------------------------------------------------------------------
 * Identificação da pessoa que pagou (A6)
 * ------------------------------------------------------------------ */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `external_reference` só vale como user_id se tiver o formato de uuid. */
export function userIdFromExternalReference(ref: unknown): string | null {
  if (typeof ref !== "string") return null;
  const v = ref.trim();
  return UUID_RE.test(v) ? v.toLowerCase() : null;
}

/** Normaliza o e-mail para comparação exata (minúsculas, sem espaços). */
export function normalizeEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

/**
 * Escapa `%`, `_` e `\` para usar em `ilike` como comparação exata
 * (sem curingas). O resultado ainda é conferido em JS por `pickProfileByEmail`.
 */
export function escapeLikeExact(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export type ProfileMatch =
  | { userId: string; reason: "email" }
  | { userId: null; reason: "no_profile" | "ambiguous" | "no_email" };

/** Escolhe o perfil cujo e-mail é exatamente igual (em minúsculas). */
export function pickProfileByEmail(
  rows: Array<{ user_id: string; email: string | null }> | null | undefined,
  email: string,
): ProfileMatch {
  const alvo = normalizeEmail(email);
  if (!alvo) return { userId: null, reason: "no_email" };
  const iguais = (rows ?? []).filter((r) => normalizeEmail(r.email) === alvo);
  const ids = [...new Set(iguais.map((r) => r.user_id))];
  if (ids.length === 1) return { userId: ids[0], reason: "email" };
  if (ids.length > 1) return { userId: null, reason: "ambiguous" };
  return { userId: null, reason: "no_profile" };
}

/* ------------------------------------------------------------------
 * Fim do período (A5): notificações repetidas não podem somar tempo
 * ------------------------------------------------------------------ */

export interface PeriodEndInput {
  ciclo: "mensal" | "anual";
  /** id do preapproval desta notificação */
  preapprovalId: string;
  /** next_payment_date vindo do MP (data absoluta), se houver */
  nextPaymentDate?: string | null;
  /** duração do ciclo em dias, usada quando o MP não manda next_payment_date */
  periodDays: number;
  current: {
    source?: string | null;
    plano?: string | null;
    ciclo?: string | null;
    current_period_end?: string | null;
    metadata?: unknown;
  } | null;
  now?: Date;
}

export interface PeriodEndResult {
  periodEnd: string;
  /** true quando somou o restante do plano mensal antigo (troca mensal -> anual) */
  carriedOver: boolean;
  /** preapproval antigo a cancelar no MP (troca de plano), se houver */
  previousPreapprovalId: string | null;
}

export function previousPreapprovalId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const v = (metadata as Record<string, unknown>).preapproval_id;
  return typeof v === "string" && v ? v : null;
}

/**
 * Calcula o fim do período de forma idempotente.
 *  - Mesma assinatura (mesmo preapproval): usa a data absoluta do MP; sem ela,
 *    mantém o fim atual se ainda estiver no futuro. Nunca soma de novo.
 *  - Troca mensal -> anual (preapproval diferente, ciclo atual mensal, Pro
 *    ativo pelo MP): soma o que restava do mensal, uma única vez.
 */
export function computePeriodEnd(input: PeriodEndInput): PeriodEndResult {
  const now = (input.now ?? new Date()).getTime();
  const cur = input.current;
  const prevId = previousPreapprovalId(cur?.metadata);
  const mesmoPreapproval = !!prevId && prevId === input.preapprovalId;
  const curEndMs = cur?.current_period_end ? new Date(cur.current_period_end).getTime() : NaN;

  let baseMs: number;
  if (input.nextPaymentDate && !Number.isNaN(new Date(input.nextPaymentDate).getTime())) {
    baseMs = new Date(input.nextPaymentDate).getTime();
  } else if (mesmoPreapproval && cur?.source === "mercadopago" && curEndMs > now) {
    baseMs = curEndMs;
  } else {
    baseMs = now + input.periodDays * 24 * 60 * 60 * 1000;
  }

  const trocaMensalParaAnual =
    input.ciclo === "anual" &&
    !!cur &&
    cur.source === "mercadopago" &&
    cur.plano === "pro" &&
    cur.ciclo === "mensal" &&
    !!prevId &&
    prevId !== input.preapprovalId &&
    Number.isFinite(curEndMs);

  let carriedOver = false;
  if (trocaMensalParaAnual) {
    const restante = Math.max(0, curEndMs - now);
    if (restante > 0) {
      baseMs += restante;
      carriedOver = true;
    }
  }

  return {
    periodEnd: new Date(baseMs).toISOString(),
    carriedOver,
    previousPreapprovalId: prevId && prevId !== input.preapprovalId ? prevId : null,
  };
}

/**
 * Notificação de um preapproval antigo (ex.: o mensal cancelado depois da
 * troca para o anual). Não pode cancelar nem rebaixar a assinatura atual.
 */
export function isStalePreapproval(input: {
  preapprovalId: string;
  status: string;
  ciclo: "mensal" | "anual";
  current: PeriodEndInput["current"];
  now?: Date;
}): boolean {
  const cur = input.current;
  if (!cur || cur.source !== "mercadopago") return false;
  const prevId = previousPreapprovalId(cur.metadata);
  if (!prevId || prevId === input.preapprovalId) return false;
  const status = (input.status || "").toLowerCase();
  // Outro preapproval que não está autorizado: não mexe na assinatura atual.
  if (status !== "authorized") return true;
  // Autorização antiga de mensal chegando depois do anual já ativo.
  const now = (input.now ?? new Date()).getTime();
  const curEnd = cur.current_period_end ? new Date(cur.current_period_end).getTime() : NaN;
  return input.ciclo === "mensal" && cur.ciclo === "anual" && cur.plano === "pro" && curEnd > now;
}
