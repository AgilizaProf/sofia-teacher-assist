import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI, aiErrorResponse, corsHeaders as cors } from "../_shared/sofia-router.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
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
    } = body || {};

    const sys = `Você é a Sofia, assistente pedagógica do AgilizaProf. Gere planos semanais encadeados, baseados na BNCC, em linguagem não-capacitista. Não invente alunos nem códigos BNCC. Devolva JSON estrito.`;
    const user = `Gere o plano completo da SEMANA ${semana} dentro da trilha semestral.

CONTEXTO DA TRILHA
Tema central: ${tema_central}
Subtema do mês: ${subtema_mes}
Habilidades foco da semana: ${JSON.stringify(habilidades_semana)}

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

    const r = await callAI({ tipo: "trilha_semana", system: sys, user, json: true, maxTokens: 4000 });
    if (!r.ok) return aiErrorResponse(r);
    let plano: Record<string, unknown> = {};
    try { plano = JSON.parse(r.text || "{}"); } catch { plano = { erro: "JSON inválido", raw: r.text }; }
    return new Response(JSON.stringify({ plano, model: r.model }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});