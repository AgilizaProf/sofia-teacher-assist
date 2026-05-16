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
      diagnostico = "",
      periodo = "Bimestral",
      anamneseResumo = "",
      peiResumo = "",
      peiAtualizadoEm = "",
      peiAnteriorResumo = "",
      registros = [] as Registro[],
      formato = "topicos", // "topicos" | "texto"
      intervalo = "",
      anoEscolar = "",
      anoReferenciaPedagogico = "",
      anoReferenciaInstrucao = "",
    } = body || {};

    const linhas = (registros as Registro[])
      .slice(0, 80)
      .map((r) => `- [${r.when || "—"}] (${r.cat || "ped"}) ${r.body || ""}`)
      .join("\n");

    const refBlock = (anoReferenciaInstrucao || "").trim();
    const temPei = Boolean((peiResumo || "").trim());
    const peiRules = temPei
      ? `\n\nINTEGRAÇÃO COM O PEI (regras invioláveis):\n- O aluno POSSUI um Plano Educacional Individualizado (PEI) — utilize-o como referência principal.\n- Compare o desempenho atual do aluno (registros do período) com os OBJETIVOS, METAS e ADAPTAÇÕES definidos no PEI.\n- Para cada objetivo do PEI, indique quando possível se está: (a) ATINGIDO, (b) EM DESENVOLVIMENTO ou (c) PRECISA DE MAIS ATENÇÃO, sempre citando evidências dos registros.\n- NUNCA contradiga adaptações curriculares, avaliativas, metodologias ou recursos já definidos no PEI. Reforce-os.\n- Use a mesma terminologia e linguagem do PEI para manter consistência entre os documentos.\n- Se o desenvolvimento indicar necessidade de ajuste em alguma meta, sugira de forma DISCRETA usando o marcador: "(Sugestão a avaliar com a equipe pedagógica: considerar atualizar a meta X do PEI)".\n- Mostre a EVOLUÇÃO do aluno em relação ao plano pedagógico já definido.${peiAnteriorResumo ? "\n- Há PEI anterior disponível — descreva brevemente a evolução entre os dois períodos." : ""}`
      : "";
    const sys = `Você é a Sofia, assistente pedagógica especializada em educação inclusiva (Lei 14.254/2021 e BNCC). Gere um parecer descritivo individual, narrativo, em tom profissional e empático, baseado APENAS nos dados reais fornecidos (anamnese, PEI e registros do período). Não invente fatos, datas ou objetivos não citados. Se faltar informação em algum eixo, indique brevemente. Devolva JSON estrito.${
      refBlock ? `\n\nANO DE REFERÊNCIA PEDAGÓGICO (regra inviolável): ${refBlock}` : ""
    }${peiRules}`;

    const user = `Aluno(a): ${aluno || "—"}
Diagnóstico/CID: ${diagnostico || "não informado"}
Período do parecer: ${periodo}
Ano de matrícula: ${anoEscolar || "não informado"}
Ano de referência pedagógico: ${anoReferenciaPedagogico || "(não definido — usar ano de matrícula)"}

Anamnese (resumo dos eixos):
${anamneseResumo || "(sem dados de anamnese)"}

PEI (resumo${peiAtualizadoEm ? ` · atualizado em ${peiAtualizadoEm}` : ""}):
${peiResumo || "(sem PEI cadastrado — gere o parecer com base em anamnese e registros)"}
${peiAnteriorResumo ? `\nPEI ANTERIOR (para comparar evolução):\n${peiAnteriorResumo}\n` : ""}

Intervalo considerado: ${intervalo || periodo}
Registros do diário no período (${(registros as Registro[]).length}):
${linhas || "(nenhum registro)"}

Formato de saída solicitado: ${formato === "texto" ? "TEXTO CORRIDO (um único parecer narrativo, em parágrafos)" : "TÓPICOS (estruturado por eixos)"}

${formato === "texto" ? `Responda APENAS com JSON válido neste formato:
{
  "titulo": "Parecer descritivo · ${periodo}",
  "texto": "Parecer descritivo completo em 4 a 6 parágrafos contínuos, citando o período (${intervalo || periodo}), pedagógico, comportamental, sensorial, família, avanços, desafios e encaminhamentos. Sem títulos internos, sem bullets, em texto corrido."
}` : `Responda APENAS com JSON válido neste formato:
{
  "titulo": "Parecer descritivo · ${periodo}",
  "resumo": "2-3 frases de contexto do(a) aluno(a) no período",
  "pedagogico": "1 parágrafo sobre desempenho pedagógico",
  "comportamental": "1 parágrafo sobre aspectos comportamentais e socioafetivos",
  "sensorial": "1 parágrafo sobre aspectos sensoriais (ou 'sem registros' se não houver)",
  "familia": "1 parágrafo sobre comunicação com a família",
  "avancos": ["3 a 5 avanços observados, citando os registros quando possível"],
  "desafios": ["2 a 4 pontos de atenção concretos"],
  "encaminhamentos": ["3 a 5 encaminhamentos práticos para o próximo período"],
  "comunicacao_familias": "1 parágrafo curto pronto para enviar à família"
}`}`;

    const r = await callAI({ userId, tipo: "parecer", system: sys, user, json: true, maxTokens: 3000 });
    if (!r.ok) return aiErrorResponse(r);
    const raw = r.text || "{}";
    let parecer: Record<string, unknown> = {};
    try { parecer = JSON.parse(raw); } catch { parecer = { resumo: raw }; }
    return new Response(JSON.stringify({ parecer, model: r.model }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});