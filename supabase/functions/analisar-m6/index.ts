// Diário de bordo (M6): depois que a professora registra uma aula, a Sofia
// sugere um ajuste para a próxima aula.
//
// Este arquivo estava vazio no repositório. Como o deploy publica todas as
// pastas de supabase/functions, uma função vazia iria para o ar no lugar da
// que existe hoje. Esta versão pede login (sem login responde "Sua sessão
// expirou") e limita o tamanho do que vai para a IA. Não cobra créditos, como
// as outras análises do diário.
import { callAI, aiErrorResponse, corsHeaders as cors, parseAiJson } from "../_shared/sofia-router.ts";
import { userIdFromAuthHeader } from "../_shared/ai-budget.ts";
import { respostaSemLogin } from "../_shared/cobranca.ts";

/** Corta textos e listas para a chamada não ficar enorme (custo). */
function curto(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}
function listaCurta(v: unknown, itens: number, max: number): string[] {
  return Array.isArray(v) ? v.slice(0, itens).map((x) => curto(x, max)).filter(Boolean) : [];
}

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const userId = await userIdFromAuthHeader(req.headers.get("Authorization"));
    if (!userId) return respostaSemLogin(cors);

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const entry = (body.entry ?? {}) as Record<string, unknown>;
    const proxima = (body.proximaAula ?? null) as Record<string, unknown> | null;
    const historico = Array.isArray(body.historicoEntries) ? body.historicoEntries.slice(0, 5) : [];

    const registro = {
      titulo: curto(entry.title, 200),
      texto: curto(entry.text, 4000),
      tags: listaCurta(entry.tags, 10, 40),
    };
    if (!registro.texto && !registro.titulo) {
      return json({ ok: false, error: "Escreva o registro da aula antes de pedir a análise." });
    }

    const anteriores = historico.map((h) => {
      const e = (h ?? {}) as Record<string, unknown>;
      return { data: curto(e.date, 20), titulo: curto(e.title, 200), texto: curto(e.text, 1000) };
    });
    const proximaAula = proxima
      ? {
          titulo: curto(proxima.titulo, 200),
          objetivo: curto(proxima.objetivo, 600),
          passos: listaCurta(proxima.passos, 10, 300),
          diferenciacao: curto(proxima.diferenciacao, 600),
        }
      : null;

    const system =
      "Você é a Sofia, parceira pedagógica de professores. A partir do registro do diário de bordo, " +
      "sugira um ajuste concreto para a próxima aula. Use só o que foi registrado, sem inventar fatos sobre alunos. " +
      "Linguagem simples e não-capacitista. Responda em JSON estrito.";
    const user = `Turma: ${curto(body.turma, 80) || "não informada"}

REGISTRO DE HOJE
${JSON.stringify(registro)}

REGISTROS ANTERIORES (mais recentes primeiro)
${JSON.stringify(anteriores)}

PRÓXIMA AULA PLANEJADA
${proximaAula ? JSON.stringify(proximaAula) : "ainda não planejada"}

Responda APENAS em JSON:
{
  "resumo": "uma frase sobre o que aconteceu na aula",
  "ajuste": "o ajuste para a próxima aula, em uma ou duas frases",
  "abertura": "uma atividade curta para abrir a próxima aula",
  "sinais": ["até 3 sinais para observar"]
}`;

    const r = await callAI({ userId, tipo: "diario_analise", system, user, json: true, maxTokens: 1200 });
    if (!r.ok) return aiErrorResponse(r);

    let s: Record<string, unknown> = {};
    try {
      s = parseAiJson(r.text || "{}");
    } catch {
      s = {};
    }
    const sugestao = {
      resumo: curto(s.resumo, 400),
      ajuste: curto(s.ajuste, 600),
      abertura: curto(s.abertura, 400),
      sinais: listaCurta(s.sinais, 3, 200),
    };
    if (!sugestao.ajuste) {
      return json({ ok: false, error: "A Sofia não conseguiu analisar agora. Tente de novo em instantes." });
    }
    return json({ ok: true, sugestao, model: r.model });
  } catch (e) {
    console.error("[analisar-m6] erro interno", e);
    return json({ ok: false, error: "A Sofia não conseguiu analisar agora. Tente de novo em instantes." });
  }
});
