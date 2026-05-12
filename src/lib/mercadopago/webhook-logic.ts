import { createHmac, timingSafeEqual } from "crypto";

/** Parse `ts=...,v1=...` style x-signature header into a key/value map. */
export function parseSignatureHeader(header: string): Record<string, string> {
  return Object.fromEntries(
    (header || "")
      .split(",")
      .map((p) => p.trim().split("="))
      .filter((p) => p.length === 2)
      .map(([k, v]) => [k.trim(), v.trim()])
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
  const valid =
    !!ts && !!v1 && !!input.requestId && !!input.dataId && safeHexEqual(expected, v1);
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
  const isPreapproval =
    eventType.includes("preapproval") || eventType.includes("subscription");
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
  preapproval: { status?: string; payer_email?: string } | null;
  userId: string | null;
  currentSubscription:
    | { source?: string | null; plano?: string | null; current_period_end?: string | null }
    | null;
  /** Allows tests to fix "now" — defaults to Date.now(). */
  now?: Date;
}

/** Pure decision function — mirrors the live webhook + dry-run endpoint. */
export function decidePlannedAction(input: DecideInput): PlannedAction {
  if (!input.signatureValid) return "skip:invalid_signature";
  if (!input.isPreapproval) return "skip:not_preapproval";
  const email = (input.preapproval?.payer_email || "").toLowerCase().trim();
  if (!email) return "skip:no_email";
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