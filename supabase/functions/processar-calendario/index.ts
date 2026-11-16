import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { userIdFromAuthHeader } from "../_shared/ai-budget.ts";
import { corsHeaders as cors } from "../_shared/sofia-router.ts";

const GOOGLE_KEY = Deno.env.get("GOOGLE_API_KEY")!;

// Erros sempre em HTTP 200 com { ok:false, error } em português simples, para
// o app não mostrar "Edge Function returned a non-2xx status code" (N6).
function falha(error: string, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ ok: false, error, ...extra }), {
    status: 200, headers: { ...cors, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const userId = await userIdFromAuthHeader(req.headers.get("Authorization"));
    if (!userId) {
      return falha("Sua sessão expirou. Entre de novo para importar o calendário.");
    }

    const body = await req.json().catch(() => ({}));
    const { pdf_base64 } = body as { pdf_base64: string };

    if (!pdf_base64) {
      return falha("Escolha o arquivo PDF do calendário.");
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
      return falha(
        geminiRes.status === 429
          ? "A Sofia está com muitos pedidos agora. Tente de novo em instantes."
          : "A Sofia não conseguiu ler o calendário agora. Tente de novo em instantes.",
        { upstreamStatus: geminiRes.status },
      );
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const finish = String(geminiData?.candidates?.[0]?.finishReason || "");

    let parsed: { ano?: string; total?: number; eventos?: unknown[] } = {};
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch {
      if (finish === "MAX_TOKENS") {
        return falha("O calendário tem eventos demais e a leitura veio incompleta. Tente um PDF com menos meses.", { truncated: true });
      }
      return falha("Não reconheci este documento como calendário escolar.");
    }

    const eventos = Array.isArray(parsed.eventos) ? parsed.eventos : [];
    if (eventos.length === 0) {
      return falha("Nenhum evento encontrado. Verifique se o PDF é um calendário escolar.");
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
    console.error("[processar-calendario] erro interno", e);
    return falha("A Sofia não conseguiu ler o calendário agora. Tente de novo em instantes.", {
      detail: String((e as Error)?.message || e).slice(0, 500),
    });
  }
});
