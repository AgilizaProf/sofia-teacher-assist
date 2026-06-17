import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Dry-run debug endpoint for the Mercado Pago webhook.
 *
 * - Verifies x-signature exactly like the real webhook.
 * - Extracts data.id and event type from body or query.
 * - Optionally fetches the preapproval from MP and looks up the user.
 * - DOES NOT write to the database.
 *
 * Auth: requires header `x-debug-token` equal to MP_WEBHOOK_SECRET so that
 * only someone who already holds the webhook secret can use it.
 *
 * Usage:
 *   POST /api/public/webhooks/mercadopago/debug
 *     Headers:
 *       x-debug-token: <MP_WEBHOOK_SECRET>
 *       x-signature:   ts=...,v1=...        (optional — set ?simulate=1 to auto-sign)
 *       x-request-id:  <uuid>
 *     Body: raw MP notification JSON
 *
 *   Query params:
 *     simulate=1  -> compute a valid signature for the given body+headers
 *                    and report what the real webhook would do
 *     fetch=0     -> skip the upstream MP API call
 */
export const Route = createFileRoute("/api/public/webhooks/mercadopago_debug")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.MP_WEBHOOK_SECRET;
        const accessToken = process.env.MP_ACCESS_TOKEN;

        const debugToken = request.headers.get("x-debug-token") || "";
        if (!secret) {
          return Response.json(
            { ok: false, error: "MP_WEBHOOK_SECRET not configured on server" },
            { status: 500 }
          );
        }
        // Constant-time compare on debug token
        const a = Buffer.from(debugToken);
        const b = Buffer.from(secret);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return Response.json(
            { ok: false, error: "Invalid x-debug-token" },
            { status: 401 }
          );
        }

        const url = new URL(request.url);
        const simulate = url.searchParams.get("simulate") === "1";
        const doFetch = url.searchParams.get("fetch") !== "0";

        const rawBody = await request.text();
        let payload: { type?: string; action?: string; data?: { id?: string | number } } = {};
        let parseError: string | null = null;
        try {
          payload = rawBody ? JSON.parse(rawBody) : {};
        } catch (e) {
          parseError = e instanceof Error ? e.message : "invalid JSON";
        }

        const dataId =
          payload?.data?.id?.toString() ||
          url.searchParams.get("data.id") ||
          url.searchParams.get("id") ||
          "";
        const eventType = (payload?.type || url.searchParams.get("type") || "").toLowerCase();

        // ---- Signature handling --------------------------------------
        let receivedSignature = request.headers.get("x-signature") || "";
        let receivedRequestId = request.headers.get("x-request-id") || "";
        let ts = "";
        let v1 = "";

        if (simulate) {
          ts = String(Math.floor(Date.now() / 1000));
          if (!receivedRequestId) {
            receivedRequestId = crypto.randomUUID();
          }
          const manifestSim = `id:${dataId};request-id:${receivedRequestId};ts:${ts};`;
          v1 = createHmac("sha256", secret).update(manifestSim).digest("hex");
          receivedSignature = `ts=${ts},v1=${v1}`;
        } else {
          const parts = Object.fromEntries(
            receivedSignature
              .split(",")
              .map((p) => p.trim().split("="))
              .filter((p) => p.length === 2)
              .map(([k, v]) => [k.trim(), v.trim()])
          );
          ts = parts["ts"] || "";
          v1 = parts["v1"] || "";
        }

        const manifest = `id:${dataId};request-id:${receivedRequestId};ts:${ts};`;
        const expectedV1 = createHmac("sha256", secret).update(manifest).digest("hex");
        let signatureValid = false;
        if (ts && v1 && receivedRequestId && dataId) {
          const ea = Buffer.from(expectedV1, "hex");
          const eb = Buffer.from(v1, "hex");
          signatureValid = ea.length === eb.length && timingSafeEqual(ea, eb);
        }

        const isPreapproval =
          eventType.includes("preapproval") || eventType.includes("subscription");

        // ---- Optional MP API call & user lookup ----------------------
        let preapproval: Record<string, unknown> | null = null;
        let upstreamStatus: number | null = null;
        let upstreamError: string | null = null;
        let userLookup: { email: string; user_id: string | null } | null = null;
        let plannedAction:
          | "skip:not_preapproval"
          | "skip:no_email"
          | "skip:no_profile"
          | "skip:active_admin_grant"
          | "upsert:active"
          | "update:canceled"
          | "update:metadata_only"
          | "skip:invalid_signature"
          | "skip:invalid_status"
          | null = null;

        if (!signatureValid) {
          plannedAction = "skip:invalid_signature";
        } else if (!isPreapproval) {
          plannedAction = "skip:not_preapproval";
        } else if (doFetch && accessToken && dataId) {
          try {
            const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${dataId}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            upstreamStatus = mpRes.status;
            if (mpRes.ok) {
              preapproval = (await mpRes.json()) as Record<string, unknown>;
              const email = ((preapproval.payer_email as string) || "").toLowerCase().trim();
              if (!email) {
                plannedAction = "skip:no_email";
              } else {
                const { data: profile, error } = await supabaseAdmin
                  .from("profiles")
                  .select("user_id")
                  .ilike("email", email)
                  .maybeSingle();
                userLookup = {
                  email,
                  user_id: error ? null : (profile?.user_id ?? null),
                };
                if (!profile?.user_id) {
                  plannedAction = "skip:no_profile";
                } else {
                  const status = (preapproval.status as string)?.toLowerCase();
                  const { data: current } = await supabaseAdmin
                    .from("subscriptions")
                    .select("source, plano, current_period_end")
                    .eq("user_id", profile.user_id)
                    .maybeSingle();
                  const blocking =
                    current &&
                    current.source === "admin_grant" &&
                    current.plano === "pro" &&
                    current.current_period_end &&
                    new Date(current.current_period_end) > new Date();
                  if (blocking) {
                    plannedAction = "skip:active_admin_grant";
                  } else if (status === "authorized") {
                    plannedAction = "upsert:active";
                  } else if (status === "paused" || status === "cancelled") {
                    plannedAction = "update:canceled";
                  } else {
                    plannedAction = "update:metadata_only";
                  }
                }
              }
            } else {
              upstreamError = await mpRes.text().catch(() => "");
            }
          } catch (e) {
            upstreamError = e instanceof Error ? e.message : String(e);
          }
        }

        return Response.json({
          ok: true,
          dryRun: true,
          parseError,
          extracted: { dataId, eventType, isPreapproval },
          signature: {
            simulated: simulate,
            received: receivedSignature || null,
            requestId: receivedRequestId || null,
            ts: ts || null,
            v1Received: v1 || null,
            v1Expected: expectedV1,
            manifest,
            valid: signatureValid,
          },
          upstream: doFetch
            ? {
                called: true,
                status: upstreamStatus,
                error: upstreamError,
                preapproval: preapproval
                  ? {
                      id: preapproval.id,
                      status: preapproval.status,
                      payer_email: preapproval.payer_email,
                      next_payment_date: preapproval.next_payment_date,
                      date_created: preapproval.date_created,
                      reason: preapproval.reason,
                        preapproval_plan_id: preapproval.preapproval_plan_id,
                        auto_recurring: preapproval.auto_recurring,
                    }
                  : null,
              }
            : { called: false },
          userLookup,
          plannedAction,
        });
      },
    },
  },
});