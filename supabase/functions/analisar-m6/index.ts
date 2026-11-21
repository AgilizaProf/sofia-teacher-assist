// Diário de bordo: depois que a professora registra como foi a aula, a Sofia
// lê o registro (e os últimos registros da turma) e sugere um ajuste concreto
// para a próxima aula. Antes este arquivo estava vazio e o pedido sempre falhava.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI, aiErrorResponse, corsHeaders as cors, parseAiJson, jsonTruncado, erroSimples } from "../_shared/sofia-router.ts";
import { userIdFromAuthHeader } from "../_shared/ai-budget.ts";

type Registro = { emoji?: string; title?: string; text?: string; tags?: string[]; date?: string };

const HUMOR: Record<string, string> = {
  "😣": "aula difícil",
  "😐": "aula mais ou menos",
  "🙂": "aula boa",
  "😄": "aula muito boa",
  "🌟": "aula excelente",
};

function linha(r: Registro): string {
  const humor = r.emoji ? HUMOR[r.emoji] ?? r.emoji : "";
  return [r.date, humor, r.title, r.text, r.tags?.length ? `marcas: ${r.tags.join(", ")}` : ""]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 600);
}

function texto(v: unknown, max = 400): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const userId = await userIdFromAuthHeader(req.headers.get("Authorization"));
    const body = await req.json().catch(() => ({}));
    const entry = (body?.entry ?? {}) as Registro;
    const historico = (Array.isArray(body?.historicoEntries) ? body.historicoEntries : []) as Registro[];
    const proxima = body?.proximaAula as
      | { titulo?: string; objetivo?: string; passos?: string[]; diferenciacao?: string }
      | null;
    const turma = texto(body?.turma, 80);

    if (!texto(entry.text) && !texto(entry.title) && !entry.emoji) {
      return new Response(JSON.stringify({ ok: false, error: "O registro está vazio." }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const sys =
      "Você é a Sofia, assistente pedagógica do AgilizaProf. Lê o diário de bordo da professora e sugere um ajuste prático e curto para a próxima aula. " +
      "Use só o que está nos registros: não invente alunos, nomes, notas nem códigos BNCC. Linguagem simples, respeitosa e não capacitista. Devolva JSON estrito.";

    const user = `REGISTRO DE HOJE${turma ? ` (turma ${turma})` : ""}
${linha(entry)}

REGISTROS ANTERIORES (mais recentes primeiro)
${historico.slice(0, 5).map(linha).join("\n") || "(nenhum)"}

PRÓXIMA AULA PLANEJADA
${proxima ? `${texto(proxima.titulo, 120)} · objetivo: ${texto(proxima.objetivo, 240)}${proxima.diferenciacao ? ` · já tem: ${texto(proxima.diferenciacao, 240)}` : ""}` : "(nenhuma aula planejada)"}

Responda APENAS em JSON:
{
  "resumo": "uma frase sobre o que o registro mostra",
  "ajuste": "um ajuste concreto para a próxima aula, em até 2 frases",
  "abertura": "como começar a próxima aula retomando o que aconteceu hoje, em 1 frase",
  "sinais": ["até 3 sinais para observar na próxima aula"]
}`;

    const r = await callAI({ userId, tipo: "diario_analise", system: sys, user, json: true, maxTokens: 1000 });
    if (!r.ok) return aiErrorResponse(r);
    const bruto = parseAiJson<Record<string, unknown>>(r.text || "{}");
    if (r.truncated || jsonTruncado(bruto)) {
      return new Response(
        JSON.stringify({ ok: false, truncated: true, error: "A resposta veio incompleta. Tente de novo." }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }
    const sugestao = {
      resumo: texto(bruto.resumo, 300),
      ajuste: texto(bruto.ajuste, 400),
      abertura: texto(bruto.abertura, 300),
      sinais: (Array.isArray(bruto.sinais) ? bruto.sinais : [])
        .map((s) => texto(s, 160))
        .filter(Boolean)
        .slice(0, 3),
    };
    if (!sugestao.ajuste) {
      return new Response(JSON.stringify({ ok: false, error: "A Sofia não conseguiu sugerir um ajuste agora." }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ sugestao, model: r.model }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[analisar-m6] erro interno", e);
    return erroSimples("A Sofia não conseguiu analisar o registro agora. Tente de novo em instantes.", e);
  }
});
