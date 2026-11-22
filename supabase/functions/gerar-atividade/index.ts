import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { userIdFromAuthHeader, isBudgetExceeded, recordUsage } from "../_shared/ai-budget.ts";
import { withConstitution } from "../_shared/sofia-constitution.ts";
import { matchAnoCurriculo } from "../_shared/matchAno.ts";
import { conferirHabilidades, habilidadesDoAno, listaParaPrompt } from "../_shared/bnccOficial.ts";
import { semLatexProfundo } from "../_shared/math-text.ts";

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
    const userId = await userIdFromAuthHeader(req.headers.get("Authorization"));
    if (userId) {
      const b = await isBudgetExceeded(userId);
      // Falha ao consultar créditos é erro temporário, não "sem créditos" (N5).
      if (b.erro) {
        return new Response(
          JSON.stringify({
            ok: false,
            creditCheckFailed: true,
            error: "Não consegui conferir seus créditos agora. Tente de novo em instantes.",
          }),
          { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
      if (b.exceeded) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Seus créditos acabaram. Eles renovam no próximo ciclo do seu plano.",
            blocked: true, usedBrl: b.usedBrl, limitBrl: b.limitBrl, creditos: b.creditos,
          }),
          { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
    }
    const body = await req.json().catch(() => ({}));
    const {
      modo = "regular",
      curriculo_municipal = null as { municipio: string; habilidades: Array<{ codigo: string; descricao: string; ano: string; disciplina: string }> } | null,
      anoEscolar = "",
      anoReferenciaPedagogico = "",
      anoReferenciaInstrucao = "",
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
      // Planejar (M1): atividades-base do banco BNCC, uma por cartão da semana.
      // Com elas, a etapa "opcoes" personaliza CADA cartão mantendo a
      // disciplina e o código (N2).
      atividadesBase = [] as Array<{ indice: number; dia?: string; disciplina?: string; codigo?: string; titulo?: string; tipo?: string; minutos?: number }>,
      disciplinasInter = [] as string[],
      alunoFoco = null as { nome?: string; codigo?: string; anotacoes?: string; peiResumo?: string; anamneseResumo?: string } | null,
      diarioBordo = [] as Array<{ emoji?: string; titulo?: string; texto?: string; tags?: string[]; data?: string; turma?: string; atividadeTitulo?: string }>,
    } = body || {};

    // Ano efetivo usado para BNCC/prompt: quando há ano de referência
    // pedagógico, ele PREVALECE sobre o ano de matrícula em todo o pipeline
    // (sugestões, validação BNCC, complexidade, linguagem).
    const anoPedagogico = (anoReferenciaPedagogico || "").trim() || anoEscolar;

    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) {
      console.error("[gerar-atividade] LOVABLE_API_KEY ausente");
      return new Response(
        JSON.stringify({ ok: false, error: "A Sofia está temporariamente indisponível. Já fomos avisados." }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
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
        : "Nenhum aluno informado. NÃO cite nomes de alunos: escreva adaptações gerais (ex.: \"para estudantes com TEA\").";

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

    const usandoMunicipal = curriculo_municipal && Array.isArray(curriculo_municipal.habilidades) && curriculo_municipal.habilidades.length > 0;

    const alvoAno = anoReferenciaPedagogico || anoEscolar || "";
    const habMunicipaisResumo = usandoMunicipal
      ? (() => {
          const filtradas = curriculo_municipal!.habilidades.filter(
            (h) =>
              matchAnoCurriculo(alvoAno, h.ano) &&
              (!disciplina || (h.disciplina || "").toLowerCase().includes(disciplina.toLowerCase())),
          );
          // Fallback: se o filtro de disciplina zerou tudo, mantém só pelo ano
          const base = filtradas.length > 0
            ? filtradas
            : curriculo_municipal!.habilidades.filter((h) => matchAnoCurriculo(alvoAno, h.ano));
          return base
            .slice(0, 40)
            .map((h) => `- ${h.codigo}: ${h.descricao} (${h.ano} · ${h.disciplina})`)
            .join("\n");
        })()
      : null;

    // Habilidades oficiais do ano e componente: a Sofia escolhe desta lista em
    // vez de lembrar códigos de cabeça (evita código real com texto trocado).
    const discsParaLista: string[] =
      Array.isArray(disciplinasInter) && disciplinasInter.length > 0
        ? disciplinasInter
        : disciplina ? [disciplina] : [];
    const habOficiais = habilidadesDoAno(anoPedagogico, discsParaLista);
    const habOficiaisResumo = habOficiais.length ? listaParaPrompt(habOficiais) : "";

    const systemPrompt = usandoMunicipal
     ? `Você é Sofia, assistente pedagógica brasileira. Gere planos de atividade alinhados ao CURRÍCULO MUNICIPAL de ${curriculo_municipal!.municipio}, em PT-BR, claros e aplicáveis em sala de aula. Sempre adapte ao ano escolar informado. Não invente dados sobre alunos.\n\nREGRA DE REDAÇÃO (inviolável): NUNCA mencione, cite ou faça referência a que a informação veio de "observações", "registros", "diário", "anamnese", "PEI", "laudo", "planejamento" ou qualquer outra fonte. Escreva sempre como conhecimento direto sobre o(a) aluno(a). Evite: "de acordo com o PEI", "de acordo com a anamnese", "conforme o PEI", "com base na anamnese", "o PEI prevê", "as anotações indicam" — descreva os fatos diretamente.\n\nREGRAS DO CURRÍCULO MUNICIPAL (invioláveis):\n1) Use EXCLUSIVAMENTE as habilidades e os códigos do currículo municipal fornecido na lista do usuário. É PROIBIDO usar, citar ou converter para códigos da BNCC (ex.: NÃO gere EF03MA07, EF05LP12 etc.).\n2) O campo 'habilidades[].codigo' DEVE ser um código do currículo municipal, copiado EXATAMENTE como aparece na lista fornecida.\n3) A 'descricao' de cada habilidade deve reproduzir, em PT-BR, o enunciado da habilidade municipal correspondente.\n4) Se nenhuma habilidade municipal couber perfeitamente, escolha a mais próxima da lista fornecida — NUNCA invente um código e NUNCA recorra à BNCC.\n5) 'titulo', 'objetivo' e 'desenvolvimento' devem refletir os objetos de conhecimento e a terminologia do currículo municipal, mobilizando explicitamente a(s) habilidade(s) municipal(is) citada(s).`
      : "Você é Sofia, assistente pedagógica brasileira. Gere planos de atividade " +
      "ESTRITAMENTE alinhados à BNCC (Base Nacional Comum Curricular), em PT-BR, " +
      "claros e aplicáveis em sala de aula. Sempre adapte ao ano escolar informado. " +
      "Não invente dados sobre alunos.\n\n" +
      "REGRA DE REDAÇÃO (inviolável): NUNCA mencione, cite ou faça referência a que a informação veio de \"observações\", \"registros\", \"diário\", \"anamnese\", \"PEI\", \"laudo\", \"planejamento\" ou qualquer outra fonte. Escreva sempre como conhecimento direto sobre o(a) aluno(a). Evite: \"segundo as observações\", \"de acordo com os registros\", \"de acordo com o PEI\", \"de acordo com a anamnese\", \"conforme o PEI\", \"com base na anamnese\", \"com base no planejamento\", \"o PEI prevê\", \"conforme planejado\", \"as anotações indicam\" — descreva os fatos diretamente.\n\n" +
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
      `Ano escolar (matrícula): ${anoEscolar || "não informado"}`,
      anoReferenciaPedagogico
        ? `Ano de referência pedagógico: ${anoReferenciaPedagogico} (USE ESTE ano como parâmetro pedagógico para tema, linguagem, complexidade e habilidades BNCC).`
        : "",
      anoReferenciaInstrucao || "",
      `Turma: ${turma || "não informada"}`,
      `Disciplina: ${disciplina || "livre escolha do(a) docente"}`,
      modo === "pcd" && alunoFoco
        ? `\nALUNO FOCO (a atividade INTEIRA deve ser desenhada PARA este aluno, `
          + `respeitando suas especificidades — não é uma adaptação geral, é uma `
          + `atividade individual):\n`
          + `- Nome: ${alunoFoco.nome || "Aluno"}\n`
          + `- Condição/CID: ${alunoFoco.codigo || "PCD (não especificada)"}\n`
          + `- Anotações da professora: ${alunoFoco.anotacoes || "—"}\n`
          + (alunoFoco.peiResumo ? `- PEI vigente (objetivos e metas — a atividade DEVE ser progressiva em relação a eles):\n${alunoFoco.peiResumo}\n` : "")
          + (alunoFoco.anamneseResumo ? `- Anamnese (perfil detalhado do aluno):\n${alunoFoco.anamneseResumo}\n` : "")
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
      `Atividades já realizadas nesta turma/disciplina (NÃO repita temas, habilidades ou abordagens idênticas — sugira progressão ou variação):`,
      histResumo,
      ``,
      Array.isArray(diarioBordo) && diarioBordo.length
        ? `DIÁRIO DE BORDO recente da turma (humor + observações + tags). `
          + `Use estes sinais para calibrar a atividade: se houve agitação ou `
          + `desregulação, prefira aberturas calmas e ritmadas; se algo "funcionou", `
          + `replique a estratégia; se há "precisa reforço", retome o conteúdo com `
          + `outra abordagem; se há registros de "+ inclusão" ou "+ família", `
          + `mantenha esses elementos. Em "sugestoes", diga como o plano responde `
          + `ao que aconteceu nas últimas aulas.`
        : `Não há diário de bordo desta turma. NÃO mencione diário, registros, `
          + `engajamento anterior nem retorno das famílias: não há informação sobre isso.`,
      Array.isArray(diarioBordo) && diarioBordo.length ? diarioResumo : ``,
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
      avaliacao: "AVALIAÇÃO",
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
      : etapa === "opcoes" && Array.isArray(atividadesBase) && atividadesBase.length > 0
      ? [
          baseContext,
          ``,
          `A semana já tem ${atividadesBase.length} atividade(s) definidas pela BNCC. `
            + `Personalize CADA UMA para esta turma, sem trocar a disciplina nem a habilidade:`,
          ...atividadesBase.map((a) =>
            `${a.indice}. [${a.dia || ""}] ${a.disciplina || "Geral"} · ${a.codigo || "sem código"} · ${a.titulo || ""}`
            + (a.minutos ? ` · ${a.minutos} min` : ""),
          ),
          ``,
          `Para cada item devolva uma opção com: "indice" (o MESMO número da lista), `
            + `"disciplina" (a MESMA da lista), "codigo_hab" (o MESMO código da lista), `
            + `"titulo" (curto e concreto, sobre o tema), "resumo" (1-2 frases), `
            + `"abordagem" (1 expressão), "tipo" (ex.: jogo, leitura, investigação), `
            + `"objetivo" (1 frase da disciplina indicada), "materiais" (3 a 5 itens) `
            + `e "passos" (4 a 6 passos curtos). As atividades devem ser DIFERENTES entre si, `
            + `mesmo quando a disciplina se repete na semana: não repita título nem abordagem.`,
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
      habMunicipaisResumo
        ? `HABILIDADES DO CURRÍCULO MUNICIPAL DE ${curriculo_municipal!.municipio} (use ESTES códigos — não BNCC):\n${habMunicipaisResumo}`
        : habOficiaisResumo
        ? `HABILIDADES OFICIAIS DA BNCC para este ano e componente. Escolha de 1 a 3 códigos SOMENTE desta lista, `
          + `os que mais combinam com o tema, e copie o texto de cada um sem mudar:\n${habOficiaisResumo}`
        : ``,
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

    // A descrição do campo `codigo` é o sinal MAIS forte para o modelo no
    // function-calling. Quando há currículo municipal ativo, ela DEVE pedir
    // o código municipal — senão o modelo devolve BNCC mesmo no modo municipal.
    const codigoDesc = usandoMunicipal
      ? `Código do CURRÍCULO MUNICIPAL de ${curriculo_municipal!.municipio}, copiado EXATAMENTE da lista de habilidades municipais fornecida no prompt. NUNCA use códigos da BNCC (ex.: NÃO use EF03MA03) — use somente os códigos do município.`
      : "Código BNCC, ex.: EF03MA03";

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
            avaliacao: {
              type: "string",
              description: "Como a professora acompanha a aprendizagem nesta aula: o que observar, que registro fazer e um critério simples de que o objetivo foi alcançado. 2 a 4 frases.",
            },
            habilidades: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  codigo: { type: "string", description: codigoDesc },
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
            "avaliacao",
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
        description: "Retorna opções distintas de aula para o tema (4 a 5, ou uma por atividade-base recebida).",
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
                  // Campos usados pelo Planejar (M1) quando há atividadesBase.
                  indice: { type: "integer", description: "Número da atividade na lista recebida." },
                  disciplina: { type: "string", description: "Disciplina da atividade, igual à da lista." },
                  codigo_hab: { type: "string", description: "Código da habilidade, igual ao da lista." },
                  tipo: { type: "string" },
                  objetivo: { type: "string" },
                  materiais: { type: "array", items: { type: "string" } },
                  passos: { type: "array", items: { type: "string" } },
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
        { role: "system", content: withConstitution(systemPrompt) },
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
      // Sempre HTTP 200 com { ok:false, error } em português simples: o app
      // (src/lib/sofia/invocarIA.ts) mostra `error` direto na tela.
      if (resp.status === 429) {
        return new Response(
          JSON.stringify({ ok: false, upstreamStatus: 429, error: "A Sofia está com muitos pedidos agora. Tente de novo em instantes." }),
          { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
      if (resp.status === 402) {
        // 402 do gateway = saldo do provedor de IA (não é crédito da professora).
        return new Response(
          JSON.stringify({ ok: false, upstreamStatus: 402, error: "A Sofia está temporariamente indisponível. Já fomos avisados." }),
          { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ ok: false, upstreamStatus: resp.status, error: "A Sofia não conseguiu montar a atividade agora. Tente de novo em instantes." }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const parseResp = async (r: Response) => {
      const d = await r.json();
      if (userId) {
        const inTok = Number(d?.usage?.prompt_tokens ?? 0);
        const outTok = Number(d?.usage?.completion_tokens ?? 0);
        if (inTok || outTok) {
          await recordUsage({
            userId, provider: "lovable", model: "google/gemini-2.5-flash",
            task: useOpcoes ? "atividade_opcoes" : "atividade_plano",
            inputTokens: inTok, outputTokens: outTok,
          });
        }
      }
      const c = d?.choices?.[0]?.message?.tool_calls?.[0];
      const a = c?.function?.arguments;
      let obj: any = null;
      try {
        obj = typeof a === "string" ? JSON.parse(a) : (a ?? null);
      } catch {
        // Argumentos cortados (limite de tokens): sinaliza em vez de quebrar.
        console.warn("[gerar-atividade] JSON da função cortado", d?.choices?.[0]?.finish_reason);
        return { _truncated: true };
      }
      // Fórmulas em LaTeX ($\frac{1}{2}$) viram texto comum (½) antes de ir para o app.
      return obj ? semLatexProfundo(obj) : obj;
    };

    let parsed = await parseResp(resp);

    if (parsed && parsed._truncated) {
      return new Response(
        JSON.stringify({ ok: false, truncated: true, error: "A resposta veio incompleta. Gere de novo." }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }
    if (!parsed) {
      return new Response(
        JSON.stringify({ ok: false, error: "A Sofia não conseguiu organizar a resposta. Gere de novo." }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    if (useOpcoes) {
      return new Response(JSON.stringify({ opcoes: parsed.opcoes ?? [] }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // === Conferência das habilidades (BNCC oficial e currículo da rede) ===
    // Código que não existe ou é de outro ano/componente sai; o texto passa a
    // ser o oficial. Se algo saiu, pede uma vez de novo com a lista certa.
    const municipalLista = usandoMunicipal ? curriculo_municipal!.habilidades : null;
    const disciplinasParaValidar = discsParaLista;
    const conferir = (p: Record<string, unknown>) =>
      conferirHabilidades(p.habilidades as Array<{ codigo?: string; descricao?: string }>, anoPedagogico, disciplinasParaValidar, municipalLista);

    if (!regenField || regenField === "habilidades") {
      let conf = conferir(parsed);
      if (conf.removidas.length > 0 || conf.habilidades.length === 0) {
        console.warn("Habilidades fora da lista oficial, tentando de novo:", conf.removidas);
        const lista = habMunicipaisResumo || habOficiaisResumo;
        const feedback =
          `Estas habilidades não valem para o ano "${anoPedagogico}" e componente "${disciplinasParaValidar.join(", ") || "—"}": ` +
          (conf.removidas.map((i) => `${i.codigo} (${i.motivo})`).join("; ") || "nenhuma habilidade válida") +
          `. Refaça o plano completo usando SOMENTE códigos desta lista, copiando o texto:\n${lista || "(use códigos reais da BNCC)"}\n` +
          `Devolva APENAS a chamada da função criar_plano_atividade.`;
        const resp2 = await callAI(feedback);
        if (resp2.ok) {
          const parsed2 = await parseResp(resp2);
          if (parsed2 && !parsed2._truncated) {
            const conf2 = conferir(parsed2);
            if (conf2.habilidades.length >= conf.habilidades.length) {
              parsed = parsed2;
              conf = conf2;
            }
          }
        }
      }
      parsed = { ...parsed, habilidades: conf.habilidades };
      if (conf.habilidades.length === 0) {
        parsed.bnccAviso = "Não foi possível confirmar uma habilidade oficial para este ano e componente. Escolha uma na lista antes de usar o plano.";
      } else if (conf.removidas.length > 0) {
        parsed.bnccAviso = `Tiramos ${conf.removidas.length === 1 ? "um código que não confere" : "códigos que não conferem"} com a BNCC para ${anoPedagogico}. Confira as habilidades antes de usar.`;
      }
    }

    return new Response(JSON.stringify({ plano: parsed }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gerar-atividade error", e);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "A Sofia não conseguiu montar a atividade agora. Tente de novo em instantes.",
        detail: e instanceof Error ? e.message.slice(0, 500) : undefined,
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
