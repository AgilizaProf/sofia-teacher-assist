import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI, aiErrorResponse, corsHeaders as cors, parseAiJson, jsonTruncado, erroSimples } from "../_shared/sofia-router.ts";
import { userIdFromAuthHeader } from "../_shared/ai-budget.ts";
import { CUSTOS, cobrarCreditos, descricaoCobranca, respostaSemLogin } from "../_shared/cobranca.ts";

type Registro = { when?: string; cat?: string; body?: string };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const userId = await userIdFromAuthHeader(req.headers.get("Authorization"));
    if (!userId) return respostaSemLogin(cors);
    const body = await req.json().catch(() => ({}));
    const {
      aluno = "",
      ano_escolar = "",
      turma = "",
      tipo_necessidade = "",
      laudo = "",
      bimestre = "",
      contexto_adicional = "",
      anamneseResumo = "",
      peiAnterior = "",
      registros = [] as Registro[],
      adaptacoes = [] as string[],
      parte = "completo", // "a" | "b" | "completo"
    } = body || {};

    if (!aluno || !bimestre) {
      return new Response(JSON.stringify({ ok: false, error: "Escolha o aluno e o bimestre antes de gerar." }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const linhas = (registros as Registro[]).slice(0, 60)
      .map((r) => `- [${r.when || "—"}] (${r.cat || "ped"}) ${r.body || ""}`).join("\n");
    const adapt = (adaptacoes as string[]).slice(0, 30).map((a) => `- ${a}`).join("\n");

    const sys = `Você é a Sofia, assistente pedagógica do AgilizaProf. Gere um PEI (Plano Educacional Individualizado) completo, em português brasileiro, com linguagem técnica pedagógica. Use APENAS os dados fornecidos. Nunca invente fatos, datas, diagnósticos ou objetivos. Quando faltar informação, diga explicitamente "sem dados suficientes". Devolva JSON estrito.\n\nREGRA DE REDAÇÃO (inviolável): NUNCA mencione, cite ou faça referência a que a informação veio de "observações", "registros", "diário", "anotações", "anamnese", "laudo" ou "notas do(a) professor(a)". Escreva sempre como conhecimento direto e consolidado sobre o(a) aluno(a). Evite expressões como "segundo as observações", "de acordo com os registros", "conforme observado", "com base na anamnese" ou "consta no laudo" — descreva os fatos diretamente, sem citar a origem.`;

    const user = `ALUNO: ${aluno}
ANO ESCOLAR: ${ano_escolar || "não informado"}
TURMA: ${turma || "não informada"}
NECESSIDADE: ${tipo_necessidade || "não informada"}
LAUDO: ${laudo ? laudo : "(sem laudo cadastrado — use apenas o tipo de necessidade)"}
BIMESTRE: ${bimestre}
CONTEXTO ADICIONAL: ${contexto_adicional || "(nenhum)"}

ANAMNESE DO ALUNO:
${anamneseResumo || "(sem anamnese cadastrada)"}

PEI ANTERIOR (use para garantir progressividade nas metas):
${peiAnterior || "(sem PEI anterior — gere objetivos iniciais)"}

HISTÓRICO NO DIÁRIO (${(registros as Registro[]).length} registros):
${linhas || "(nenhum registro)"}

ADAPTAÇÕES JÁ APLICADAS:
${adapt || "(nenhuma registrada)"}

${
  parte === "a"
    ? `Gere SOMENTE a parte A do PEI (perfil + objetivos). Responda APENAS com JSON válido neste formato exato:
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
  ]
}
Regras:
- 3 a 5 objetivos de longo prazo (semestre).
- 2 a 3 objetivos de curto prazo (bimestre atual).
- Sem comparar o aluno com a turma.`
    : parte === "b"
    ? `Gere SOMENTE a parte B do PEI (estratégias, avaliação e responsáveis). Responda APENAS com JSON válido neste formato exato:
{
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
- Estratégias específicas para o tipo de necessidade ("${tipo_necessidade || "não informada"}").
- Sem comparar o aluno com a turma.`
    : `Gere o PEI completo. Responda APENAS com JSON válido neste formato exato:
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
- Sem comparar o aluno com a turma.`
}`;

    // PEI completo com 4.096 tokens era cortado e virava {} (N8). O limite da
    // tarefa "pei" no roteador é 8.000.
    const maxTokens = parte === "completo" ? 8000 : 4000;
    // PEI completo custa 50; quando vem em 2 partes (A e B), cada parte custa a metade.
    const custo = parte === "completo" ? CUSTOS.pei_completo : Math.ceil(CUSTOS.pei_completo / 2);
    const r = await callAI({ userId, tipo: "pei", system: sys, user, json: true, maxTokens, custoCreditos: custo });
    if (!r.ok) return aiErrorResponse(r);

    const parsed = parseAiJson<Record<string, unknown>>(r.text || "{}");
    // Cortado ou ilegível: avisa o app (que mostra "A resposta veio incompleta")
    // em vez de devolver um PEI vazio ou pela metade.
    if (r.truncated || jsonTruncado(parsed)) {
      console.warn("[gerar-pei] resposta cortada", { parte, finish: r.finishReason });
      return new Response(
        JSON.stringify({ ok: false, truncated: true, error: "A resposta veio incompleta. Gere de novo." }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }
    const pei = parsed;
    await cobrarCreditos(userId, custo, descricaoCobranca(body, `PEI completo — ${aluno}`));

    return new Response(JSON.stringify({ pei, model: r.model }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[gerar-pei] erro interno", e);
    return erroSimples("A Sofia não conseguiu gerar o PEI agora. Tente de novo em instantes.", e);
  }
});
