import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  decidePlannedAction,
  escapeLikeExact,
  normalizeEmail,
  parseWebhookEvent,
  pickProfileByEmail,
  userIdFromExternalReference,
  verifySignature,
  computeV1,
  buildManifest,
} from "@/lib/mercadopago/webhook-logic";

/**
 * Diagnóstico (dry-run) do webhook do Mercado Pago. NUNCA grava no banco.
 *
 * Fica DESLIGADO por padrão (A18): responde 404 a menos que
 *   - a variável de ambiente ENABLE_MP_DEBUG seja "1", e
 *   - a chamada traga `Authorization: Bearer <JWT>` de uma conta admin.
 *
 * Uso (só em investigação pontual; desligue depois):
 *   POST /api/public/webhooks/mercadopago_debug?simulate=1&fetch=0
 *     Authorization: Bearer <access token de admin>
 *     Body: JSON da notificação do MP
 *
 *   simulate=1 -> assina a notificação com o segredo do servidor e mostra o
 *                 que o webhook real faria
 *   fetch=0    -> não chama a API do MP
 */

const notFound = () => new Response("Not found", { status: 404 });

async function isAdminRequest(request: Request): Promise<boolean> {
  const auth = request.headers.get("authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  if (!m) return false;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(m[1]);
    const uid = data?.user?.id;
    if (error || !uid) return false;
    const { data: papel } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin")
      .maybeSingle();
    return !!papel;
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/webhooks/mercadopago_debug")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (process.env.ENABLE_MP_DEBUG !== "1") return notFound();
        if (!(await isAdminRequest(request))) return notFound();

        const secret = process.env.MP_WEBHOOK_SECRET;
        const accessToken = process.env.MP_ACCESS_TOKEN;
        if (!secret) {
          return Response.json(
            { ok: false, error: "MP_WEBHOOK_SECRET not configured on server" },
            { status: 500 },
          );
        }

        const url = new URL(request.url);
        const simulate = url.searchParams.get("simulate") === "1";
        const doFetch = url.searchParams.get("fetch") !== "0";

        const rawBody = await request.text();
        const { parseError, dataId, eventType, isPreapproval } = parseWebhookEvent(rawBody, url);

        // ---- Assinatura ---------------------------------------------
        let signatureHeader = request.headers.get("x-signature") || "";
        let requestId = request.headers.get("x-request-id") || "";
        if (simulate) {
          const ts = String(Math.floor(Date.now() / 1000));
          if (!requestId) requestId = crypto.randomUUID();
          signatureHeader = `ts=${ts},v1=${computeV1(secret, buildManifest(dataId, requestId, ts))}`;
        }
        const sig = verifySignature({ secret, signatureHeader, requestId, dataId });

        // ---- Consulta opcional ao MP e ao perfil --------------------
        let preapproval: Record<string, unknown> | null = null;
        let upstreamStatus: number | null = null;
        let upstreamError: string | null = null;
        let userLookup: { by: string; user_id: string | null } | null = null;
        let plannedAction: string | null = null;

        if (!sig.valid) {
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
              const email = normalizeEmail(preapproval.payer_email);
              const refId = userIdFromExternalReference(preapproval.external_reference);
              let userId: string | null = null;
              let by = "none";
              if (refId) {
                const { data } = await supabaseAdmin
                  .from("profiles")
                  .select("user_id")
                  .eq("user_id", refId)
                  .maybeSingle();
                userId = data?.user_id ?? null;
                by = "external_reference";
              }
              if (!userId && email) {
                const { data: rows } = await supabaseAdmin
                  .from("profiles")
                  .select("user_id, email")
                  .ilike("email", escapeLikeExact(email))
                  .limit(5);
                const match = pickProfileByEmail(
                  rows as Array<{ user_id: string; email: string | null }> | null,
                  email,
                );
                userId = match.userId;
                by = match.userId ? "email" : match.reason;
              }
              userLookup = { by, user_id: userId };
              let current = null;
              if (userId) {
                const { data } = await supabaseAdmin
                  .from("subscriptions")
                  .select("source, plano, current_period_end")
                  .eq("user_id", userId)
                  .maybeSingle();
                current = data;
              }
              plannedAction = decidePlannedAction({
                signatureValid: true,
                isPreapproval: true,
                preapproval: preapproval as {
                  status?: string;
                  payer_email?: string;
                  external_reference?: string | null;
                },
                userId,
                currentSubscription: current,
              });
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
            requestId: requestId || null,
            ts: sig.ts || null,
            manifest: sig.manifest,
            valid: sig.valid,
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
                      next_payment_date: preapproval.next_payment_date,
                      date_created: preapproval.date_created,
                      reason: preapproval.reason,
                      preapproval_plan_id: preapproval.preapproval_plan_id,
                      auto_recurring: preapproval.auto_recurring,
                      tem_external_reference: !!preapproval.external_reference,
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
