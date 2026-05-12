// Server-only: tracker de orçamento mensal de IA por usuário.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const MONTHLY_LIMIT_BRL = Number(process.env.AI_MONTHLY_LIMIT_BRL ?? 4.2);
const USD_BRL = Number(process.env.USD_BRL_RATE ?? 5.3);

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

export async function getMonthUsageBrl(userId: string): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("ai_month_usage_brl", { _user_id: userId });
  if (error) {
    console.error("[aiBudget] rpc error:", error);
    return 0;
  }
  return Number(data ?? 0);
}

export async function isBudgetExceeded(userId: string): Promise<{ exceeded: boolean; usedBrl: number; limitBrl: number }> {
  const used = await getMonthUsageBrl(userId);
  return { exceeded: used >= MONTHLY_LIMIT_BRL, usedBrl: used, limitBrl: MONTHLY_LIMIT_BRL };
}

export class BudgetExceededError extends Error {
  usedBrl: number;
  limitBrl: number;
  constructor(usedBrl: number, limitBrl: number) {
    super(`Limite mensal de IA atingido (R$ ${usedBrl.toFixed(2)} / R$ ${limitBrl.toFixed(2)}).`);
    this.usedBrl = usedBrl;
    this.limitBrl = limitBrl;
    this.name = "BudgetExceededError";
  }
}

export async function assertBudget(userId: string): Promise<void> {
  const b = await isBudgetExceeded(userId);
  if (b.exceeded) throw new BudgetExceededError(b.usedBrl, b.limitBrl);
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
  const { error } = await supabaseAdmin.from("ai_usage").insert({
    user_id: args.userId,
    provider: args.provider,
    model: args.model,
    task: args.task,
    input_tokens: args.inputTokens,
    output_tokens: args.outputTokens,
    cost_brl: cost,
  });
  if (error) console.error("[aiBudget] insert error:", error);
  return cost;
}
