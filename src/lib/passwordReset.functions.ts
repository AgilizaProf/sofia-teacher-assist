import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Input = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  redirectTo: z.string().url().max(500),
});

const WINDOW_MIN = 15;
const MAX_PER_EMAIL = 3;
const MAX_PER_IP = 10;

export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const ip =
      getRequestHeader("cf-connecting-ip") ||
      (getRequestHeader("x-forwarded-for") || "").split(",")[0].trim() ||
      getRequestIP({ xForwardedFor: true }) ||
      "unknown";

    const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();

    const [emailRes, ipRes] = await Promise.all([
      supabaseAdmin
        .from("password_reset_attempts")
        .select("created_at", { count: "exact" })
        .eq("email", data.email)
        .gte("created_at", since)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("password_reset_attempts")
        .select("created_at", { count: "exact" })
        .eq("ip", ip)
        .gte("created_at", since)
        .order("created_at", { ascending: false }),
    ]);

    const emailCount = emailRes.count ?? 0;
    const ipCount = ipRes.count ?? 0;

    if (emailCount >= MAX_PER_EMAIL || ipCount >= MAX_PER_IP) {
      const last = (emailCount >= MAX_PER_EMAIL ? emailRes.data?.[0] : ipRes.data?.[0])?.created_at;
      const unblockAt = last ? new Date(new Date(last).getTime() + WINDOW_MIN * 60_000) : new Date(Date.now() + WINDOW_MIN * 60_000);
      const waitMin = Math.max(1, Math.ceil((unblockAt.getTime() - Date.now()) / 60_000));
      return {
        ok: false as const,
        blocked: true,
        reason: emailCount >= MAX_PER_EMAIL ? "email" : "ip",
        waitMinutes: waitMin,
      };
    }

    // Registra a tentativa ANTES de enviar para evitar bypass via falha do provedor.
    await supabaseAdmin.from("password_reset_attempts").insert({ email: data.email, ip });

    // Sempre retorna sucesso opaco (não confirma se o e-mail existe), evitando enumeração.
    try {
      await supabaseAdmin.auth.resetPasswordForEmail(data.email, { redirectTo: data.redirectTo });
    } catch (e) {
      console.error("[requestPasswordReset] provider error:", e);
    }

    return { ok: true as const, blocked: false };
  });
