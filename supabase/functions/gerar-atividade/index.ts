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

    const systemPrompt =
      "Você é Sofia, assistente pedagógica brasileira. Gere planos de atividade " +
      "alinhados à BNCC, em PT-BR, claros e aplicáveis em sala de aula. " +
      "Sempre adapte ao ano escolar informado. Não invente dados sobre alunos. " +
      "Habilidades devem ter código BNCC compatível com o ano escolar.";

    const baseContext = [
      `Tipo de planejamento: ${
        modo === "pcd"
          ? "ATIVIDADE PARA ALUNO PCD (foco em adaptação)"
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
        (incluirPCD
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

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: toolName } },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      if (resp.status === 429) {
        return new Response(
          JSON.stringify({
            error:
              "Sofia está com muitas solicitações agora. Tente de novo em instantes.",
          }),
          { status: 429, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
      if (resp.status === 402) {
        return new Response(
          JSON.stringify({
            error:
              "Créditos da IA esgotados. Adicione créditos em Settings → Workspace → Usage.",
          }),
          { status: 402, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: "Erro ao gerar atividade." }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const rawArgs = call?.function?.arguments;
    const parsed =
      typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs ?? null;

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