import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { userIdFromAuthHeader } from "../_shared/ai-budget.ts";
import { corsHeaders as cors } from "../_shared/sofia-router.ts";

const GOOGLE_KEY = Deno.env.get("GOOGLE_API_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const userId = await userIdFromAuthHeader(req.headers.get("Authorization"));
    if (!userId) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { pdf_base64 } = body as { pdf_base64: string };

    if (!pdf_base64) {
      return new Response(JSON.stringify({ error: "PDF não enviado." }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const prompt = `Você é um assistente especializado em calendários escolares brasileiros.

Analise este documento e extraia TODOS os eventos do calendário escolar: reuniões pedagógicas, conselhos de classe, feriados, datas de avaliação, entregas de notas/relatórios, planejamentos e eventos escolares.

Retorne um JSON válido com este formato exato:
{
  "ano": "ano letivo identificado (ex: 2025)",
  "total": número total de eventos,
  "eventos": [
    {
      "titulo": "nome do evento (curto, máx 60 caracteres)",
      "data": "YYYY-MM-DD",
      "hora": "HH:MM ou null se não informado",
      "tipo": "meeting | eval | report | plan | personal",
      "descricao": "detalhes adicionais se houver, ou null"
    }
  ]
}

REGRAS de mapeamento de tipo:
- "meeting": reunião pedagógica, conselho de classe, HTPC, hora atividade, reunião de pais
- "eval": avaliação, prova, simulado, recuperação
- "report": entrega de notas, fechamento de bimestre/trimestre, entrega de relatórios/pareceres, boletim
- "plan": planejamento, replanejamento, formação continuada, capacitação
- "personal": feriado, recesso, evento cultural, festa junina, formatura, qualquer outro

REGRAS gerais:
- Inclua TODOS os eventos encontrados, incluindo feriados nacionais e municipais
- Se uma data tiver múltiplos eventos, crie uma entrada para cada um
- Datas no formato YYYY-MM-DD obrigatório
- Títulos concisos e em português
- Retorne APENAS o JSON, sem texto adicional`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GOOGLE_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { inline_data: { mime_type: "application/pdf", data: pdf_base64 } },
              { text: prompt },
            ],
          }],
          generationConfig: {
            maxOutputTokens: 8000,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error("[processar-calendario] Gemini error:", err);
      return new Response(JSON.stringify({ error: "IA indisponível. Tente novamente." }), {
        status: 502, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let parsed: { ano?: string; total?: number; eventos?: unknown[] } = {};
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch {
      return new Response(JSON.stringify({ error: "Documento não reconhecido como calendário escolar." }), {
        status: 422, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const eventos = Array.isArray(parsed.eventos) ? parsed.eventos : [];
    if (eventos.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum evento encontrado. Verifique se o PDF é um calendário escolar." }), {
        status: 422, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Registrar uso no budget
    try {
      const { recordUsage } = await import("../_shared/ai-budget.ts");
      await recordUsage({
        userId, provider: "google", model: "gemini-2.5-flash-lite",
        task: "processar-calendario",
        inputTokens: 40000, outputTokens: eventos.length * 40,
      });
    } catch { /* não bloqueia */ }

    return new Response(
      JSON.stringify({ ok: true, ano: parsed.ano, total: eventos.length, eventos }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error)?.message || "Erro interno." }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
