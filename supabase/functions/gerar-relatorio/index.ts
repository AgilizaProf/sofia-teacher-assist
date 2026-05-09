import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Entry = {
  emoji?: string;
  title?: string;
  text?: string;
  tags?: string[];
  date?: string;
  turma?: string;
  atividadeTitulo?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const {
      periodo = "bimestral",
      turma = "",
      entries = [] as Entry[],
      stats = {} as Record<string, unknown>,
    } = body || {};

    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY ausente no servidor." }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const linhas = (entries as Entry[])
      .slice(0, 60)
      .map((e) => `- [${e.date || "—"}] ${e.emoji || ""} ${e.title || ""}${e.atividadeTitulo ? ` · ${e.atividadeTitulo}` : ""}${e.tags?.length ? ` · tags: ${e.tags.join(", ")}` : ""}${e.text ? ` — ${e.text}` : ""}`)
      .join("\n");

    const sys = `Você é a Sofia, assistente pedagógica. Gere um relatório ${periodo} narrativo, claro e útil para a docente, baseado APENAS nos registros do diário de bordo fornecidos. Devolva JSON estrito.`;
    const user = `Turma: ${turma || "Todas"}\nPeríodo: ${periodo}\nEstatísticas: ${JSON.stringify(stats)}\n\nRegistros (${(entries as Entry[]).length}):\n${linhas || "(nenhum registro)"}\n\nResponda APENAS com JSON válido neste formato:\n{\n  "titulo": "string curta",\n  "resumo": "2-3 frases sobre o período",\n  "destaques": ["3 a 5 pontos positivos"],\n  "alertas": ["2 a 4 pontos de atenção"],\n  "padroes": ["2 a 4 padrões identificados"],\n  "recomendacoes": ["3 a 5 ações concretas para a próxima quinzena"],\n  "comunicacao_familias": "1 parágrafo curto pronto para enviar"\n}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ error: `Gateway ${resp.status}: ${txt}` }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content || "{}";
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { resumo: raw }; }
    return new Response(JSON.stringify({ relatorio: parsed }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});