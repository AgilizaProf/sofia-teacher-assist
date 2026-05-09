import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI, aiErrorResponse, corsHeaders as cors } from "../_shared/sofia-router.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const {
      turma = "",
      habilidades_cobertas = [],
      semanas_concluidas = 0,
      registros = [],
      alunos = [],
      alunos_pcd = [],
    } = body || {};

    const sys = `Você é a Sofia. Analise a progressão dos alunos com base APENAS nos registros do diário fornecidos. Nunca invente evidências. Use linguagem não-capacitista. Devolva JSON estrito.`;
    const user = `Analise a progressão da turma ${turma} na trilha semestral.

Habilidades BNCC cobertas até agora: ${JSON.stringify(habilidades_cobertas)}
Semanas concluídas: ${semanas_concluidas} de 20
Registros do diário (últimas 4 semanas): ${JSON.stringify((registros as unknown[]).slice(0, 80))}
Alunos da turma: ${JSON.stringify(alunos)}
Alunos PCD: ${JSON.stringify(alunos_pcd)}

Para cada aluno, avalie consolidação por habilidade com evidência dos registros.

Responda APENAS em JSON:
{
  "alunos": [{"nome": "", "habilidades": [{"codigo": "", "status": "consolidada|em_desenvolvimento|nao_iniciada", "evidencia": ""}], "nivel_geral": "avancado|esperado|atencao", "observacao": ""}],
  "turma_resumo": {"habilidades_solidas": [""], "habilidades_frageis": [""], "alunos_atencao": [""]}
}`;

    const r = await callAI({ tipo: "trilha_progressao", system: sys, user, json: true });
    if (!r.ok) return aiErrorResponse(r);
    let progressao: Record<string, unknown> = {};
    try { progressao = JSON.parse(r.text || "{}"); } catch { progressao = { erro: "JSON inválido", raw: r.text }; }
    return new Response(JSON.stringify({ progressao, model: r.model }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});