import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Mercado Pago webhook for subscription (preapproval) lifecycle.
 *
 * Verifies x-signature according to MP spec:
 *   manifest = `id:{data.id};request-id:{x-request-id};ts:{ts};`
 *   v1 = HMAC_SHA256(MP_WEBHOOK_SECRET, manifest)
 *
 * On preapproval events, fetches the preapproval from MP and upserts the
 * matching user's row in `subscriptions`:
 *  - status authorized  -> plano=pro, ciclo=mensal, status=active,
 *                          current_period_end = next_payment_date
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
            .map(([k, v]) => [k.trim(), v.trim()])
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

        const email = (sub.payer_email || "").toLowerCase().trim();
        if (!email) {
          console.warn("[mp-webhook] preapproval has no payer_email", sub.id);
          return new Response("ok", { status: 200 });
        }

        // Look up the user via profiles (unique email per user)
        const { data: profile, error: profErr } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .ilike("email", email)
          .maybeSingle();
        if (profErr) {
          console.error("[mp-webhook] profile lookup failed", profErr);
          return new Response("DB error", { status: 500 });
        }
        if (!profile?.user_id) {
          // No account yet — acknowledge; account creation flow can pick up later.
          console.warn("[mp-webhook] no profile for email", email);
          return new Response("ok", { status: 200 });
        }
        const userId = profile.user_id;

        // Compute period end: prefer next_payment_date, else now + N days (30/365)
        const periodEnd =
          sub.next_payment_date ||
          new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000).toISOString();

        const status = sub.status?.toLowerCase();

        // Don't overwrite admin grants or other paid sources
        const { data: current } = await supabaseAdmin
          .from("subscriptions")
          .select("source, plano, current_period_end")
          .eq("user_id", userId)
          .maybeSingle();

        const blocking =
          current &&
          current.source === "admin_grant" &&
          current.plano === "pro" &&
          current.current_period_end &&
          new Date(current.current_period_end) > new Date();

        if (blocking) {
          console.log("[mp-webhook] skipping update: active admin_grant for", email);
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
          // ---- Migração mensal -> anual: soma dias restantes ----------
          let effectivePeriodEnd = periodEnd;
          if (
            ciclo === "anual" &&
            current &&
            current.source === "mercadopago" &&
            current.plano === "pro" &&
            current.current_period_end
          ) {
            const prevEnd = new Date(current.current_period_end).getTime();
            const remainingMs = Math.max(0, prevEnd - Date.now());
            if (remainingMs > 0) {
              effectivePeriodEnd = new Date(
                new Date(periodEnd).getTime() + remainingMs
              ).toISOString();
            }

            // Cancela o preapproval antigo (se houver) no MP.
            const prevMeta = (await supabaseAdmin
              .from("subscriptions")
              .select("metadata")
              .eq("user_id", userId)
              .maybeSingle()).data?.metadata as Record<string, unknown> | null;
            const prevPreId =
              prevMeta && typeof prevMeta.preapproval_id === "string"
                ? (prevMeta.preapproval_id as string)
                : null;
            if (prevPreId && prevPreId !== sub.id) {
              try {
                await fetch(`https://api.mercadopago.com/preapproval/${prevPreId}`, {
                  method: "PUT",
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ status: "cancelled" }),
                });
              } catch (e) {
                console.warn("[mp-webhook] falha ao cancelar preapproval antigo", e);
              }
            }
          }

          await supabaseAdmin
            .from("subscriptions")
            .upsert(
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
              { onConflict: "user_id" }
            );

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
                await supabaseAdmin.from("referrals").insert({
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
                } as any);
                // onConflict não disponível aqui; o UNIQUE(referred_user_id)
                // simplesmente rejeita duplicatas — erro é ignorado de propósito.
              }
            }
          } catch (e) {
            console.warn("[mp-webhook] referral insert skipped", e);
          }
        } else if (status === "paused" || status === "cancelled") {
          // Keep current_period_end so the user retains access until paid period ends.
          await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "canceled",
              metadata: baseMeta,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId)
            .eq("source", "mercadopago");
        } else {
          // pending or unknown: just record metadata
          await supabaseAdmin
            .from("subscriptions")
            .update({
              metadata: baseMeta,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId)
            .eq("source", "mercadopago");
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
