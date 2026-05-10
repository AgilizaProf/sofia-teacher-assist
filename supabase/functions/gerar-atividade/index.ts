import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AlunoPCD = { nome?: string; tipo?: string; codigo?: string; anotacoes?: string };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const {
      modo = "regular",
      anoEscolar = "",
      disciplina = "",
      tema = "",
      turma = "",
      alunosPCD = [] as AlunoPCD[],
      historico = [] as string[],
      duracao = "",
      tipoAtividade = "",
      incluirPCD = true,
      regenField = "" as string,
      planoAtual = null as Record<string, unknown> | null,
      etapa = "" as string, // "opcoes" para sugerir 4-5 opções de aula
      opcoesSelecionadas = [] as Array<{ titulo?: string; resumo?: string; abordagem?: string }>,
      disciplinasInter = [] as string[],
      alunoFoco = null as { nome?: string; codigo?: string; anotacoes?: string } | null,
      diarioBordo = [] as Array<{ emoji?: string; titulo?: string; texto?: string; tags?: string[]; data?: string; turma?: string; atividadeTitulo?: string }>,
    } = body || {};

    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY ausente no servidor." }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const pcdResumo =
      Array.isArray(alunosPCD) && alunosPCD.length
        ? alunosPCD
            .map(
              (a) =>
                `- ${a.nome || "Aluno"} (${a.tipo || a.codigo || "PCD"})${
                  a.anotacoes ? `: ${a.anotacoes}` : ""
                }`,
            )
            .join("\n")
        : "Nenhum aluno PCD informado.";

    const histResumo =
      Array.isArray(historico) && historico.length
        ? historico.slice(0, 6).map((h) => `- ${h}`).join("\n")
        : "Sem histórico recente.";

    const diarioResumo =
      Array.isArray(diarioBordo) && diarioBordo.length
        ? diarioBordo
            .slice(0, 8)
            .map((d) => {
              const tags = Array.isArray(d.tags) && d.tags.length ? ` [${d.tags.join(", ")}]` : "";
              const obs = (d.texto || "").trim();
              const atv = d.atividadeTitulo ? ` (sobre a atividade "${d.atividadeTitulo}")` : "";
              return `- ${d.emoji || "•"} ${d.data || ""} — ${d.titulo || "registro"}${atv}${tags}${obs ? `: ${obs}` : ""}`;
            })
            .join("\n")
        : "Sem registros recentes no diário.";

    const systemPrompt =
      "Você é Sofia, assistente pedagógica brasileira. Gere planos de atividade " +
      "ESTRITAMENTE alinhados à BNCC (Base Nacional Comum Curricular), em PT-BR, " +
      "claros e aplicáveis em sala de aula. Sempre adapte ao ano escolar informado. " +
      "Não invente dados sobre alunos.\n\n" +
      "REGRAS BNCC OBRIGATÓRIAS:\n" +
      "1) O TEMA/CONTEÚDO da aula deve ser um OBJETO DE CONHECIMENTO previsto pela " +
      "BNCC para o ano escolar e a disciplina/campo de experiência informados. " +
      "Não use conteúdos fora da BNCC nem fora do ano (ex.: não dar 'frações " +
      "equivalentes' para 1º ano). Se o tema enviado pela professora não for " +
      "compatível com o ano, ajuste para o objeto de conhecimento BNCC mais " +
      "próximo do mesmo ano e cite isso em 'sugestoes'.\n" +
      "2) Em 'titulo' e 'objetivo', use a terminologia da BNCC (unidades temáticas, " +
      "objetos de conhecimento e verbos das habilidades).\n" +
      "3) 'habilidades' DEVE conter de 1 a 3 códigos BNCC REAIS e COMPATÍVEIS com o " +
      "ano e a disciplina/campo. Códigos do Ensino Fundamental seguem o padrão " +
      "EF<ANO><ÁREA><NN> (ex.: EF03MA07, EF05LP12, EF07CI04). Educação Infantil " +
      "segue o padrão EI<FAIXA><CAMPO><NN> (ex.: EI03EF06, EI02EO04). NÃO invente " +
      "códigos: se não tiver certeza, prefira o código mais conservador da unidade " +
      "temática correta.\n" +
      "4) A 'descricao' de cada habilidade deve reproduzir, em PT-BR, o enunciado " +
      "da habilidade BNCC (pode ser parafraseado curto, mas fiel ao verbo e ao " +
      "objeto de conhecimento).\n" +
      "5) 'desenvolvimento' deve mostrar como a aula mobiliza a(s) habilidade(s) " +
      "BNCC citada(s).";

    const baseContext = [
      `Tipo de planejamento: ${
        modo === "pcd"
          ? "ATIVIDADE INCLUSIVA PARA ALUNO PCD — TODA a aula deve ser desenhada "
            + "sob a ótica da INCLUSÃO e da acessibilidade. Objetivo, abertura, "
            + "desenvolvimento, fechamento, materiais e sugestões precisam partir "
            + "das possibilidades do(s) aluno(s) PCD, não de uma adaptação posterior. "
            + "Use linguagem afirmativa, princípios do Desenho Universal para a "
            + "Aprendizagem (DUA), múltiplas formas de representação, expressão e "
            + "engajamento, e estratégias inclusivas explícitas."
          : "Atividade regular para a turma toda"
      }`,
      `Ano escolar: ${anoEscolar || "não informado"}`,
      `Turma: ${turma || "não informada"}`,
      `Disciplina: ${disciplina || "livre escolha do(a) docente"}`,
      modo === "pcd" && alunoFoco
        ? `\nALUNO FOCO (a atividade INTEIRA deve ser desenhada PARA este aluno, `
          + `respeitando suas especificidades — não é uma adaptação geral, é uma `
          + `atividade individual):\n`
          + `- Nome: ${alunoFoco.nome || "Aluno"}\n`
          + `- Condição/CID: ${alunoFoco.codigo || "PCD (não especificada)"}\n`
          + `- Anotações da professora: ${alunoFoco.anotacoes || "—"}\n`
          + `Regras obrigatórias:\n`
          + `1) Título, objetivo, abertura, desenvolvimento, fechamento, materiais e `
          + `sugestões devem citar o aluno pelo primeiro nome e ser pensados para `
          + `as peculiaridades descritas (sensoriais, comunicação, motoras, atenção, `
          + `cognitivas — o que se aplicar à condição informada).\n`
          + `2) Em "adaptacoes", traga 3 a 5 adaptações ESPECÍFICAS para este aluno `
          + `(não genéricas para a categoria). Use a categoria que melhor representa `
          + `a condição informada.\n`
          + `3) Materiais devem ser viáveis em sala regular e considerar limitações `
          + `sensoriais/motoras quando aplicável.\n`
          + `4) Sugestões de variação devem oferecer caminhos alternativos quando o `
          + `aluno se desregular ou perder o interesse.`
        : ``,
      Array.isArray(disciplinasInter) && disciplinasInter.length > 0
        ? `Disciplinas a integrar (atividade INTERDISCIPLINAR): ${disciplinasInter.join(", ")}. `
          + `Articule essas áreas em UMA atividade coesa, deixando explícita a contribuição de cada disciplina. `
          + `Inclua habilidades BNCC de TODAS as disciplinas listadas (pelo menos uma por disciplina). `
          + `OBRIGATÓRIO: preencha o campo "contribuicoesInter" com UMA entrada por disciplina listada `
          + `(${disciplinasInter.length} entradas), explicando em 1-2 frases COMO cada disciplina contribui `
          + `para a aula (conceitos, habilidades, momento da atividade onde aparece).`
        : ``,
      `Tema: ${tema || "livre"}`,
      `Duração: ${duracao || "45 min"}`,
      `Tipo de atividade: ${tipoAtividade || "Livre"}`,
      `Incluir adaptações PCD: ${incluirPCD ? "sim" : "não"}`,
      ``,
      `Alunos PCD na turma:`,
      incluirPCD ? pcdResumo : "Adaptações PCD desativadas pela professora.",
      ``,
      `Histórico recente da professora:`,
      histResumo,
      ``,
      `DIÁRIO DE BORDO recente da turma (humor + observações + tags). `
        + `Use estes sinais para calibrar a atividade: se houve agitação ou `
        + `desregulação, prefira aberturas calmas e ritmadas; se algo "funcionou", `
        + `replique a estratégia; se há "precisa reforço", retome o conteúdo com `
        + `outra abordagem; se há registros de "+ inclusão" ou "+ família", `
        + `mantenha esses elementos. Cite explicitamente em "sugestoes" como o `
        + `plano responde aos padrões observados no diário.`,
      diarioResumo,
    ].join("\n");

    // Regeneração por campo: se regenField vier preenchido, pedimos APENAS
    // o campo, mantendo o restante do plano atual como contexto.
    const REGEN_LABELS: Record<string, string> = {
      titulo: "TÍTULO",
      objetivo: "OBJETIVO",
      abertura: "ABERTURA da descrição",
      desenvolvimento: "DESENVOLVIMENTO da descrição",
      fechamento: "FECHAMENTO da descrição",
      habilidades: "HABILIDADES BNCC",
      adaptacoes: "ADAPTAÇÕES PCD",
      sugestoes: "SUGESTÕES de variação",
      materiais: "lista de MATERIAIS",
    };

    const userPrompt = regenField && REGEN_LABELS[regenField]
      ? [
          baseContext,
          ``,
          `Plano atual (mantenha tudo, exceto o campo solicitado):`,
          JSON.stringify(planoAtual ?? {}, null, 2),
          ``,
          `Regenere APENAS o campo "${REGEN_LABELS[regenField]}". `
            + `Devolva o plano completo, mas só esse campo deve mudar; `
            + `os demais campos devem voltar IDÊNTICOS ao plano atual.`,
        ].join("\n")
      : etapa === "opcoes"
      ? [
          baseContext,
          ``,
          `Sugira 5 OPÇÕES DE AULA distintas para este contexto. `
            + `Cada opção deve ter abordagem pedagógica diferente `
            + `(ex.: prática experimental, jogo, leitura colaborativa, `
            + `produção criativa, investigação, debate). `
            + `Não gere o plano completo — apenas título curto, resumo `
            + `(1-2 frases) e abordagem (1 palavra/expressão).`,
        ].join("\n")
      : [
      baseContext,
      ``,
      Array.isArray(opcoesSelecionadas) && opcoesSelecionadas.length > 0
        ? `A professora escolheu ${opcoesSelecionadas.length} opção(ões) de aula `
          + `para combinar em um único plano integrado:\n`
          + opcoesSelecionadas
              .map((o, i) =>
                `${i + 1}. ${o?.titulo || "Opção"} — ${o?.resumo || ""}`
                + (o?.abordagem ? ` (abordagem: ${o.abordagem})` : ""),
              )
              .join("\n")
          + `\nIntegre as abordagens selecionadas em UM plano coeso, `
          + `respeitando a duração total. Se houver mais de uma, `
          + `articule-as como momentos da mesma aula.\n`
        : ``,
      `Gere uma atividade completa. Materiais devem refletir a descrição. ` +
        `Sugira 4 a 5 variações alinhadas ao mesmo objetivo. ` +
        (modo === "pcd"
          ? `A atividade INTEIRA é voltada para INCLUSÃO do aluno PCD: cada momento `
            + `(abertura, desenvolvimento, fechamento) deve indicar COMO o aluno PCD `
            + `participa ativamente junto com a turma, com apoios visuais, sensoriais, `
            + `comunicacionais ou motores conforme a condição. Em "adaptacoes" traga `
            + `3 a 5 itens ESPECÍFICOS para a condição do aluno foco (não genéricos), `
            + `e em "sugestoes" priorize variações que mantenham o(a) aluno(a) `
            + `incluído(a) caso ele(a) se desregule ou perca o interesse.`
          : incluirPCD
          ? `Para adaptações, cubra TEA, TDAH, DI e Deficiência física quando fizer sentido.`
          : `NÃO inclua adaptações PCD (devolva array vazio em "adaptacoes").`),
    ].join("\n");

    const toolPlano = {
      type: "function",
      function: {
        name: "criar_plano_atividade",
        description: "Retorna um plano de atividade pedagógico completo.",
        parameters: {
          type: "object",
          properties: {
            titulo: { type: "string" },
            objetivo: { type: "string" },
            abertura: { type: "string", description: "Descrição da abertura da aula." },
            desenvolvimento: { type: "string" },
            fechamento: { type: "string" },
            habilidades: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  codigo: { type: "string", description: "Código BNCC, ex.: EF03MA03" },
                  descricao: { type: "string" },
                },
                required: ["codigo", "descricao"],
                additionalProperties: false,
              },
            },
            adaptacoes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  categoria: {
                    type: "string",
                    enum: ["TEA", "TDAH", "DI", "Deficiência física", "Outra"],
                  },
                  texto: { type: "string" },
                },
                required: ["categoria", "texto"],
                additionalProperties: false,
              },
            },
            sugestoes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titulo: { type: "string" },
                  descricao: { type: "string" },
                },
                required: ["titulo", "descricao"],
                additionalProperties: false,
              },
            },
            materiais: { type: "array", items: { type: "string" } },
            contribuicoesInter: {
              type: "array",
              description:
                "Quando a atividade é interdisciplinar, uma entrada por disciplina explicando como ela contribui. Caso contrário, array vazio.",
              items: {
                type: "object",
                properties: {
                  disciplina: { type: "string" },
                  contribuicao: { type: "string" },
                },
                required: ["disciplina", "contribuicao"],
                additionalProperties: false,
              },
            },
          },
          required: [
            "titulo",
            "objetivo",
            "abertura",
            "desenvolvimento",
            "fechamento",
            "habilidades",
            "adaptacoes",
            "sugestoes",
            "materiais",
            "contribuicoesInter",
          ],
          additionalProperties: false,
        },
      },
    };

    const toolOpcoes = {
      type: "function",
      function: {
        name: "sugerir_opcoes_aula",
        description: "Retorna 4 a 5 opções distintas de aula para o tema.",
        parameters: {
          type: "object",
          properties: {
            opcoes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titulo: { type: "string" },
                  resumo: { type: "string" },
                  abordagem: { type: "string" },
                },
                required: ["titulo", "resumo", "abordagem"],
                additionalProperties: false,
              },
            },
          },
          required: ["opcoes"],
          additionalProperties: false,
        },
      },
    };

    const useOpcoes = etapa === "opcoes";
    const tool = useOpcoes ? toolOpcoes : toolPlano;
    const toolName = useOpcoes ? "sugerir_opcoes_aula" : "criar_plano_atividade";

    async function callAI(extraUserMsg?: string) {
      const messages: Array<{ role: string; content: string }> = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ];
      if (extraUserMsg) messages.push({ role: "user", content: extraUserMsg });
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
          tools: [tool],
          tool_choice: { type: "function", function: { name: toolName } },
        }),
      });
      return r;
    }

    let resp = await callAI();

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      if (resp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Sofia está com muitas solicitações agora. Tente de novo em instantes." }),
          { status: 429, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
      if (resp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos em Settings → Workspace → Usage." }),
          { status: 402, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: "Erro ao gerar atividade." }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const parseResp = async (r: Response) => {
      const d = await r.json();
      const c = d?.choices?.[0]?.message?.tool_calls?.[0];
      const a = c?.function?.arguments;
      return typeof a === "string" ? JSON.parse(a) : (a ?? null);
    };

    let parsed = await parseResp(resp);

    if (!parsed) {
      return new Response(
        JSON.stringify({ error: "Sofia não conseguiu estruturar a resposta." }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    if (useOpcoes) {
      return new Response(JSON.stringify({ opcoes: parsed.opcoes ?? [] }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // === Validação dos códigos BNCC ===
    const disciplinasParaValidar: string[] =
      Array.isArray(disciplinasInter) && disciplinasInter.length > 0
        ? disciplinasInter
        : disciplina ? [disciplina] : [];
    const validation = validarHabilidadesBNCC(parsed.habilidades, anoEscolar, disciplinasParaValidar);

    if (!validation.ok && validation.invalidos.length > 0) {
      console.warn("BNCC inválidos, tentando regenerar:", validation.invalidos);
      const feedback =
        `As seguintes habilidades BNCC NÃO são válidas para o ano "${anoEscolar}" ` +
        `e disciplina(s) "${disciplinasParaValidar.join(", ") || "—"}": ` +
        validation.invalidos.map((i) => `${i.codigo} (motivo: ${i.motivo})`).join("; ") +
        `. Regenere o plano completo SUBSTITUINDO essas habilidades por códigos BNCC ` +
        `REAIS e compatíveis. Padrão: ${validation.padraoEsperado}. ` +
        `Devolva APENAS chamada da função criar_plano_atividade.`;
      const resp2 = await callAI(feedback);
      if (resp2.ok) {
        const parsed2 = await parseResp(resp2);
        if (parsed2) {
          const v2 = validarHabilidadesBNCC(parsed2.habilidades, anoEscolar, disciplinasParaValidar);
          if (v2.ok) {
            parsed = parsed2;
          } else {
            // mantém apenas os válidos da segunda tentativa; anexa aviso
            const validos = (parsed2.habilidades || []).filter((_: unknown, idx: number) =>
              !v2.invalidos.find((i) => i.indice === idx),
            );
            parsed = {
              ...parsed2,
              habilidades: validos,
              bnccAviso: validos.length === 0
                ? "Não foi possível validar habilidades BNCC para este ano/disciplina. Revise manualmente."
                : `Algumas habilidades BNCC foram removidas por não serem compatíveis com ${anoEscolar}.`,
            };
          }
        }
      }
    }

    return new Response(JSON.stringify({ plano: parsed }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gerar-atividade error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});

// ===========================
// Validador de códigos BNCC
// ===========================

const AREA_EF: Record<string, string[]> = {
  "Língua Portuguesa": ["LP"],
  "Matemática": ["MA"],
  "Ciências": ["CI"],
  "História": ["HI"],
  "Geografia": ["GE"],
  "Arte": ["AR"],
  "Educação Física": ["EF"],
  "Inglês": ["LI"],
  "Língua Inglesa": ["LI"],
  "Ensino Religioso": ["ER"],
};

const CAMPO_EI: Record<string, string> = {
  "O eu, o outro e o nós": "EO",
  "Corpo, gestos e movimentos": "CG",
  "Traços, sons, cores e formas": "TS",
  "Escuta, fala, pensamento e imaginação": "EF",
  "Espaços, tempos, quantidades, relações e transformações": "ET",
};

function isEducacaoInfantil(ano: string): boolean {
  const a = (ano || "").toLowerCase();
  return /infantil|creche|berç|bebê|maternal|pré-?escola/.test(a);
}

function faixaEI(ano: string): string | null {
  const a = (ano || "").toLowerCase();
  if (/(berç|0\s*a\s*1|bebê|0-1)/.test(a)) return "01";
  if (/(maternal|1\s*a\s*3|creche)/.test(a)) return "02";
  if (/(pré|pre|4\s*a\s*5|infantil\s*[45])/.test(a)) return "03";
  return null;
}

function anoNum(ano: string): number {
  const m = (ano || "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

type ValidationItem = { indice: number; codigo: string; motivo: string };

function validarHabilidadesBNCC(
  habilidades: Array<{ codigo?: string; descricao?: string }> | undefined,
  anoEscolar: string,
  disciplinas: string[],
): { ok: boolean; invalidos: ValidationItem[]; padraoEsperado: string } {
  const invalidos: ValidationItem[] = [];
  const lista = Array.isArray(habilidades) ? habilidades : [];

  let padraoEsperado = "EF<ano 2 dígitos><área 2 letras><nn 2 dígitos> ou EI<faixa><campo 2 letras><nn>";

  if (isEducacaoInfantil(anoEscolar)) {
    const faixa = faixaEI(anoEscolar);
    const camposPermitidos = disciplinas
      .map((d) => CAMPO_EI[d])
      .filter(Boolean);
    padraoEsperado = `EI${faixa ?? "<faixa>"}${
      camposPermitidos.length ? "(" + camposPermitidos.join("|") + ")" : "<campo>"
    }<nn>`;
    lista.forEach((h, i) => {
      const cod = (h?.codigo || "").trim().toUpperCase();
      const m = cod.match(/^EI(\d{2})([A-Z]{2})(\d{2})$/);
      if (!m) return invalidos.push({ indice: i, codigo: cod, motivo: "formato EI inválido" });
      if (faixa && m[1] !== faixa) return invalidos.push({ indice: i, codigo: cod, motivo: `faixa ${m[1]} ≠ ${faixa}` });
      if (camposPermitidos.length && !camposPermitidos.includes(m[2])) {
        return invalidos.push({ indice: i, codigo: cod, motivo: `campo ${m[2]} fora dos campos selecionados` });
      }
    });
    return { ok: invalidos.length === 0, invalidos, padraoEsperado };
  }

  // Ensino Fundamental
  const n = anoNum(anoEscolar);
  if (n < 1 || n > 9) {
    // sem ano confiável → não invalidamos por ano, só por formato
    lista.forEach((h, i) => {
      const cod = (h?.codigo || "").trim().toUpperCase();
      if (!/^EF\d{2}[A-Z]{2}\d{2}$/.test(cod)) {
        invalidos.push({ indice: i, codigo: cod, motivo: "formato EF inválido" });
      }
    });
    return { ok: invalidos.length === 0, invalidos, padraoEsperado };
  }
  const anoStr = n.toString().padStart(2, "0");
  const areasPermitidas = disciplinas.flatMap((d) => AREA_EF[d] || []);
  padraoEsperado = `EF${anoStr}${
    areasPermitidas.length ? "(" + areasPermitidas.join("|") + ")" : "<área>"
  }<nn>`;

  lista.forEach((h, i) => {
    const cod = (h?.codigo || "").trim().toUpperCase();
    const m = cod.match(/^EF(\d{2})([A-Z]{2})(\d{2})$/);
    if (!m) return invalidos.push({ indice: i, codigo: cod, motivo: "formato EF inválido" });
    if (m[1] !== anoStr) return invalidos.push({ indice: i, codigo: cod, motivo: `ano ${m[1]} ≠ ${anoStr}` });
    if (areasPermitidas.length && !areasPermitidas.includes(m[2])) {
      return invalidos.push({ indice: i, codigo: cod, motivo: `área ${m[2]} fora das disciplinas selecionadas` });
    }
  });

  return { ok: invalidos.length === 0, invalidos, padraoEsperado };
}