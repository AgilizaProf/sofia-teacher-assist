// Roteador central de modelos da Sofia.
// Gemini 1.5/2.5 Flash via Lovable AI Gateway -> respostas rápidas.
// Claude 3.5 Haiku via API direta da Anthropic -> produção de documentos.

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
  | "pdi";

const GEMINI_TASKS: SofiaTaskType[] = [
  "chat",
  "sugestoes",
  "chips",
  "saudacao",
  "atalhos",
  "diario_analise",
  "padroes",
];
const HAIKU_TASKS: SofiaTaskType[] = [
  "parecer",
  "relatorio_bimestral",
  "pei",
  "pdi",
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
};

export type CallAIResult = {
  ok: boolean;
  status: number;
  text: string;
  error?: string;
  provider: "lovable" | "anthropic";
  model: string;
};

export async function callAI(args: CallAIArgs): Promise<CallAIResult> {
  const route = rotear(args.tipo);

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
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
        ...(args.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      return { ok: false, status: resp.status, text: "", error: txt, ...route };
    }
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content || "";
    return { ok: true, status: 200, text, ...route };
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
      max_tokens: args.maxTokens ?? 4096,
      system: args.system,
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    return { ok: false, status: resp.status, text: "", error: txt, ...route };
  }
  const data = await resp.json();
  let text: string = data?.content?.[0]?.text || "";
  if (args.json) {
    // Strip code fences and isolate JSON object.
    text = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) text = text.slice(start, end + 1);
  }
  return { ok: true, status: 200, text, ...route };
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function aiErrorResponse(r: CallAIResult): Response {
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