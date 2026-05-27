import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI, aiErrorResponse, corsHeaders as cors, parseAiJson } from "../_shared/sofia-router.ts";
import { userIdFromAuthHeader } from "../_shared/ai-budget.ts";
import { matchAnoCurriculo } from "../_shared/matchAno.ts";
import { sanitizarTextoSofia } from "../_shared/sanitize-texto.ts";

type Entry = {
  emoji?: string;
  title?: string;
  text?: string;
  tags?: string[];
  date?: string;
  turma?: string;
  atividadeTitulo?: string;
};

type RelAnterior = {
  resumo: string;
  destaques: string[];
  data: string;
};

type AlunoPcd = {
  nome: string;
  condicao?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const userId = await userIdFromAuthHeader(req.headers.get("Authorization"));
    const body = await req.json().catch(() => ({}));
    const {
      periodo = "bimestral",
      turma = "",
      ano_escolar = "",
      ano_referencia_pedagogico = "",
      curriculo_municipal = null as { municipio: string; habilidades: Array<{ codigo: string; descricao: string; ano: string; disciplina: string }> } | null,
      entries = [] as Entry[],
      stats = {} as Record<string, unknown>,
      relatorio_anterior = [] as RelAnterior[],
      alunos_pcd = [] as AlunoPcd[],
    } = body || {};

    // ── Registros do período atual ─────────────────────────────────────────
    const linhas = (entries as Entry[])
      .slice(0, 60)
      .map((e) => `- [${e.date || "—"}] ${e.emoji || ""} ${e.title || ""}${e.atividadeTitulo ? ` · ${e.atividadeTitulo}` : ""}${e.tags?.length ? ` · tags: ${e.tags.join(", ")}` : ""}${e.text ? ` — ${e.text}` : ""}`)
      .join("\n");

    // ── Contexto de progressividade (Princípio 13) ────────────────────────
    const temHistorico = Array.isArray(relatorio_anterior) && relatorio_anterior.length > 0;
    const historicoCtx = temHistorico
      ? `\n\nHISTÓRICO DE RELATÓRIOS ANTERIORES (use para construir narrativa de evolução):\n${
          (relatorio_anterior as RelAnterior[]).map((r, i) =>
            `Relatório ${i + 1} (${r.data}):\n  Resumo: ${r.resumo}\n  Destaques: ${(r.destaques || []).join("; ")}`
          ).join("\n")
        }\n\nINSTRUÇÃO DE PROGRESSIVIDADE (Princípio 13 — OBRIGATÓRIO quando há histórico):\n- Compare o período ATUAL com os anteriores de forma POSITIVA e CONSTRUTIVA.\n- Destaque avanços: use frases como "Desde o período anterior...", "Comparando com o último bimestre...", "Notamos evolução em...".\n- NUNCA use o histórico para reforçar dificuldades — apenas para evidenciar crescimento.\n- Se algo melhorou, diga. Se ainda está em desenvolvimento, use linguagem de esperança ("continua avançando em...").\n- No campo "evolucao_periodo" do JSON, escreva 1-2 frases sobre o que mudou desde o último relatório.`
      : "\n\nPRIMEIRO RELATÓRIO: Não há histórico anterior. Gere normalmente com base no período atual. No campo \"evolucao_periodo\", escreva: \"Este é o primeiro registro do período — o acompanhamento contínuo enriquecerá os próximos relatórios.\"";

    // ── Contexto de alunos PCD ────────────────────────────────────────────
    const pcdCtx = (alunos_pcd as AlunoPcd[]).length > 0
      ? `\n\nALUNOS COM NECESSIDADES ESPECÍFICAS NA TURMA:\n${(alunos_pcd as AlunoPcd[]).map((a) => `- ${a.nome}${a.condicao ? ` (${a.condicao})` : ""}`).join("\n")}\n- Mencione de forma respeitosa e não-capacitista as conquistas desses alunos no relatório, quando os registros permitirem. Use linguagem que valorize o percurso individual.`
      : "";

   const usandoMunicipal = curriculo_municipal && Array.isArray(curriculo_municipal.habilidades) && curriculo_municipal.habilidades.length > 0;
    const referencialLabel = usandoMunicipal ? `Currículo Municipal de ${curriculo_municipal!.municipio}` : "BNCC";

    const sys = `Você é a Sofia, assistente pedagógica. Gere um relatório ${periodo} narrativo, baseado APENAS nos registros do diário de bordo fornecidos. Devolva JSON estrito.
${usandoMunicipal ? `\nREFERENCIAL CURRICULAR: use o Currículo Municipal de ${curriculo_municipal!.municipio} como base — NÃO cite códigos BNCC. Cite os códigos do currículo municipal quando relevante.` : ""}

PÚBLICO-ALVO (inviolável): este relatório será LIDO PELAS FAMÍLIAS dos(as) alunos(as). Escreva para mães, pais e responsáveis — pessoas leigas em pedagogia.

LINGUAGEM (regras invioláveis):
- Clara, objetiva, acolhedora e respeitosa. Frases curtas e diretas.
- NÃO use jargão pedagógico sem explicar. NÃO use siglas sem explicar.
- Evite adjetivos vagos sem fato concreto. Cite o que a criança/turma fez.
- Tom positivo e construtivo, sem rótulos.
- Use português brasileiro corrente, voz ativa.

REGRA DE REDAÇÃO (inviolável): NUNCA mencione, cite ou faça referência a que a informação veio de "registros", "diário", "anotações", "notas", "anamnese", "PEI", "planejamento" ou qualquer outra fonte. Escreva sempre como conhecimento direto e consolidado sobre a turma. Evite QUALQUER variação de: "segundo as observações", "de acordo com os registros", "de acordo com o PEI", "de acordo com a anamnese", "de acordo com o planejamento", "conforme observado", "conforme o PEI", "com base nos registros", "com base na anamnese", "com base no planejamento", "os registros mostram", "o diário aponta", "o PEI prevê", "conforme planejado", "as anotações indicam" — descreva os fatos diretamente, como conhecimento consolidado.

PONTUAÇÃO E ESCRITA (inviolável):
- Use APENAS: letras, números, acentuação gráfica (á é í ó ú â ê ô ã õ ç à) e parênteses ( ).
- PROIBIDO usar: travessão (—), hífen como separador ( - ), aspas angulares (« »), barras (/ \\), sinais de maior/menor (< >), asteriscos (*), colchetes [ ], chaves { }, arroba (@), sustenido (#), pipes (|), underscores (_) ou qualquer outro símbolo tipográfico.
- Para separar ideias dentro de uma frase, use vírgula ou ponto final. Nunca use travessão ou hífen com essa função.
- Não use bullet points, listas com hífen, numeração ou markdown dentro dos textos — escreva em parágrafos corridos.
- Português brasileiro correto: sem palavras inventadas, sem anglicismos desnecessários, sem linguagem jurídica ou técnica sem explicação, sem neologismos.
- Frases completas, com sujeito, verbo e complemento. Sem fragmentos.`;

    const habMunicipaisCtx = usandoMunicipal && Array.isArray(curriculo_municipal!.habilidades) && curriculo_municipal!.habilidades.length > 0
      ? (() => {
          const alvoAno = (ano_referencia_pedagogico || ano_escolar || "").trim();
          const filtradas = curriculo_municipal!.habilidades.filter((h) => matchAnoCurriculo(alvoAno, h.ano));
          const base = filtradas.length > 0 ? filtradas : curriculo_municipal!.habilidades;
          return `\nHABILIDADES DO CURRÍCULO MUNICIPAL DE ${curriculo_municipal!.municipio}${alvoAno ? ` (filtradas para "${alvoAno}")` : ""} — use os códigos abaixo ao citar competências trabalhadas:\n` +
            base
              .slice(0, 40)
              .map((h) => `- [${h.codigo}] ${h.descricao} (${h.ano} · ${h.disciplina})`)
              .join("\n");
        })()
      : "";

    const user = `Turma: ${turma || "Todas"}
Período: ${periodo}
Estatísticas: ${JSON.stringify(stats)}
${habMunicipaisCtx}
Registros (${(entries as Entry[]).length}):
${linhas || "(nenhum registro)"}
${historicoCtx}
${pcdCtx}

Responda APENAS com JSON válido neste formato:
{
  "titulo": "string curta",
  "resumo": "2-3 frases sobre o período",
  "evolucao_periodo": "comparação com período anterior (ou mensagem de primeiro registro)",
  "destaques": ["3 a 5 pontos positivos com evidências concretas"],
  "alertas": ["2 a 4 pontos de atenção, sempre com sugestão construtiva"],
  "padroes": ["2 a 4 padrões identificados"],
  "recomendacoes": ["3 a 5 ações concretas para a próxima quinzena"],
  "comunicacao_familias": "1 parágrafo curto pronto para enviar às famílias, com menção à evolução quando houver histórico"
}`;

    const r = await callAI({ userId, tipo: "relatorio_bimestral", system: sys, user, json: true, maxTokens: 4000 });
    if (!r.ok) return aiErrorResponse(r);
    let parsed = parseAiJson<Record<string, unknown>>(r.text || "{}");
    if ((parsed as { _truncated?: boolean })._truncated) {
      console.warn("[gerar-relatorio] JSON truncado/inválido — devolvendo fallback");
      parsed = { resumo: String((parsed as { _raw?: string })._raw || "").slice(0, 1500) };
    }
    parsed = sanitizarTextoSofia(parsed) as Record<string, unknown>;
    return new Response(JSON.stringify({ relatorio: parsed, model: r.model }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[gerar-relatorio] erro interno", e);
    return new Response(JSON.stringify({ ok: false, error: "Falha ao gerar relatório.", detail: String((e as Error)?.message || e).slice(0, 500) }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
