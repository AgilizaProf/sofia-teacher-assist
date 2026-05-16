// Roteador central de modelos da Sofia.
// Gemini 1.5/2.5 Flash via Lovable AI Gateway -> respostas rápidas.
// Claude 3.5 Haiku via API direta da Anthropic -> produção de documentos.
import { isBudgetExceeded, recordUsage, MONTHLY_LIMIT_BRL } from "./ai-budget.ts";
import { withConstitution } from "./sofia-constitution.ts";

export const MODELOS = {
  RAPIDO: "google/gemini-2.5-flash",
  DOCUMENTO: "claude-haiku-4-5-20251001",
} as const;

export type SofiaTaskType =
  | "chat"
  | "sugestoes"
  | "chips"
  | "saudacao"
  | "atalhos"
  | "diario_analise"
  | "padroes"
  | "parecer"
  | "relatorio_bimestral"
  | "pei"
  | "pdi"
  | "trilha_geracao"
  | "trilha_semana"
  | "trilha_relatorio"
  | "trilha_progressao"
  | "trilha_defasagem"
  | "roteiro_ei";

const GEMINI_TASKS: SofiaTaskType[] = [
  "chat",
  "sugestoes",
  "chips",
  "saudacao",
  "atalhos",
  "diario_analise",
  "padroes",
  "trilha_progressao",
  "trilha_defasagem",
];
const HAIKU_TASKS: SofiaTaskType[] = [
  "parecer",
  "relatorio_bimestral",
  "pei",
  "pdi",
  "trilha_geracao",
  "trilha_semana",
  "trilha_relatorio",
  "roteiro_ei",
];

export function rotear(tipo: SofiaTaskType): { provider: "lovable" | "anthropic"; model: string } {
  if (GEMINI_TASKS.includes(tipo)) return { provider: "lovable", model: MODELOS.RAPIDO };
  if (HAIKU_TASKS.includes(tipo)) return { provider: "anthropic", model: MODELOS.DOCUMENTO };
  throw new Error(`Tipo de tarefa desconhecido: ${tipo}`);
}

export type CallAIArgs = {
  tipo: SofiaTaskType;
  system: string;
  user: string;
  json?: boolean;
  maxTokens?: number;
  userId?: string | null;
};

export type CallAIResult = {
  ok: boolean;
  status: number;
  text: string;
  error?: string;
  provider: "lovable" | "anthropic";
  model: string;
  usage?: { inputTokens: number; outputTokens: number; costBrl: number };
  blocked?: boolean;
  usedBrl?: number;
  limitBrl?: number;
  /** true quando a resposta foi cortada por limite de tokens. */
  truncated?: boolean;
  /** Motivo de parada bruto retornado pelo provedor. */
  finishReason?: string;
};

// Limites de tokens por tipo de tarefa.
// Curtas (chat), médias (atividades/estratégias), longas (pareceres/relatórios),
// muito longas (documentos institucionais completos).
const TOKEN_LIMITS: Record<SofiaTaskType, number> = {
  // curtas
  chat: 1000,
  sugestoes: 1000,
  chips: 1000,
  saudacao: 1000,
  atalhos: 1000,
  diario_analise: 1000,
  padroes: 1000,
  // médias
  trilha_progressao: 2000,
  trilha_defasagem: 2000,
  trilha_semana: 2000,
  roteiro_ei: 2000,
  // longas
  parecer: 4000,
  relatorio_bimestral: 4000,
  trilha_relatorio: 4000,
  trilha_geracao: 4000,
  // muito longas
  pei: 8000,
  pdi: 8000,
};

export function maxTokensFor(tipo: SofiaTaskType): number {
  return TOKEN_LIMITS[tipo] ?? 2000;
}

export async function callAI(args: CallAIArgs): Promise<CallAIResult> {
  const route = rotear(args.tipo);
  const maxTokens = args.maxTokens ?? maxTokensFor(args.tipo);

  // CONSTITUIÇÃO INVIOLÁVEL: prepend automático em TODAS as chamadas de IA.
  // Garante que os 14 princípios + regras gerais cheguem ao modelo, sem
  // depender de cada edge function lembrar de incluí-los.
  const systemPrompt = withConstitution(args.system);

  // Checagem de orçamento ANTES da chamada (evita gastar se já estourou).
  if (args.userId) {
    const b = await isBudgetExceeded(args.userId);
    if (b.exceeded) {
      return {
        ok: false,
        status: 402,
        text: "",
        error: `Limite mensal de IA atingido (R$ ${b.usedBrl.toFixed(2)} / R$ ${b.limitBrl.toFixed(2)}).`,
        blocked: true,
        usedBrl: b.usedBrl,
        limitBrl: b.limitBrl,
        ...route,
      };
    }
  }

  if (route.provider === "lovable") {
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) {
      return { ok: false, status: 500, text: "", error: "LOVABLE_API_KEY ausente.", ...route };
    }
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: route.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.user },
        ],
        max_tokens: maxTokens,
        ...(args.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      return { ok: false, status: resp.status, text: "", error: txt, ...route };
    }
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content || "";
    const finishReason: string = data?.choices?.[0]?.finish_reason || "";
    const truncated = finishReason === "length" || finishReason === "MAX_TOKENS";
    const inTok = Number(data?.usage?.prompt_tokens ?? 0);
    const outTok = Number(data?.usage?.completion_tokens ?? 0);
    let costBrl = 0;
    if (args.userId) {
      costBrl = await recordUsage({ userId: args.userId, provider: "lovable", model: route.model, task: args.tipo, inputTokens: inTok, outputTokens: outTok });
    }
    return { ok: true, status: 200, text, usage: { inputTokens: inTok, outputTokens: outTok, costBrl }, truncated, finishReason, ...route };
  }

  // Anthropic provider (Claude 3.5 Haiku)
  const KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!KEY) {
    return { ok: false, status: 500, text: "", error: "ANTHROPIC_API_KEY ausente.", ...route };
  }
  const userMsg = args.json
    ? `${args.user}\n\nResponda APENAS com JSON válido, sem texto antes ou depois, sem markdown.`
    : args.user;
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: route.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    return { ok: false, status: resp.status, text: "", error: txt, ...route };
  }
  const data = await resp.json();
  let text: string = data?.content?.[0]?.text || "";
  const stopReason: string = data?.stop_reason || "";
  const truncated = stopReason === "max_tokens";
  if (args.json) {
    // Strip code fences and isolate JSON object.
    text = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) text = text.slice(start, end + 1);
  }
  const inTok = Number(data?.usage?.input_tokens ?? 0);
  const outTok = Number(data?.usage?.output_tokens ?? 0);
  let costBrl = 0;
  if (args.userId) {
    costBrl = await recordUsage({ userId: args.userId, provider: "anthropic", model: route.model, task: args.tipo, inputTokens: inTok, outputTokens: outTok });
  }
  return { ok: true, status: 200, text, usage: { inputTokens: inTok, outputTokens: outTok, costBrl }, truncated, finishReason: stopReason, ...route };
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function aiErrorResponse(r: CallAIResult): Response {
  if (r.blocked) {
    return new Response(
      JSON.stringify({
        error: `Você atingiu o limite mensal de uso da IA (R$ ${MONTHLY_LIMIT_BRL.toFixed(2)}). O contador zera no início do próximo mês.`,
        blocked: true,
        usedBrl: r.usedBrl,
        limitBrl: r.limitBrl,
      }),
      { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  if (r.status === 429) {
    return new Response(
      JSON.stringify({ error: "Estou com muitas conversas agora. Tente em instantes." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  if (r.status === 402) {
    return new Response(
      JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }),
      { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  if (r.status === 401 || r.status === 403) {
    return new Response(
      JSON.stringify({ error: "Estou com dificuldade de conexão com a IA. Tente em instantes." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  return new Response(
    JSON.stringify({ error: "Estou com dificuldade de conexão. Tente em instantes." }),
    { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}