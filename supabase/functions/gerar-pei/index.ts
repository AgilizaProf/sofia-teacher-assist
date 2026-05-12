import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI, aiErrorResponse, corsHeaders as cors } from "../_shared/sofia-router.ts";
import { userIdFromAuthHeader } from "../_shared/ai-budget.ts";

type Registro = { when?: string; cat?: string; body?: string };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const userId = await userIdFromAuthHeader(req.headers.get("Authorization"));
    const body = await req.json().catch(() => ({}));
    const {
      aluno = "",
      ano_escolar = "",
      turma = "",
      tipo_necessidade = "",
      laudo = "",
      bimestre = "",
      contexto_adicional = "",
      registros = [] as Registro[],
      adaptacoes = [] as string[],
    } = body || {};

    if (!aluno || !bimestre) {
      return new Response(JSON.stringify({ error: "Aluno e bimestre são obrigatórios." }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const linhas = (registros as Registro[]).slice(0, 60)
      .map((r) => `- [${r.when || "—"}] (${r.cat || "ped"}) ${r.body || ""}`).join("\n");
    const adapt = (adaptacoes as string[]).slice(0, 30).map((a) => `- ${a}`).join("\n");

    const sys = `Você é a Sofia, assistente pedagógica do AgilizaProf. Gere um PEI (Plano Educacional Individualizado) completo, em português brasileiro, com linguagem técnica pedagógica. Use APENAS os dados fornecidos. Nunca invente fatos, datas, diagnósticos ou objetivos. Quando faltar informação, diga explicitamente "sem dados suficientes". Devolva JSON estrito.`;

    const user = `ALUNO: ${aluno}
ANO ESCOLAR: ${ano_escolar || "não informado"}
TURMA: ${turma || "não informada"}
NECESSIDADE: ${tipo_necessidade || "não informada"}
LAUDO: ${laudo ? laudo : "(sem laudo cadastrado — use apenas o tipo de necessidade)"}
BIMESTRE: ${bimestre}
CONTEXTO ADICIONAL: ${contexto_adicional || "(nenhum)"}

HISTÓRICO NO DIÁRIO (${(registros as Registro[]).length} registros):
${linhas || "(nenhum registro)"}

ADAPTAÇÕES JÁ APLICADAS:
${adapt || "(nenhuma registrada)"}

Gere o PEI completo. Responda APENAS com JSON válido neste formato exato:
{
  "perfil_aluno": {
    "descricao": "descrição do perfil de aprendizagem",
    "pontos_fortes": ["..."],
    "areas_suporte": ["..."]
  },
  "objetivos_longo": [
    { "id": "long-1", "objetivo": "...", "criterio_avaliacao": "..." }
  ],
  "objetivos_curto": [
    { "id": "curt-1", "objetivo": "...", "indicador": "..." }
  ],
  "estrategias": {
    "comunicacao": ["..."],
    "organizacao": ["..."],
    "materiais": ["..."],
    "interacao": ["..."]
  },
  "avaliacao": {
    "como_avaliar": "...",
    "instrumentos": ["..."]
  },
  "responsaveis": {
    "lista": ["Professora regente", "AEE", "Família"],
    "periodicidade_revisao": "Bimestral"
  }
}

Regras:
- 3 a 5 objetivos de longo prazo (semestre).
- 2 a 3 objetivos de curto prazo (bimestre atual).
- Estratégias específicas para o tipo de necessidade ("${tipo_necessidade || "não informada"}").
- Sem comparar o aluno com a turma.`;

    const r = await callAI({ userId, tipo: "pei", system: sys, user, json: true, maxTokens: 4096 });
    if (!r.ok) return aiErrorResponse(r);

    let pei: Record<string, unknown> = {};
    try { pei = JSON.parse(r.text || "{}"); } catch { pei = {}; }

    return new Response(JSON.stringify({ pei, model: r.model }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});