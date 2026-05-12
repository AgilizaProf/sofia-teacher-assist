import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

export const MONTHLY_LIMIT_BRL = Number(Deno.env.get("AI_MONTHLY_LIMIT_BRL") ?? 4.2);
const USD_BRL = Number(Deno.env.get("USD_BRL_RATE") ?? 5.3);

// Preço por 1M tokens (USD).
const PRICING: Record<string, { in: number; out: number }> = {
  "google/gemini-2.5-flash":      { in: 0.30, out: 2.50 },
  "google/gemini-2.5-flash-lite": { in: 0.10, out: 0.40 },
  "google/gemini-2.5-pro":        { in: 1.25, out: 10.0 },
  "claude-haiku-4-5-20251001":    { in: 1.00, out: 5.00 },
  "openai/gpt-5-mini":            { in: 0.25, out: 2.00 },
  "openai/gpt-5":                 { in: 1.25, out: 10.0 },
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

export async function isBudgetExceeded(userId: string): Promise<{ exceeded: boolean; usedBrl: number; limitBrl: number }> {
  const used = await getMonthUsageBrl(userId);
  return { exceeded: used >= MONTHLY_LIMIT_BRL, usedBrl: used, limitBrl: MONTHLY_LIMIT_BRL };
}

export async function recordUsage(args: {
  userId: string;
  provider: "lovable" | "anthropic";
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
  return cost;
}
