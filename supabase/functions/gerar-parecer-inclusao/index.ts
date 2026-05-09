import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Registro = { when?: string; cat?: string; body?: string };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const {
      aluno = "",
      diagnostico = "",
      periodo = "Bimestral",
      anamneseResumo = "",
      peiResumo = "",
      registros = [] as Registro[],
    } = body || {};

    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY ausente no servidor." }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const linhas = (registros as Registro[])
      .slice(0, 80)
      .map((r) => `- [${r.when || "—"}] (${r.cat || "ped"}) ${r.body || ""}`)
      .join("\n");

    const sys = `Você é a Sofia, assistente pedagógica especializada em educação inclusiva (Lei 14.254/2021 e BNCC). Gere um parecer descritivo individual, narrativo, em tom profissional e empático, baseado APENAS nos dados reais fornecidos (anamnese, PEI e registros). Não invente fatos, datas ou objetivos não citados. Se faltar informação em algum eixo, indique brevemente. Devolva JSON estrito.`;

    const user = `Aluno(a): ${aluno || "—"}
Diagnóstico/CID: ${diagnostico || "não informado"}
Período do parecer: ${periodo}

Anamnese (resumo dos eixos):
${anamneseResumo || "(sem dados de anamnese)"}

PEI (resumo):
${peiResumo || "(sem PEI cadastrado)"}

Registros do diário (${(registros as Registro[]).length}):
${linhas || "(nenhum registro)"}

Responda APENAS com JSON válido neste formato:
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
}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso atingido. Tente novamente em instantes." }), {
          status: 429, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }), {
          status: 402, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const txt = await resp.text();
      return new Response(JSON.stringify({ error: `Gateway ${resp.status}: ${txt}` }), {
        status: 502, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content || "{}";
    let parecer: Record<string, unknown> = {};
    try { parecer = JSON.parse(raw); } catch { parecer = { resumo: raw }; }
    return new Response(JSON.stringify({ parecer }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});