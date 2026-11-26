// Jogos: a Sofia preenche as perguntas e respostas de um jogo a partir de um
// tema (ou da aula planejada). A professora revisa e edita antes de jogar.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI, aiErrorResponse, corsHeaders as cors, parseAiJson, jsonTruncado, erroSimples } from "../_shared/sofia-router.ts";
import { userIdFromAuthHeader } from "../_shared/ai-budget.ts";
import { respostaSemLogin } from "../_shared/cobranca.ts";

function texto(v: unknown, max = 200): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const userId = await userIdFromAuthHeader(req.headers.get("Authorization"));
    // Sem login não chama a IA (antes qualquer pessoa podia usar de graça).
    if (!userId) return respostaSemLogin(cors);
    const body = await req.json().catch(() => ({}));
    const tema = texto(body?.tema, 300);
    if (tema.length < 3) return json({ ok: false, error: "Escreva o tema do jogo." }, 400);
    const jogo = texto(body?.jogo, 60) || "jogo de perguntas";
    const rotuloP = texto(body?.rotuloPergunta, 40) || "Pergunta";
    const rotuloR = texto(body?.rotuloResposta, 40) || "Resposta";
    const ano = texto(body?.ano, 30);
    const qtd = Math.max(3, Math.min(20, Number(body?.quantidade) || 8));
    const maxP = Math.max(20, Math.min(200, Number(body?.maxPergunta) || 120));
    const maxR = Math.max(5, Math.min(80, Number(body?.maxResposta) || 40));

    const sys =
      "Você é a Sofia, assistente pedagógica do AgilizaProf. Cria o conteúdo de jogos educativos para crianças do Ensino Fundamental. " +
      "Perguntas curtas, claras, adequadas à idade, sem pegadinhas. Respostas curtas e sem ambiguidade (uma palavra ou um número quando der). " +
      "Português do Brasil, linguagem simples e respeitosa. Não invente nomes de alunos. Devolva JSON estrito.";

    const user = `Jogo: ${jogo}
Tema: ${tema}${ano ? `\nAno/turma: ${ano}` : ""}
Crie ${qtd} itens diferentes. Cada item tem "${rotuloP}" (até ${maxP} caracteres) e "${rotuloR}" (até ${maxR} caracteres).

Responda APENAS em JSON:
{ "itens": [ { "pergunta": "...", "resposta": "..." } ] }`;

    const r = await callAI({ userId, tipo: "jogo_conteudo", system: sys, user, json: true, maxTokens: 2000 });
    if (!r.ok) return aiErrorResponse(r);
    const bruto = parseAiJson<{ itens?: unknown }>(r.text || "{}");
    if (r.truncated || jsonTruncado(bruto)) {
      return json({ ok: false, truncated: true, error: "A resposta veio incompleta. Tente de novo." });
    }
    const vistos = new Set<string>();
    const itens = (Array.isArray(bruto.itens) ? bruto.itens : [])
      .map((i) => {
        const o = (i ?? {}) as Record<string, unknown>;
        return { pergunta: texto(o.pergunta, maxP), resposta: texto(o.resposta, maxR) };
      })
      .filter((i) => {
        const k = i.pergunta.toLowerCase();
        if (!i.pergunta || !i.resposta || vistos.has(k)) return false;
        vistos.add(k);
        return true;
      })
      .slice(0, qtd);
    if (!itens.length) return json({ ok: false, error: "A Sofia não conseguiu montar o jogo agora. Tente outro tema." });
    return json({ itens, model: r.model });
  } catch (e) {
    console.error("[gerar-jogo] erro interno", e);
    return erroSimples("A Sofia não conseguiu montar o jogo agora. Tente de novo em instantes.", e);
  }
});
