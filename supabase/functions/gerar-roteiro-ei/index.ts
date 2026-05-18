import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI, aiErrorResponse, corsHeaders as cors } from "../_shared/sofia-router.ts";
import { userIdFromAuthHeader } from "../_shared/ai-budget.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const userId = await userIdFromAuthHeader(req.headers.get("Authorization"));
    const body = await req.json().catch(() => ({}));
    const {
      turma = "",
      faixa_etaria = "",
      campos_experiencia = [] as string[],
      tema = "",
      tipo_experiencia = "",
      duracao = 30,
      alunos_pcd = [] as string[],
    } = body || {};

    if (!faixa_etaria || !Array.isArray(campos_experiencia) || campos_experiencia.length === 0) {
      return new Response(
        JSON.stringify({ error: "Faixa etária e ao menos um Campo de Experiência são obrigatórios." }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const tempoAtencao: Record<string, string> = {
      "Bebês (0 a 1a6m)": "3 a 5 minutos por estímulo",
      "Bem pequenos (1a7m a 3a11m)": "10 a 15 minutos por experiência",
      "Pequenos (4 anos)": "20 a 30 minutos por experiência",
      "Maiores (5 anos)": "30 a 40 minutos por experiência",
    };
    const tempo = tempoAtencao[faixa_etaria] || "tempo adequado à faixa etária";

    const sys = `Você é a Sofia, assistente pedagógica do AgilizaProf, especializada em Educação Infantil (BNCC-EI). NUNCA use termos do Ensino Fundamental (habilidade BNCC, plano de aula, avaliação formal, exercício, disciplina, nota, conceito, rendimento). USE: campos de experiência, intenção pedagógica, observação e registro, brincadeira, vivência, roteiro de experiência, marcos de desenvolvimento. Linguagem em português brasileiro, acolhedora, focada nas crianças. Responda APENAS em JSON válido.\n\nREGRA DE REDAÇÃO (inviolável para parecer/relatório descritivo): NUNCA mencione, cite ou faça referência a que a informação veio de "observações", "registros", "anotações", "anamnese" ou "notas do(a) educador(a)" ao descrever a criança. Escreva sempre como conhecimento direto sobre a criança (ex.: "demonstra interesse em…", "está desenvolvendo…", "avança em…"). Os campos estruturais do roteiro (o_que_observar, registro) continuam usando esses termos normalmente — a regra vale para descrições da criança.`;

    const user = `Crie um ROTEIRO DE EXPERIÊNCIA para Educação Infantil.

TURMA: ${turma || "não informada"}
FAIXA ETÁRIA: ${faixa_etaria}
CAMPO(S) DE EXPERIÊNCIA: ${campos_experiencia.join(" + ")}
TEMA / CONTEXTO: ${tema || "(livre — escolha um disparador adequado à faixa)"}
TIPO DE EXPERIÊNCIA: ${tipo_experiencia || "(livre)"}
DURAÇÃO PREVISTA: ${duracao} minutos
ALUNOS PCD NA TURMA: ${alunos_pcd.length ? alunos_pcd.join(", ") : "(nenhum)"}

TEMPO DE ATENÇÃO ESPERADO PARA ESSA FAIXA: ${tempo}

Devolva APENAS JSON válido neste formato exato:
{
  "titulo": "título criativo da experiência em linguagem infantil",
  "intencao_pedagogica": {
    "descricao": "o que a professora intenciona observar e favorecer",
    "direitos_aprendizagem": ["Brincar", "Explorar", ...]
  },
  "preparacao_ambiente": {
    "organizacao": "como organizar o espaço antes das crianças chegarem",
    "materiais": ["material 1", "material 2"],
    "cuidados_seguranca": "cuidados específicos (ou 'sem cuidados especiais')"
  },
  "acolhida": {
    "tempo": "tempo aproximado",
    "como_iniciar": "música, história, pergunta ou elemento disparador"
  },
  "desenvolvimento": {
    "o_que_oferecer": "o que a professora propõe",
    "como_explorar": "como as crianças podem explorar",
    "papel_professora": "observar, mediar, participar"
  },
  "encerramento": "como encerrar respeitando o ritmo das crianças",
  "observacao_registro": {
    "o_que_observar": "o que observar em cada criança durante a experiência",
    "como_registrar": "foto, anotação, portfólio",
    "indicadores_desenvolvimento": ["indicador 1", "indicador 2", "indicador 3"]
  },
  "adaptacoes_pcd": ${alunos_pcd.length ? '"ajustes específicos por tipo de necessidade, sem segregar"' : '""'}
}

Regras:
- 2 a 4 direitos de aprendizagem (Brincar, Explorar, Expressar, Conviver, Participar, Conhecer-se).
- 3 a 5 materiais adequados à faixa etária.
- 3 a 4 indicadores de desenvolvimento concretos.
- ${faixa_etaria.includes("Bebês") ? "Para BEBÊS: sem mesas, sem exercícios escritos, sem avaliação formal. Inclua rotina e cuidado." : ""}
- ${faixa_etaria.includes("Bem pequenos") ? "Para BEM PEQUENOS: máximo 2 materiais centrais, espaço para exploração livre." : ""}
- ${faixa_etaria.includes("Pré") || faixa_etaria.includes("Pequenos") || faixa_etaria.includes("Maiores") ? "PRÉ-ESCOLA: pode incluir registro (desenho, colagem, fala). NUNCA cópia, ditado ou exercício formal." : ""}`;

    const r = await callAI({ userId, tipo: "roteiro_ei", system: sys, user, json: true, maxTokens: 3500 });
    if (!r.ok) return aiErrorResponse(r);

    let roteiro: Record<string, unknown> = {};
    try { roteiro = JSON.parse(r.text || "{}"); } catch { roteiro = {}; }

    return new Response(JSON.stringify({ roteiro, model: r.model }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});