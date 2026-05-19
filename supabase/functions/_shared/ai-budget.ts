import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Mantido por compatibilidade — não é mais usado como bloqueio.
export const MONTHLY_LIMIT_BRL = Number(Deno.env.get("AI_MONTHLY_LIMIT_BRL") ?? 4.2);
const USD_BRL = Number(Deno.env.get("USD_BRL_RATE") ?? 5.3);
// Conversão custo->créditos. Default: 1 crédito = R$ 0,01 (100 créditos por R$).
const CREDITS_PER_BRL = Number(Deno.env.get("CREDITS_PER_BRL") ?? 100);

// Preço por 1M tokens (USD).
const PRICING: Record<string, { in: number; out: number }> = {
  "google/gemini-2.5-flash": { in: 0.30, out: 2.50 },
};

export function costBrl(model: string, inTok: number, outTok: number): number {
  const p = PRICING[model] ?? PRICING["google/gemini-2.5-flash"];
  const usd = (inTok * p.in + outTok * p.out) / 1_000_000;
  return Number((usd * USD_BRL).toFixed(6));
}

export async function userIdFromAuthHeader(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try {
    const { data } = await admin.auth.getUser(token);
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function getMonthUsageBrl(userId: string): Promise<number> {
  const { data, error } = await admin.rpc("ai_month_usage_brl", { _user_id: userId });
  if (error) {
    console.error("[ai-budget] rpc error:", error);
    return 0;
  }
  return Number(data ?? 0);
}

export function costToCredits(costBrlValue: number): number {
  return Math.max(1, Math.ceil(costBrlValue * CREDITS_PER_BRL));
}

// Agora baseado nos créditos do plano do usuário (creditos_usuario).
// Mantém os nomes usedBrl/limitBrl por compatibilidade, mas representam créditos.
export async function isBudgetExceeded(
  userId: string,
): Promise<{ exceeded: boolean; usedBrl: number; limitBrl: number; creditos: number }> {
  const { data, error } = await admin.rpc("garantir_creditos_usuario", { _user_id: userId });
  if (error) {
    console.error("[ai-budget] garantir_creditos_usuario error:", error);
    return { exceeded: false, usedBrl: 0, limitBrl: 0, creditos: 0 };
  }
  const totais = Number((data as any)?.creditos_totais ?? 0);
  const utilizados = Number((data as any)?.creditos_utilizados ?? 0);
  const disponiveis = Number((data as any)?.creditos_disponiveis ?? totais - utilizados);
  return { exceeded: disponiveis <= 0, usedBrl: utilizados, limitBrl: totais, creditos: disponiveis };
}

export async function recordUsage(args: {
  userId: string;
  provider: "lovable";
  model: string;
  task: string;
  inputTokens: number;
  outputTokens: number;
}): Promise<number> {
  const cost = costBrl(args.model, args.inputTokens, args.outputTokens);
  const { error } = await admin.from("ai_usage").insert({
    user_id: args.userId,
    provider: args.provider,
    model: args.model,
    task: args.task,
    input_tokens: args.inputTokens,
    output_tokens: args.outputTokens,
    cost_brl: cost,
  });
  if (error) console.error("[ai-budget] insert usage error:", error);
  // Desconta créditos do plano do usuário.
  try {
    const qtd = costToCredits(cost);
    const { error: consErr } = await admin.rpc("consumir_creditos", {
      _user_id: args.userId,
      _quantidade: qtd,
      _descricao: `IA: ${args.task} (${args.model})`,
    });
    if (consErr) console.error("[ai-budget] consumir_creditos error:", consErr);
  } catch (e) {
    console.error("[ai-budget] consumir_creditos exception:", e);
  }
  return cost;
}
