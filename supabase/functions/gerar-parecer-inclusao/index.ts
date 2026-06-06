import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI, aiErrorResponse, corsHeaders as cors, parseAiJson } from "../_shared/sofia-router.ts";
import { userIdFromAuthHeader } from "../_shared/ai-budget.ts";
import { matchAnoCurriculo } from "../_shared/matchAno.ts";
import { sanitizarTextoSofia } from "../_shared/sanitize-texto.ts";

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
      anamAnteriorResumo = "",
      registros = [] as Registro[],
      formato = "", // "topicos" | "texto" — obrigatório, sem default
      intervalo = "",
      anoEscolar = "",
      anoReferenciaPedagogico = "",
      anoReferenciaInstrucao = "",
      observacoesProfessor = "",
      avaliacaoBncc = "",
      temPeiReal = false,
      parecerAnteriorTexto = "",
      parecerAnteriorIntervalo = "",
      curriculo_municipal = null as
        | { municipio: string; habilidades: Array<{ codigo: string; descricao: string; ano: string; disciplina: string }> }
        | null,
      nivel_ensino = "",
      tipo_relatorio = "",
      modo = "",
      textoBaseFamilia = "",
    } = body || {};

    // É Educação Infantil? Define a estrutura de saída por campos de experiência.
    const ehEI = tipo_relatorio === "parecer_descritivo" || /infantil/i.test(String(nivel_ensino));

    // Bloqueio: nunca gerar parecer/relatório antes de o usuário escolher o formato
    if (formato !== "topicos" && formato !== "texto") {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "formato_obrigatorio",
          message: "Selecione o formato do relatório (texto corrido ou estruturado) antes de gerar.",
        }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const linhas = (registros as Registro[])
      .slice(0, 80)
      .map((r) => `- [${r.when || "—"}] (${r.cat || "ped"}) ${r.body || ""}`)
      .join("\n");

    const refBlock = (anoReferenciaInstrucao || "").trim();
    const usandoMunicipal = curriculo_municipal && Array.isArray(curriculo_municipal.habilidades) && curriculo_municipal.habilidades.length > 0;
    const referencialLabel = usandoMunicipal ? `Currículo Municipal de ${curriculo_municipal!.municipio}` : "BNCC";
    const habMunicipaisCtx = usandoMunicipal
      ? (() => {
          const alvoAno = (anoReferenciaPedagogico || anoEscolar || "").trim();
          const filtradas = curriculo_municipal!.habilidades.filter((h) => matchAnoCurriculo(alvoAno, h.ano));
          const base = filtradas.length > 0 ? filtradas : curriculo_municipal!.habilidades;
          return `\n\nREFERENCIAL CURRICULAR (regra inviolável): use o ${referencialLabel} como base. NÃO cite códigos BNCC. Cite os códigos do currículo municipal quando relevante.\nHABILIDADES DO CURRÍCULO MUNICIPAL${alvoAno ? ` (filtradas para "${alvoAno}")` : ""}:\n` +
            base.slice(0, 40).map((h) => `- [${h.codigo}] ${h.descricao} (${h.ano} · ${h.disciplina})`).join("\n");
        })()
      : "";
   const temAnamAnterior = Boolean((anamAnteriorResumo || "").trim());
    const anamProgressBlock = temAnamAnterior
      ? `\n\nCOMPARAÇÃO COM ANAMNESE ANTERIOR (use para evidenciar evolução):\n${anamAnteriorResumo}\nINSTRUÇÃO: compare com o estado ATUAL. Destaque avanços com frases como "Desde o último registro, demonstra maior...", "Comparando com o período anterior, já consegue...". NUNCA reforce dificuldades — apenas evidencie crescimento.`
      : "";
   const temPei = Boolean(temPeiReal) && Boolean((peiResumo || "").trim());
    const peiRules = temPei
      ? `\n\nINTEGRAÇÃO COM O PEI (regras invioláveis):\n- O aluno POSSUI um Plano Educacional Individualizado (PEI) — utilize-o como referência principal.\n- Compare o desempenho atual do aluno (registros do período) com os OBJETIVOS, METAS e ADAPTAÇÕES definidos no PEI.\n- Para cada objetivo do PEI, indique quando possível se está: (a) ATINGIDO, (b) EM DESENVOLVIMENTO ou (c) PRECISA DE MAIS ATENÇÃO, sempre citando evidências dos registros.\n- NUNCA contradiga adaptações curriculares, avaliativas, metodologias ou recursos já definidos no PEI. Reforce-os.\n- Use a mesma terminologia e linguagem do PEI para manter consistência entre os documentos.\n- Se o desenvolvimento indicar necessidade de ajuste em alguma meta, sugira de forma DISCRETA usando o marcador: "(Sugestão a avaliar com a equipe pedagógica: considerar atualizar a meta X do PEI)".\n- Mostre a EVOLUÇÃO do aluno em relação ao plano pedagógico já definido.${peiAnteriorResumo ? "\n- Há PEI anterior disponível — descreva brevemente a evolução entre os dois períodos." : ""}`
      : "";
    const sys = `Você é a Sofia, assistente pedagógica especializada em educação inclusiva (Lei 14.254/2021 e BNCC). Gere um parecer descritivo individual, narrativo, em tom profissional e empático, baseado APENAS nos dados reais fornecidos (anamnese, PEI e registros do período). Não invente fatos, datas ou objetivos não citados. Se faltar informação em algum eixo, indique brevemente. Devolva JSON estrito.

PÚBLICO-ALVO (inviolável): este parecer será LIDO PELA FAMÍLIA do(a) aluno(a) — mãe, pai ou responsável, pessoa leiga em pedagogia. Escreva PARA a família, não apenas sobre o(a) aluno(a).

LINGUAGEM (regras invioláveis):
- Clara, objetiva, acolhedora e respeitosa. Frases curtas e diretas.
- NÃO use jargão pedagógico ou clínico sem traduzir ("estimulação sensorial", "função executiva", "autorregulação", "mediação", "comunicação aumentativa"). Quando o conceito for indispensável, explique em palavras simples logo em seguida.
- NÃO use siglas sem explicar (BNCC, PEI, PCD, TEA, TDAH, CID, AEE). Prefira a forma por extenso ou descreva o que significam.
- Evite adjetivos vagos ("excelente", "ótimo", "ruim", "agressivo") — descreva o que a criança faz com exemplos concretos.
- Tom positivo, construtivo e não-capacitista. Sem rótulos ou diagnósticos novos.
- Português brasileiro corrente, voz ativa, presente do indicativo quando possível.

PONTUAÇÃO E ESCRITA (inviolável):
- Use APENAS: letras, números, acentuação gráfica (á é í ó ú â ê ô ã õ ç à) e parênteses ( ).
- PROIBIDO usar: travessão (—), hífen como separador ( - ), aspas angulares (« »), barras (/ \\), sinais de maior/menor (< >), asteriscos (*), colchetes [ ], chaves { }, arroba (@), sustenido (#), pipes (|), underscores (_) ou qualquer outro símbolo tipográfico.
- Para separar ideias dentro de uma frase, use vírgula ou ponto final. Nunca use travessão ou hífen com essa função.
- Não use bullet points, listas com hífen ou markdown dentro dos textos narrativos — escreva em parágrafos corridos.
- Sem palavras inventadas, sem anglicismos desnecessários, sem linguagem jurídica ou clínica sem explicação em seguida.
- Frases completas com sujeito, verbo e complemento. Sem fragmentos de frase.

REGRA DE REDAÇÃO (inviolável): NUNCA mencione, cite ou faça referência a que a informação veio de "observações", "registros", "diário", "anamnese", "PEI", "notas do(a) professor(a)" ou qualquer outra fonte. Escreva sempre como conhecimento direto e consolidado sobre o(a) aluno(a). Evite "segundo as observações", "de acordo com os registros", "conforme observado", "com base na anamnese", "consta no PEI", "as observações indicam" — descreva os fatos diretamente.${
      refBlock ? `\n\nANO DE REFERÊNCIA PEDAGÓGICO (regra inviolável): ${refBlock}` : ""
    }${peiRules}

PRIORIDADE DAS FONTES (regra inviolável): o bloco "OBSERVAÇÕES DO PROFESSOR" (quando presente) é a FONTE PRINCIPAL e guia todo o parecer. Cada parágrafo deve refletir, contextualizar e desenvolver especificamente o que está nessas observações. Nunca produza texto genérico ou padrão quando há observações disponíveis. A avaliação BNCC por área é evidência concreta complementar para sustentar cada eixo.`;

    const user = `Aluno(a): ${aluno || "—"}
Diagnóstico/CID: ${diagnostico || "não informado"}
Período do parecer: ${periodo}
Ano de matrícula: ${anoEscolar || "não informado"}
Ano de referência pedagógico: ${anoReferenciaPedagogico || "(não definido — usar ano de matrícula)"}
Referencial curricular: ${referencialLabel}
${habMunicipaisCtx}
${(observacoesProfessor || "").trim() ? `\nOBSERVAÇÕES DO PROFESSOR (FONTE PRINCIPAL — PRIORIDADE MÁXIMA):\n${observacoesProfessor.trim()}\n\nINSTRUÇÃO INVIOLÁVEL: cada parágrafo do parecer deve refletir e contextualizar especificamente o que está acima. NÃO gere parecer genérico. Use as observações como o fio condutor da narrativa, traduzindo-as em linguagem pedagógica acessível à família.\n` : ""}${(avaliacaoBncc || "").trim() ? `\nAVALIAÇÃO BNCC POR ÁREA (evidência concreta para sustentar cada eixo):\n${avaliacaoBncc}\n` : ""}
Anamnese (resumo dos eixos):
${anamneseResumo || "(sem dados de anamnese)"}${anamProgressBlock}

PEI (resumo${peiAtualizadoEm ? ` · atualizado em ${peiAtualizadoEm}` : ""}):
${peiResumo || "(sem PEI cadastrado — gere o parecer com base em anamnese e registros)"}
${peiAnteriorResumo ? `\nPEI ANTERIOR (para comparar evolução):\n${peiAnteriorResumo}\n` : ""}
${(parecerAnteriorTexto || "").trim() ? `\nPARECER DO PERÍODO ANTERIOR (${parecerAnteriorIntervalo || "período anterior"}) — base para descrever a EVOLUÇÃO (avanços e o que permanece), sem comparar com outras crianças:\n${parecerAnteriorTexto.trim()}\n` : ""}

Intervalo considerado: ${intervalo || periodo}
Registros do diário no período (${(registros as Registro[]).length}):
${linhas || "(nenhum registro)"}

Formato de saída solicitado: ${formato === "texto" ? "TEXTO CORRIDO (um único parecer narrativo, em parágrafos)" : "TÓPICOS (estruturado por eixos)"}

${formato === "texto" ? `Responda APENAS com JSON válido neste formato:
{
  "titulo": "Parecer descritivo · ${periodo}",
 "texto": "Parecer descritivo completo em 4 a 6 parágrafos contínuos, citando o período (${intervalo || periodo}), pedagógico, comportamental, sensorial, família, avanços, desafios e encaminhamentos. Sem títulos internos, sem bullets, em texto corrido.${(parecerAnteriorTexto || "").trim() ? ` Comece com um parágrafo sobre a evolução em relação ao período anterior (${parecerAnteriorIntervalo || "anterior"}).` : ""}"
}` : `Responda APENAS com JSON válido neste formato:
{
  "titulo": "Parecer descritivo · ${periodo}",
  "resumo": "2-3 frases de contexto do(a) aluno(a) no período",
${(parecerAnteriorTexto || "").trim() ? `  "evolucao": "1 parágrafo comparando com o período anterior (${parecerAnteriorIntervalo || "anterior"}): o que avançou e o que permanece em desenvolvimento — sem linguagem comparativa entre crianças nem capacitista",\n` : ""}  "pedagogico": "1 parágrafo sobre desempenho pedagógico",
  ${ehEI ? `  "campos": [
    {"campo": "O eu, o outro e o nós", "texto": "1 parágrafo sobre o desenvolvimento da criança neste campo de experiência, a partir do que foi observado no brincar e na rotina"},
    {"campo": "Corpo, gestos e movimentos", "texto": "1 parágrafo neste campo de experiência"},
    {"campo": "Traços, sons, cores e formas", "texto": "1 parágrafo neste campo de experiência"},
    {"campo": "Escuta, fala, pensamento e imaginação", "texto": "1 parágrafo neste campo de experiência"},
    {"campo": "Espaços, tempos, quantidades, relações e transformações", "texto": "1 parágrafo neste campo de experiência"}
  ],` : `  "pedagogico": "1 parágrafo sobre desempenho pedagógico",
  "comportamental": "1 parágrafo sobre aspectos comportamentais e socioafetivos",
  "sensorial": "1 parágrafo sobre aspectos sensoriais (ou 'sem registros' se não houver)",
  "familia": "1 parágrafo sobre comunicação com a família",`}
  "avancos": ["3 a 5 avanços percebidos no período, descritos diretamente sem citar a origem da informação"],
  "desafios": ["2 a 4 pontos de atenção concretos"],
  "encaminhamentos": ["3 a 5 encaminhamentos práticos para o próximo período"],
  "comunicacao_familias": "1 parágrafo curto pronto para enviar à família"
}`}`;

    const r = await callAI({ userId, tipo: "parecer", system: sys, user, json: true, maxTokens: 8000 });
    if (!r.ok) return aiErrorResponse(r);
    let parecer = parseAiJson<Record<string, unknown>>(r.text || "{}");
    if ((parecer as { _truncated?: boolean })._truncated) {
      console.warn("[gerar-parecer-inclusao] JSON truncado/inválido — devolvendo fallback");
      // Fallback: tenta extrair o conteúdo bruto preservando o formato escolhido.
      // Para "texto", grava no campo texto; para "topicos", grava em resumo.
      const raw = String((parecer as { _raw?: string })._raw || "");
      // Remove cercas de markdown e tenta extrair apenas o valor das chaves esperadas.
      const cleanRaw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```$/g, "").trim();
      const extraiCampo = (campo: string): string => {
        const m = cleanRaw.match(new RegExp(`"${campo}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)`, "i"));
        if (!m) return "";
        try { return JSON.parse('"' + m[1] + '"'); } catch { return m[1]; }
      };
      if (formato === "texto") {
        const texto = extraiCampo("texto") || cleanRaw.slice(0, 4000);
        parecer = { titulo: extraiCampo("titulo") || "Parecer descritivo", texto };
      } else {
        parecer = {
          titulo: extraiCampo("titulo") || "Parecer descritivo",
          resumo: extraiCampo("resumo") || cleanRaw.slice(0, 1500),
          pedagogico: extraiCampo("pedagogico"),
          comportamental: extraiCampo("comportamental"),
          sensorial: extraiCampo("sensorial"),
          familia: extraiCampo("familia"),
          comunicacao_familias: extraiCampo("comunicacao_familias"),
        };
      }
    }
    parecer = sanitizarTextoSofia(parecer) as Record<string, unknown>;
    return new Response(JSON.stringify({ parecer, model: r.model }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[gerar-parecer-inclusao] erro interno", e);
    return new Response(JSON.stringify({ ok: false, error: "Falha ao gerar parecer.", detail: String((e as Error)?.message || e).slice(0, 500) }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
