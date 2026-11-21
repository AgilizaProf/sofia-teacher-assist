// Server-only: gating de IA baseado nos créditos do plano do usuário.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Mantido por compatibilidade — não é mais usado como bloqueio.
export const MONTHLY_LIMIT_BRL = Number(process.env.AI_MONTHLY_LIMIT_BRL ?? 4.2);
const USD_BRL = Number(process.env.USD_BRL_RATE ?? 5.3);
const CREDITS_PER_BRL = Number(process.env.CREDITS_PER_BRL ?? 100);

const PRICING: Record<string, { in: number; out: number }> = {
  "google/gemini-2.5-flash": { in: 0.30, out: 2.50 },
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

export function costToCredits(costBrlValue: number): number {
  return Math.max(1, Math.ceil(costBrlValue * CREDITS_PER_BRL));
}

export async function isBudgetExceeded(
  userId: string,
): Promise<{ exceeded: boolean; usedBrl: number; limitBrl: number; creditos: number; erro?: boolean }> {
  // Falha ao consultar NÃO é "0 créditos": devolve erro: true (N5).
  let data: unknown = null;
  let error: unknown = null;
  try {
    ({ data, error } = await supabaseAdmin.rpc("garantir_creditos_usuario", { _user_id: userId }));
  } catch (e) {
    error = e;
  }
  if (error || !data) {
    console.error("[aiBudget] garantir_creditos_usuario error:", error ?? "sem dados");
    return { exceeded: false, usedBrl: 0, limitBrl: 0, creditos: 0, erro: true };
  }
  const d = data as any;
  const totais = Number(d?.creditos_totais ?? 0);
  const utilizados = Number(d?.creditos_utilizados ?? 0);
  const disponiveis = Number(d?.creditos_disponiveis ?? totais - utilizados);
  return { exceeded: disponiveis <= 0, usedBrl: utilizados, limitBrl: totais, creditos: disponiveis };
}

export class BudgetExceededError extends Error {
  usedBrl: number;
  limitBrl: number;
  constructor(usedBrl: number, limitBrl: number) {
    super("Seus créditos acabaram. Eles renovam no próximo ciclo do seu plano.");
    this.usedBrl = usedBrl;
    this.limitBrl = limitBrl;
    this.name = "BudgetExceededError";
  }
}

/** Falha temporária ao consultar créditos (não é falta de créditos). */
export class BudgetCheckError extends Error {
  constructor() {
    super("Não consegui conferir seus créditos agora. Tente de novo em instantes.");
    this.name = "BudgetCheckError";
  }
}

export async function assertBudget(userId: string): Promise<void> {
  const b = await isBudgetExceeded(userId);
  if (b.erro) throw new BudgetCheckError();
  if (b.exceeded) throw new BudgetExceededError(b.usedBrl, b.limitBrl);
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
  // O consumo de créditos é controlado no cliente, por custo fixo da funcionalidade
  // (CUSTOS em src/lib/creditos/policy.ts). Aqui apenas registramos uso técnico.
  return cost;
}
