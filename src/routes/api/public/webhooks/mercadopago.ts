import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  computePeriodEnd,
  escapeLikeExact,
  isStalePreapproval,
  normalizeEmail,
  pickProfileByEmail,
  userIdFromExternalReference,
} from "@/lib/mercadopago/webhook-logic";

/** Deixa o "pagamento sem perfil" visível no admin (Erros). Nunca lança. */
async function registrarPagamentoSemPerfil(info: {
  preapprovalId: string;
  status?: string;
  motivo: string;
  email: string;
  externalReference: string | null;
  eventType: string;
}) {
  try {
    const { error } = await supabaseAdmin.from("platform_errors").insert({
      route: "/api/public/webhooks/mercadopago",
      message: "Pagamento sem perfil: assinatura do Mercado Pago sem conta correspondente",
      severity: "warn",
      metadata: {
        tipo: "pagamento_sem_perfil",
        motivo: info.motivo,
        preapproval_id: info.preapprovalId,
        mp_status: info.status ?? null,
        payer_email: info.email || null,
        external_reference: info.externalReference,
        event_type: info.eventType,
      },
    } as never);
    if (error) console.warn("[mp-webhook] platform_errors insert failed", error);
  } catch (e) {
    console.warn("[mp-webhook] platform_errors insert failed", e);
  }
}

/**
 * Mercado Pago webhook for subscription (preapproval) lifecycle.
 *
 * Verifies x-signature according to MP spec:
 *   manifest = `id:{data.id};request-id:{x-request-id};ts:{ts};`
 *   v1 = HMAC_SHA256(MP_WEBHOOK_SECRET, manifest)
 *
 * On preapproval events, fetches the preapproval from MP and upserts the
 * matching user's row in `subscriptions`:
 *  - status authorized  -> plano=pro, ciclo=mensal|anual, status=active,
 *                          current_period_end = next_payment_date (idempotente:
 *                          notificações repetidas não somam tempo)
 *  - a pessoa é achada por external_reference (= user_id) e, como reserva,
 *    pelo e-mail do pagador com comparação exata em minúsculas
 *  - status paused/cancelled -> status=canceled, current_period_end preserved
 *    (downgrade to free is handled by the hourly mp_expire_subscriptions job)
 */
export const Route = createFileRoute("/api/public/webhooks/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.MP_WEBHOOK_SECRET;
        const accessToken = process.env.MP_ACCESS_TOKEN;
        if (!secret || !accessToken) {
          console.error("[mp-webhook] missing MP_WEBHOOK_SECRET or MP_ACCESS_TOKEN");
          return new Response("Server not configured", { status: 500 });
        }

        const rawBody = await request.text();
        const url = new URL(request.url);

        // Parse payload (best-effort; invalid JSON => 400)
        let payload: {
          type?: string;
          action?: string;
          data?: { id?: string };
        };
        try {
          payload = rawBody ? JSON.parse(rawBody) : {};
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        // Resource id can come in body.data.id or query (?data.id=...&type=...)
        const dataId =
          payload?.data?.id?.toString() ||
          url.searchParams.get("data.id") ||
          url.searchParams.get("id") ||
          "";
        const eventType = (payload?.type || url.searchParams.get("type") || "").toLowerCase();

        // ---- Signature verification (MP format) -------------------------
        const sigHeader = request.headers.get("x-signature") || "";
        const requestId = request.headers.get("x-request-id") || "";
        const parts = Object.fromEntries(
          sigHeader
            .split(",")
            .map((p) => p.trim().split("="))
            .filter((p) => p.length === 2)
            .map(([k, v]) => [k.trim(), v.trim()]),
        );
        const ts = parts["ts"];
        const v1 = parts["v1"];
        if (!ts || !v1 || !requestId || !dataId) {
          return new Response("Invalid signature headers", { status: 401 });
        }
        const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
        const expected = createHmac("sha256", secret).update(manifest).digest("hex");
        const a = Buffer.from(expected, "hex");
        const b = Buffer.from(v1, "hex");
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        // ---- Only handle subscription (preapproval) events --------------
        const isPreapproval =
          eventType.includes("preapproval") || eventType.includes("subscription");
        if (!isPreapproval) {
          // Acknowledge other event types so MP doesn't retry forever.
          return new Response("ok", { status: 200 });
        }

        // ---- Fetch preapproval from MP ----------------------------------
        const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${dataId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!mpRes.ok) {
          const txt = await mpRes.text().catch(() => "");
          console.error("[mp-webhook] preapproval fetch failed", mpRes.status, txt);
          return new Response("Upstream error", { status: 502 });
        }
        const sub = (await mpRes.json()) as {
          id: string;
          status: string; // pending | authorized | paused | cancelled
          payer_email?: string;
          external_reference?: string | null;
          next_payment_date?: string;
          date_created?: string;
          reason?: string;
          preapproval_plan_id?: string;
          auto_recurring?: {
            frequency?: number;
            frequency_type?: string; // "months" | "days" | "years"
          };
        };

        // ---- Detect plan cycle (mensal vs anual) -----------------------
        // Known plan IDs (preferred) + auto_recurring fallback.
        const ANNUAL_PLAN_ID = "7798ddd616d8438a92b0e2bceaa20bab";
        const MONTHLY_PLAN_ID = "e2da862aba6042019234b1840f2593ef";
        const planId = sub.preapproval_plan_id || "";
        const freqType = (sub.auto_recurring?.frequency_type || "").toLowerCase();
        const freq = sub.auto_recurring?.frequency || 0;
        const isAnnual =
          planId === ANNUAL_PLAN_ID ||
          freqType === "years" ||
          (freqType === "months" && freq >= 12) ||
          (freqType === "days" && freq >= 365);
        const ciclo: "anual" | "mensal" = isAnnual ? "anual" : "mensal";
        const periodDays = isAnnual ? 365 : 30;
        void MONTHLY_PLAN_ID;

        // ---- Quem pagou? (A6) ------------------------------------------
        // 1) external_reference = user_id (quando o checkout manda);
        // 2) reserva: e-mail do pagador, comparação exata em minúsculas.
        const email = normalizeEmail(sub.payer_email);
        const refUserId = userIdFromExternalReference(sub.external_reference);
        let userId: string | null = null;

        if (refUserId) {
          const { data: byRef, error: refErr } = await supabaseAdmin
            .from("profiles")
            .select("user_id")
            .eq("user_id", refUserId)
            .maybeSingle();
          if (refErr) {
            console.error("[mp-webhook] profile lookup (external_reference) failed", refErr);
            return new Response("DB error", { status: 500 });
          }
          userId = byRef?.user_id ?? null;
        }

        let motivoSemPerfil: string = "no_profile";
        if (!userId && email) {
          const { data: rows, error: profErr } = await supabaseAdmin
            .from("profiles")
            .select("user_id, email")
            .ilike("email", escapeLikeExact(email))
            .limit(5);
          if (profErr) {
            console.error("[mp-webhook] profile lookup failed", profErr);
            return new Response("DB error", { status: 500 });
          }
          const match = pickProfileByEmail(
            rows as Array<{ user_id: string; email: string | null }> | null,
            email,
          );
          userId = match.userId;
          motivoSemPerfil = match.reason;
        } else if (!userId && !email) {
          motivoSemPerfil = "no_email";
        }

        if (!userId) {
          // Responde 200 (o MP não precisa tentar de novo), mas deixa o caso
          // visível para o admin em platform_errors.
          console.warn("[mp-webhook] pagamento sem perfil", sub.id, motivoSemPerfil);
          await registrarPagamentoSemPerfil({
            preapprovalId: sub.id,
            status: sub.status,
            motivo: motivoSemPerfil,
            email,
            externalReference: sub.external_reference ?? null,
            eventType,
          });
          return new Response("ok", { status: 200 });
        }

        const status = sub.status?.toLowerCase();

        // Don't overwrite admin grants or other paid sources
        const { data: current, error: curErr } = await supabaseAdmin
          .from("subscriptions")
          .select("source, plano, ciclo, current_period_end, metadata")
          .eq("user_id", userId)
          .maybeSingle();
        if (curErr) {
          console.error("[mp-webhook] subscription lookup failed", curErr);
          return new Response("DB error", { status: 500 });
        }

        const blocking =
          current &&
          current.source === "admin_grant" &&
          current.plano === "pro" &&
          current.current_period_end &&
          new Date(current.current_period_end) > new Date();

        if (blocking) {
          console.log("[mp-webhook] skipping update: active admin_grant for", userId);
          return new Response("ok", { status: 200 });
        }

        // Notificação de um preapproval antigo (ex.: o mensal cancelado na
        // troca para o anual): só confirma o recebimento.
        if (
          isStalePreapproval({
            preapprovalId: sub.id,
            status: status || "",
            ciclo,
            current: current as Parameters<typeof isStalePreapproval>[0]["current"],
          })
        ) {
          console.log("[mp-webhook] notificação de preapproval antigo ignorada", sub.id);
          return new Response("ok", { status: 200 });
        }

        const baseMeta = {
          preapproval_id: sub.id,
          preapproval_plan_id: planId || null,
          mp_status: status,
          ciclo,
          last_event: eventType,
          updated_via: "webhook",
          updated_at: new Date().toISOString(),
        };

        if (status === "authorized") {
          // ---- Fim do período, idempotente (A5) ------------------------
          // Mesma assinatura: usa a data do MP e nunca soma de novo.
          // Troca mensal -> anual: soma o restante do mensal uma única vez.
          const periodo = computePeriodEnd({
            ciclo,
            preapprovalId: sub.id,
            nextPaymentDate: sub.next_payment_date ?? null,
            periodDays,
            current: current as Parameters<typeof computePeriodEnd>[0]["current"],
          });
          const effectivePeriodEnd = periodo.periodEnd;

          // Troca de plano: cancela o preapproval antigo no MP.
          if (periodo.previousPreapprovalId && current?.source === "mercadopago") {
            try {
              await fetch(
                `https://api.mercadopago.com/preapproval/${periodo.previousPreapprovalId}`,
                {
                  method: "PUT",
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ status: "cancelled" }),
                },
              );
            } catch (e) {
              console.warn("[mp-webhook] falha ao cancelar preapproval antigo", e);
            }
          }

          const { error: upErr } = await supabaseAdmin.from("subscriptions").upsert(
            {
              user_id: userId,
              plano: "pro",
              ciclo,
              status: "active",
              source: "mercadopago",
              started_at: sub.date_created || new Date().toISOString(),
              current_period_end: effectivePeriodEnd,
              metadata: { ...baseMeta, current_period_end: effectivePeriodEnd },
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
          if (upErr) {
            // 500 faz o MP tentar de novo; a gravação é idempotente.
            console.error("[mp-webhook] subscription upsert failed", upErr);
            return new Response("DB error", { status: 500 });
          }

          // ---- Convide e ganhe: registra a indicação na 1ª compra paga ----
          // Só cria se o comprador foi indicado por alguém e ainda não tem
          // uma indicação registrada (UNIQUE em referred_user_id garante isso).
          try {
            const { data: buyerProfile } = await supabaseAdmin
              .from("profiles")
              .select("referred_by_code")
              .eq("user_id", userId)
              .maybeSingle();
            const refCode = buyerProfile?.referred_by_code || null;
            if (refCode) {
              const { data: referrer } = await supabaseAdmin
                .from("profiles")
                .select("user_id")
                .eq("referral_code", refCode)
                .maybeSingle();
              if (referrer?.user_id && referrer.user_id !== userId) {
                const dias = ciclo === "anual" ? 30 : 7;
                const creditos = ciclo === "anual" ? 1500 : 375;
                const purchased = new Date();
                // Carência de 7 dias (período de confirmação/reembolso) antes
                // de liberar o bônus — process_due_referrals credita após isso.
                const creditAt = new Date(purchased.getTime() + 7 * 24 * 60 * 60 * 1000);
                const { error: refInsErr } = await supabaseAdmin.from("referrals").insert({
                  referrer_user_id: referrer.user_id,
                  referred_user_id: userId,
                  referral_code: refCode,
                  plan: ciclo,
                  purchased_at: purchased.toISOString(),
                  credit_at: creditAt.toISOString(),
                  referrer_bonus_days: dias,
                  referred_bonus_days: dias,
                  referrer_bonus_credits: creditos,
                  referred_bonus_credits: creditos,
                  source: "webhook",
                } as never);
                // O UNIQUE(referred_user_id) rejeita duplicatas (notificação
                // repetida). Esse erro é esperado; outros vão para o log.
                if (refInsErr && (refInsErr as { code?: string }).code !== "23505") {
                  console.warn("[mp-webhook] referral insert failed", refInsErr);
                }
              }
            }
          } catch (e) {
            console.warn("[mp-webhook] referral insert skipped", e);
          }
        } else if (status === "paused" || status === "cancelled") {
          // Keep current_period_end so the user retains access until paid period ends.
          const { error: cancErr } = await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "canceled",
              metadata: baseMeta,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId)
            .eq("source", "mercadopago");
          if (cancErr) {
            console.error("[mp-webhook] subscription cancel failed", cancErr);
            return new Response("DB error", { status: 500 });
          }
        } else {
          // pending or unknown: just record metadata
          const { error: metaErr } = await supabaseAdmin
            .from("subscriptions")
            .update({
              metadata: baseMeta,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId)
            .eq("source", "mercadopago");
          if (metaErr) {
            console.error("[mp-webhook] metadata update failed", metaErr);
            return new Response("DB error", { status: 500 });
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
