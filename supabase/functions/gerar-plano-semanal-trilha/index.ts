import { conferirHabilidades } from "../_shared/bnccOficial.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI, aiErrorResponse, corsHeaders as cors, parseAiJson, jsonTruncado, erroSimples } from "../_shared/sofia-router.ts";
import { userIdFromAuthHeader } from "../_shared/ai-budget.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const userId = await userIdFromAuthHeader(req.headers.get("Authorization"));
    const body = await req.json().catch(() => ({}));
    const {
      semana = 1,
      tema_central = "",
      subtema_mes = "",
      habilidades_semana = [] as Array<{ codigo: string; descricao?: string }>,
      resumo_anterior = "",
      titulo_proxima = "",
      turma = "",
      ano = "",
      disciplina = "",
      alunos_pcd = [] as Array<{ nome: string; condicao?: string }>,
      curriculo_municipal = null as { municipio: string; habilidades?: Array<{ codigo: string; descricao: string; ano: string; disciplina: string }> } | null,
    } = body || {};

    const anoStr = String(ano || "").toLowerCase();
    const isEdInfantil = /infantil|berç|maternal|pré[\s-]?(i|ii|escola)|creche|g[1-5]\b/.test(anoStr);
    const usandoMunicipal = !isEdInfantil
      && curriculo_municipal
      && Array.isArray(curriculo_municipal.habilidades)
      && curriculo_municipal.habilidades.length > 0;

    const sys = isEdInfantil
      ? `Você é a Sofia, assistente pedagógica do AgilizaProf. Gere planos semanais encadeados para EDUCAÇÃO INFANTIL, baseados EXCLUSIVAMENTE nos Campos de Experiência da BNCC (códigos EI0X__##). NÃO use disciplinas do Ensino Fundamental (Matemática/Português/etc.). Foque em interações, brincadeiras e eixos estruturantes. Linguagem não-capacitista. Devolva JSON estrito.`
      : usandoMunicipal
        ? `Você é a Sofia, assistente pedagógica do AgilizaProf. Gere planos semanais encadeados alinhados ao CURRÍCULO MUNICIPAL de ${curriculo_municipal!.municipio}. Use os códigos municipais fornecidos no campo habilidade_bncc — NÃO cite códigos BNCC. Linguagem não-capacitista. Devolva JSON estrito.`
        : `Você é a Sofia, assistente pedagógica do AgilizaProf. Gere planos semanais encadeados, baseados na BNCC, em linguagem não-capacitista. Não invente alunos nem códigos BNCC. Devolva JSON estrito.`;

    const referencialStr = usandoMunicipal
      ? `Referencial: Currículo Municipal de ${curriculo_municipal!.municipio} — use os códigos municipais, não BNCC.`
      : "Referencial: BNCC.";
    const user = `Gere o plano completo da SEMANA ${semana} dentro da trilha semestral.${isEdInfantil ? "\n\nIMPORTANTE: turma de EDUCAÇÃO INFANTIL — use APENAS Campos de Experiência da BNCC e códigos EI0X__## em habilidade_bncc. Estruture o dia em rodas, brincadeiras e explorações." : ""}

CONTEXTO DA TRILHA
Tema central: ${tema_central}
Subtema do mês: ${subtema_mes}
Habilidades foco da semana: ${JSON.stringify(habilidades_semana)}
${referencialStr}

ENCADEAMENTO
Semana anterior (${semana - 1}): ${resumo_anterior || "(início da trilha)"}
Próxima semana (${semana + 1}): ${titulo_proxima || "(final da trilha)"}

TURMA: ${turma} | ANO: ${ano} | DISCIPLINA: ${disciplina}
Alunos PCD: ${JSON.stringify(alunos_pcd)}

Estruture o plano com 5 dias (Seg–Sex). Para cada dia inclua: titulo, objetivo, abertura, desenvolvimento, fechamento, materiais, habilidade_bncc, adaptacao_pcd (apenas se houver alunos PCD), prepara_proximo.
Inclua também avaliacao_formativa e ponte_proxima_semana.

Responda APENAS em JSON:
{
  "objetivo_geral": "",
  "dias": [{"dia": "Segunda", "titulo": "", "objetivo": "", "abertura": "", "desenvolvimento": "", "fechamento": "", "materiais": [""], "habilidade_bncc": "", "adaptacao_pcd": "", "prepara_proximo": ""}],
  "avaliacao_formativa": "",
  "ponte_proxima_semana": ""
}`;

    const r = await callAI({ userId, tipo: "trilha_semana", system: sys, user, json: true, maxTokens: 4000 });
    if (!r.ok) return aiErrorResponse(r);
    const plano = parseAiJson<Record<string, unknown>>(r.text || "{}");
    if (r.truncated || jsonTruncado(plano)) {
      console.warn("[gerar-plano-semanal-trilha] resposta cortada", r.finishReason);
      return new Response(
        JSON.stringify({ ok: false, truncated: true, error: "A resposta veio incompleta. Gere de novo." }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }
    // Código de cada dia conferido com a BNCC oficial (ou o currículo da rede).
    if (Array.isArray((plano as { dias?: unknown }).dias)) {
      const municipal = usandoMunicipal ? (curriculo_municipal?.habilidades || []) : null;
      const discs = String(disciplina || "").replace(/^.*\((.*)\).*$/, "$1").split(/,|\se\s/).map((d) => d.trim()).filter(Boolean);
      for (const d of (plano as { dias: Array<Record<string, unknown>> }).dias) {
        const texto = String(d.habilidade_bncc || "");
        const codigos = [
          ...(texto.match(/\bE[FI]\d{2}[A-Z]{2}\d{2}\b/gi) || []),
          ...(municipal || []).map((h) => h.codigo).filter((c) => c && texto.toUpperCase().includes(c.toUpperCase())),
        ];
        if (!codigos.length) continue;
        const conf = conferirHabilidades(codigos.map((c) => ({ codigo: c })), String(ano || ""), discs, municipal);
        d.habilidade_bncc = conf.habilidades.map((h) => `${h.codigo} — ${h.descricao}`).join("; ");
      }
    }
    return new Response(JSON.stringify({ plano, model: r.model }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[gerar-plano-semanal-trilha] erro interno", e);
    return erroSimples("A Sofia não conseguiu gerar o plano da semana agora. Tente de novo em instantes.", e);
  }
});
