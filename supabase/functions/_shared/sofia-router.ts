// Roteador central de modelos da Sofia.
// Gemini 2.5 Flash direto via Google AI API (sem passar pelo Lovable Gateway).
// Flash → respostas rápidas e chat.
// Flash-Lite → tarefas simples (sugestões, chips, saudação).
import { isBudgetExceeded, recordUsage } from "./ai-budget.ts";
import { withConstitution } from "./sofia-constitution.ts";

export const MODELOS = {
  RAPIDO: "gemini-2.5-flash",
  LITE:   "gemini-2.5-flash-lite",
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

const TAREFAS_LITE: SofiaTaskType[] = [
  "sugestoes", "chips", "saudacao", "atalhos", "padroes",
];

export function rotear(tipo: SofiaTaskType): { provider: "google"; model: string } {
  const model = TAREFAS_LITE.includes(tipo) ? MODELOS.LITE : MODELOS.RAPIDO;
  return { provider: "google", model };
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
  provider: "google";
  model: string;
  usage?: { inputTokens: number; outputTokens: number; costBrl: number };
  blocked?: boolean;
  usedBrl?: number;
  limitBrl?: number;
  truncated?: boolean;
  finishReason?: string;
};

const TOKEN_LIMITS: Record<SofiaTaskType, number> = {
  chat:           1000,
  sugestoes:      1000,
  chips:          1000,
  saudacao:       1000,
  atalhos:        1000,
  diario_analise: 1000,
  padroes:        1000,
  trilha_progressao: 2000,
  trilha_defasagem:  2000,
  trilha_semana:     2000,
  roteiro_ei:        2000,
  parecer:            4000,
  relatorio_bimestral:4000,
  trilha_relatorio:   4000,
  trilha_geracao:     4000,
  pei: 8000,
  pdi: 8000,
};

export function maxTokensFor(tipo: SofiaTaskType): number {
  return TOKEN_LIMITS[tipo] ?? 2000;
}

export async function callAI(args: CallAIArgs): Promise<CallAIResult> {
  const route = rotear(args.tipo);
  const maxTokens = args.maxTokens ?? maxTokensFor(args.tipo);
  const systemPrompt = withConstitution(args.system);

  if (args.userId) {
    const b = await isBudgetExceeded(args.userId);
    if (b.exceeded) {
      return {
        ok: false,
        status: 402,
        text: "",
        error: `Você não tem créditos disponíveis (${b.usedBrl}/${b.limitBrl} usados).`,
        blocked: true,
        usedBrl: b.usedBrl,
        limitBrl: b.limitBrl,
        ...route,
      };
    }
  }

  const KEY = Deno.env.get("GOOGLE_API_KEY");
  if (!KEY) {
    return { ok: false, status: 500, text: "", error: "GOOGLE_API_KEY ausente.", ...route };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${route.model}:generateContent?key=${KEY}`;

  const body: Record<string, unknown> = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: args.user }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      ...(args.json ? { responseMimeType: "application/json" } : {}),
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    return { ok: false, status: resp.status, text: "", error: txt, ...route };
  }

  const data = await resp.json();
  const candidate = data?.candidates?.[0];
  const text: string = candidate?.content?.parts?.[0]?.text || "";
  const finishReason: string = candidate?.finishReason || "";
  const truncated = finishReason === "MAX_TOKENS";

  const inTok  = Number(data?.usageMetadata?.promptTokenCount ?? 0);
  const outTok = Number(data?.usageMetadata?.candidatesTokenCount ?? 0);

  let costBrl = 0;
  if (args.userId) {
    costBrl = await recordUsage({
      userId: args.userId,
      provider: "google",
      model: route.model,
      task: args.tipo,
      inputTokens: inTok,
      outputTokens: outTok,
    });
  }

  return {
    ok: true,
    status: 200,
    text,
    usage: { inputTokens: inTok, outputTokens: outTok, costBrl },
    truncated,
    finishReason,
    ...route,
  };
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
        error: `Você não tem créditos disponíveis (${r.usedBrl ?? 0}/${r.limitBrl ?? 0} usados). Aguarde a renovação do seu plano ou faça upgrade.`,
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
