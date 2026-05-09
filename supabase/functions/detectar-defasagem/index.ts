import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI, aiErrorResponse, corsHeaders as cors } from "../_shared/sofia-router.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const {
      ano = "",
      disciplina = "",
      habilidades_trilha = [],
      progressao_atual = [],
      registros = [],
      alunos_pcd = [],
    } = body || {};

    const sys = `Você é a Sofia. Detecte defasagens em habilidades pré-requisito do ano anterior (BNCC oficial). Diferencie defasagem pedagógica de limitação ligada à necessidade especial em alunos PCD. Use linguagem não-capacitista e nunca invente evidências. Devolva JSON estrito.`;
    const user = `Trilha atual — Ano: ${ano} | Disciplina: ${disciplina}
Habilidades BNCC da trilha: ${JSON.stringify(habilidades_trilha)}
Pré-requisitos esperados: identifique a partir das habilidades BNCC oficiais do ano anterior na mesma disciplina.

EVIDÊNCIAS
Progressão atual: ${JSON.stringify((progressao_atual as unknown[]).slice(0, 200))}
Registros do diário relevantes: ${JSON.stringify((registros as unknown[]).slice(0, 80))}
Alunos PCD: ${JSON.stringify(alunos_pcd)}

Para cada aluno com sinal de defasagem, indique habilidade pré-requisito não consolidada, qual habilidade da trilha depende dela, sugestão de retomada (2 a 3 aulas) e urgência.

Responda APENAS em JSON:
{
  "defasagens": [{
    "aluno": "",
    "habilidade_prerequisito": {"codigo": "", "descricao": ""},
    "impacta_habilidade_trilha": {"codigo": "", "descricao": ""},
    "sugestao_retomada": "",
    "urgencia": "alta|media|baixa",
    "pcd_relacionado": false
  }]
}`;

    const r = await callAI({ tipo: "trilha_defasagem", system: sys, user, json: true });
    if (!r.ok) return aiErrorResponse(r);
    let result: Record<string, unknown> = {};
    try { result = JSON.parse(r.text || "{}"); } catch { result = { erro: "JSON inválido", raw: r.text }; }
    return new Response(JSON.stringify({ ...result, model: r.model }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});