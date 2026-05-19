import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI, aiErrorResponse, corsHeaders as cors } from "../_shared/sofia-router.ts";
import { userIdFromAuthHeader } from "../_shared/ai-budget.ts";

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
    const userId = await userIdFromAuthHeader(req.headers.get("Authorization"));
    const body = await req.json().catch(() => ({}));
    const {
      periodo = "bimestral",
      turma = "",
      entries = [] as Entry[],
      stats = {} as Record<string, unknown>,
    } = body || {};

    const linhas = (entries as Entry[])
      .slice(0, 60)
      .map((e) => `- [${e.date || "—"}] ${e.emoji || ""} ${e.title || ""}${e.atividadeTitulo ? ` · ${e.atividadeTitulo}` : ""}${e.tags?.length ? ` · tags: ${e.tags.join(", ")}` : ""}${e.text ? ` — ${e.text}` : ""}`)
      .join("\n");

    const sys = `Você é a Sofia, assistente pedagógica. Gere um relatório ${periodo} narrativo, baseado APENAS nos registros do diário de bordo fornecidos. Devolva JSON estrito.

PÚBLICO-ALVO (inviolável): este relatório será LIDO PELAS FAMÍLIAS dos(as) alunos(as). Escreva para mães, pais e responsáveis — pessoas leigas em pedagogia.

LINGUAGEM (regras invioláveis):
- Clara, objetiva, acolhedora e respeitosa. Frases curtas e diretas.
- NÃO use jargão pedagógico ("habilidades socioemocionais", "mediação", "estratégias metacognitivas", "processo de letramento", etc.). Quando precisar de um conceito técnico, explique em palavras simples.
- NÃO use siglas sem explicar (BNCC, PEI, PCD, TEA, TDAH, CID). Prefira a forma por extenso ou descreva o que significa.
- Evite adjetivos vagos ("excelente", "ótimo", "ruim") sem fato concreto. Cite o que a criança/turma fez.
- Tom positivo e construtivo, sem rótulos ("aluno difícil", "preguiçoso").
- Use português brasileiro corrente, voz ativa, presente do indicativo quando possível.

REGRA DE REDAÇÃO (inviolável): NUNCA mencione, cite ou faça referência a que a informação veio de "observações", "registros", "diário", "diário de bordo", "anotações", "anamnese", "PEI" ou "notas do(a) professor(a)". Escreva sempre como conhecimento direto e consolidado sobre a turma e os(as) alunos(as). Evite "segundo as observações", "de acordo com os registros", "conforme observado", "com base nos registros", "as anotações indicam" — descreva os fatos diretamente.`;
    const user = `Turma: ${turma || "Todas"}\nPeríodo: ${periodo}\nEstatísticas: ${JSON.stringify(stats)}\n\nRegistros (${(entries as Entry[]).length}):\n${linhas || "(nenhum registro)"}\n\nResponda APENAS com JSON válido neste formato:\n{\n  "titulo": "string curta",\n  "resumo": "2-3 frases sobre o período",\n  "destaques": ["3 a 5 pontos positivos"],\n  "alertas": ["2 a 4 pontos de atenção"],\n  "padroes": ["2 a 4 padrões identificados"],\n  "recomendacoes": ["3 a 5 ações concretas para a próxima quinzena"],\n  "comunicacao_familias": "1 parágrafo curto pronto para enviar"\n}`;

    const r = await callAI({ userId, tipo: "relatorio_bimestral", system: sys, user, json: true, maxTokens: 3000 });
    if (!r.ok) return aiErrorResponse(r);
    const raw = r.text || "{}";
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { resumo: raw }; }
    return new Response(JSON.stringify({ relatorio: parsed, model: r.model }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});