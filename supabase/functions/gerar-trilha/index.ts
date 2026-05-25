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
      ano = "",
      disciplina = "",
      semestre = "1º semestre",
      contexto = "",
      curriculo_municipal = null as { municipio: string; habilidades: Array<{ codigo: string; descricao: string; ano: string; disciplina: string }> } | null,
    } = body || {};

    const anoStr = String(ano || "").toLowerCase();
    const isEdInfantil = /infantil|berç|maternal|pré[\s-]?(i|ii|escola)|creche|g[1-5]\b/.test(anoStr);
    const usandoMunicipal = curriculo_municipal && Array.isArray(curriculo_municipal.habilidades) && curriculo_municipal.habilidades.length > 0;

    const habMunicipaisTexto = usandoMunicipal
      ? curriculo_municipal!.habilidades
          .filter((h) => !ano || h.ano?.includes(String(ano).replace(/[^\d]/g, "")))
          .slice(0, 40)
          .map((h) => `- [${h.codigo}] ${h.descricao} (${h.ano} · ${h.disciplina})`)
          .join("\n")
      : null;

    const sysBase = usandoMunicipal
      ? `Você é a Sofia, assistente pedagógica do AgilizaProf. Crie trilhas semestrais alinhadas ao CURRÍCULO MUNICIPAL de ${curriculo_municipal!.municipio}. USE os códigos e habilidades do currículo municipal fornecido — NÃO cite BNCC nem invente códigos. Linguagem profissional, acolhedora, não-capacitista. Devolva JSON estrito.`
      : `Você é a Sofia, assistante pedagógica do AgilizaProf. Crie trilhas semestrais alinhadas à BNCC oficial brasileira. Nunca invente habilidades — use códigos BNCC válidos para o ano/disciplina informados. Linguagem profissional, acolhedora, não-capacitista. Devolva JSON estrito.`;
    const sysEI = `Você é a Sofia, assistente pedagógica do AgilizaProf. Crie trilhas semestrais para EDUCAÇÃO INFANTIL alinhadas à BNCC oficial brasileira.

REGRAS OBRIGATÓRIAS PARA EDUCAÇÃO INFANTIL:
- Use EXCLUSIVAMENTE os Campos de Experiência da BNCC. NÃO use disciplinas do Ensino Fundamental (não cite "Matemática", "Português", "Ciências", "História", "Geografia", "Arte", "Ed. Física" como componentes).
- Os 5 Campos de Experiência são:
  1) O eu, o outro e o nós
  2) Corpo, gestos e movimentos
  3) Traços, sons, cores e formas
  4) Escuta, fala, pensamento e imaginação
  5) Espaços, tempos, quantidades, relações e transformações
- Use SOMENTE códigos de Objetivos de Aprendizagem e Desenvolvimento no formato EI0XYZ00A (ex.: EI03EO01, EI02CG03, EI03TS02, EI03EF05, EI03ET04). O segundo bloco (EO/CG/TS/EF/ET) identifica o Campo de Experiência. NUNCA use códigos do Ensino Fundamental (EF…), exceto quando começam com "EI".
- Trabalhe interações, brincadeiras, eixos estruturantes (interagir e brincar) e práticas adequadas à faixa etária.
- Linguagem profissional, acolhedora, não-capacitista. Devolva JSON estrito.`;

    const sys = isEdInfantil ? sysEI : sysBase;

    const userBase = `Crie uma trilha de aprendizagem semestral.

Turma: ${turma || "—"} | Ano escolar: ${ano || "—"} | Disciplina: ${disciplina || "—"}
Semestre: ${semestre} | Duração: ~20 semanas
Contexto adicional: ${contexto || "(nenhum)"}
${usandoMunicipal ? `\nCURRÍCULO MUNICIPAL DE ${curriculo_municipal!.municipio} — use ESTES códigos (não BNCC):\n${habMunicipaisTexto}\n` : ""}
Gere:
1) TEMA CENTRAL (título criativo + justificativa pedagógica curta).
2) DISTRIBUIÇÃO MENSAL (4 meses): subtema, 3 a 4 habilidades ${usandoMunicipal ? `do currículo municipal de ${curriculo_municipal!.municipio}` : "BNCC"} (código + descrição), foco, conexão anterior/próxima.
3) DISTRIBUIÇÃO SEMANAL (20 semanas): título, habilidades_foco (códigos ${usandoMunicipal ? "municipais" : "BNCC"}), tipo_atividade, conecta_anterior, prepara_proxima.

Responda APENAS em JSON válido neste formato:
{
  "tema_central": {"titulo": "", "justificativa": ""},
  "meses": [{"mes": 1, "subtema": "", "habilidades_bncc": [{"codigo": "", "descricao": ""}], "foco": "", "conexao_anterior": "", "conexao_proxima": ""}],
  "semanas": [{"semana": 1, "titulo": "", "habilidades_foco": [""], "tipo_atividade": "", "conecta_anterior": "", "prepara_proxima": ""}]
}`;

    const userEI = `Crie uma trilha de aprendizagem semestral para EDUCAÇÃO INFANTIL.

Turma: ${turma || "—"} | Ano escolar: ${ano || "—"} | Campo(s) de Experiência foco: ${disciplina || "todos os 5 campos, de forma integrada"}
Semestre: ${semestre} | Duração: ~20 semanas
Contexto adicional: ${contexto || "(nenhum)"}

IMPORTANTE: Esta é uma turma de Educação Infantil. Use EXCLUSIVAMENTE os Campos de Experiência da BNCC e códigos EI0X__## (Objetivos de Aprendizagem e Desenvolvimento). Em "campo_experiencia" use um dos 5 campos oficiais. Em "habilidades_bncc"/"habilidades_foco" use APENAS códigos no formato EI0XYZ00A. NÃO use componentes/disciplinas do Ensino Fundamental.

Gere:
1) TEMA CENTRAL (título criativo + justificativa pedagógica curta, com foco em interações e brincadeiras).
2) DISTRIBUIÇÃO MENSAL (4 meses): subtema, campo_experiencia principal, 3 a 4 objetivos BNCC EI (código EI… + descrição), foco (interações/brincadeiras), conexão anterior/próxima.
3) DISTRIBUIÇÃO SEMANAL (20 semanas): título, campo_experiencia, habilidades_foco (códigos EI…), tipo_atividade (brincadeira/exploração/roda/etc.), conecta_anterior, prepara_proxima.

Responda APENAS em JSON válido neste formato:
{
  "tema_central": {"titulo": "", "justificativa": ""},
  "meses": [{"mes": 1, "subtema": "", "campo_experiencia": "", "habilidades_bncc": [{"codigo": "EI03XX00", "descricao": ""}], "foco": "", "conexao_anterior": "", "conexao_proxima": ""}],
  "semanas": [{"semana": 1, "titulo": "", "campo_experiencia": "", "habilidades_foco": ["EI03XX00"], "tipo_atividade": "", "conecta_anterior": "", "prepara_proxima": ""}]
}`;

    const user = isEdInfantil ? userEI : userBase;

    const r = await callAI({ userId, tipo: "trilha_geracao", system: sys, user, json: true, maxTokens: 6000 });
    if (!r.ok) return aiErrorResponse(r);
    let trilha: Record<string, unknown> = {};
    try { trilha = JSON.parse(r.text || "{}"); } catch { trilha = { erro: "JSON inválido", raw: r.text }; }
    return new Response(JSON.stringify({ trilha, model: r.model }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
