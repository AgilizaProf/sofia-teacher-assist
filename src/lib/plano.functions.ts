import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Plan IDs do Mercado Pago (mesmos usados no webhook).
export const MP_PLAN_ID_MENSAL = "e2da862aba6042019234b1840f2593ef";
export const MP_PLAN_ID_ANUAL = "7798ddd616d8438a92b0e2bceaa20bab";

export const MP_CHECKOUT_MENSAL = `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=${MP_PLAN_ID_MENSAL}`;
export const MP_CHECKOUT_ANUAL = `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=${MP_PLAN_ID_ANUAL}`;

export type PlanoAtualDTO = {
  plano: "free" | "pro";
  ciclo: "mensal" | "anual" | null;
  status: "active" | "canceled" | "expired" | "paused" | string;
  source: string;
  current_period_end: string | null;
  preapproval_id: string | null;
  pode_cancelar: boolean;
  pode_migrar_anual: boolean;
  pode_assinar_mensal: boolean;
  pode_assinar_anual: boolean;
  checkout_mensal: string;
  checkout_anual: string;
};

export const getPlanoAtual = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlanoAtualDTO> => {
    const { userId } = context;
    const { data } = await supabaseAdmin
      .from("subscriptions")
      .select("plano, ciclo, status, source, current_period_end, metadata")
      .eq("user_id", userId)
      .maybeSingle();

    const plano = (data?.plano ?? "free") as "free" | "pro";
    const ciclo = (data?.ciclo ?? null) as "mensal" | "anual" | null;
    const status = (data?.status ?? "active") as string;
    const source = data?.source ?? "signup";
    const current_period_end = data?.current_period_end ?? null;
    const meta = (data?.metadata ?? {}) as Record<string, unknown>;
    const preapproval_id =
      typeof meta.preapproval_id === "string" ? (meta.preapproval_id as string) : null;

    const isMpActive =
      plano === "pro" && source === "mercadopago" && status === "active";
    const isMpCanceled =
      plano === "pro" && source === "mercadopago" && status !== "active";

    return {
      plano,
      ciclo,
      status,
      source,
      current_period_end,
      preapproval_id,
      pode_cancelar: !!preapproval_id && isMpActive,
      pode_migrar_anual: isMpActive && ciclo === "mensal",
      // Free pode assinar qualquer; também pode reassinar se cancelado/expirado.
      pode_assinar_mensal: plano === "free" || isMpCanceled || (isMpActive && ciclo === "anual" && false),
      pode_assinar_anual: plano === "free" || isMpCanceled || (isMpActive && ciclo === "mensal"),
      checkout_mensal: MP_CHECKOUT_MENSAL,
      checkout_anual: MP_CHECKOUT_ANUAL,
    };
  });

export const cancelarAssinatura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        reasons: z.array(z.string().min(1).max(80)).max(10).optional(),
        comment: z.string().max(2000).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const reasons = data?.reasons ?? [];
    const comment = data?.comment ?? null;
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("MP_ACCESS_TOKEN não configurado");
    }

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("metadata, source, status, ciclo")
      .eq("user_id", userId)
      .maybeSingle();

    const meta = (sub?.metadata ?? {}) as Record<string, unknown>;
    const preapprovalId =
      typeof meta.preapproval_id === "string" ? (meta.preapproval_id as string) : null;

    if (!preapprovalId || sub?.source !== "mercadopago") {
      throw new Error("Nenhuma assinatura ativa do Mercado Pago para cancelar.");
    }

    // Cancela no MP.
    const res = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "cancelled" }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("[cancelar-mp]", res.status, txt);
      throw new Error("Não foi possível cancelar no Mercado Pago. Tente novamente.");
    }

    await supabaseAdmin
      .from("subscriptions")
      .update({
        status: "canceled",
        metadata: { ...meta, mp_status: "cancelled", canceled_via: "self", canceled_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("source", "mercadopago");

    // Registra feedback (não bloqueia o cancelamento se falhar).
    try {
      await supabaseAdmin.from("cancellation_feedback").insert({
        user_id: userId,
        ciclo: (sub as { ciclo?: string | null } | null)?.ciclo ?? null,
        reasons,
        comment,
      });
    } catch (err) {
      console.error("[cancel-feedback]", err);
    }

    return { ok: true };
  });
