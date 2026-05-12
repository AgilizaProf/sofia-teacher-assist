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
    } = body || {};

    const sys = `Você é a Sofia, assistente pedagógica do AgilizaProf. Crie trilhas semestrais alinhadas à BNCC oficial brasileira. Nunca invente habilidades — use códigos BNCC válidos para o ano/disciplina informados. Linguagem profissional, acolhedora, não-capacitista. Devolva JSON estrito.`;
    const user = `Crie uma trilha de aprendizagem semestral.

Turma: ${turma || "—"} | Ano escolar: ${ano || "—"} | Disciplina: ${disciplina || "—"}
Semestre: ${semestre} | Duração: ~20 semanas
Contexto adicional: ${contexto || "(nenhum)"}

Gere:
1) TEMA CENTRAL (título criativo + justificativa pedagógica curta).
2) DISTRIBUIÇÃO MENSAL (4 meses): subtema, 3 a 4 habilidades BNCC (código + descrição), foco, conexão anterior/próxima.
3) DISTRIBUIÇÃO SEMANAL (20 semanas): título, habilidades_foco (códigos BNCC), tipo_atividade, conecta_anterior, prepara_proxima.

Responda APENAS em JSON válido neste formato:
{
  "tema_central": {"titulo": "", "justificativa": ""},
  "meses": [{"mes": 1, "subtema": "", "habilidades_bncc": [{"codigo": "", "descricao": ""}], "foco": "", "conexao_anterior": "", "conexao_proxima": ""}],
  "semanas": [{"semana": 1, "titulo": "", "habilidades_foco": [""], "tipo_atividade": "", "conecta_anterior": "", "prepara_proxima": ""}]
}`;

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