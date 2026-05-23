import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { userIdFromAuthHeader } from "../_shared/ai-budget.ts";
import { corsHeaders as cors } from "../_shared/sofia-router.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_KEY   = Deno.env.get("GOOGLE_API_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const userId = await userIdFromAuthHeader(req.headers.get("Authorization"));
    if (!userId) return new Response(JSON.stringify({ error: "Não autenticado." }), { status: 401, headers: cors });

    const body = await req.json().catch(() => ({}));
    const { curriculo_id, arquivo_path, municipio } = body as { curriculo_id: string; arquivo_path: string; municipio: string };

    if (!curriculo_id || !arquivo_path) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Verificar ownership — garante que o curriculo_id pertence ao userId autenticado
    const { data: ownerCheck } = await admin
      .from("user_curriculo_municipal")
      .select("id")
      .eq("id", curriculo_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!ownerCheck) {
      return new Response(JSON.stringify({ error: "Currículo não encontrado." }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // 1. Baixar o PDF do Storage
    const { data: fileData, error: fileErr } = await admin.storage
      .from("curriculos-municipais")
      .download(arquivo_path);

    if (fileErr || !fileData) {
      await admin.from("user_curriculo_municipal").update({ status: "erro", erro_msg: "Não foi possível ler o arquivo." }).eq("id", curriculo_id);
      return new Response(JSON.stringify({ error: "Arquivo não encontrado." }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // 2. Converter PDF → base64 para o Gemini (seguro para arquivos grandes)
    const buffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const CHUNK = 8192;
    let binary = "";
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    const base64 = btoa(binary);

    // 3. Chamar Gemini Flash-Lite com o PDF
    const prompt = `Você é um assistente especializado em currículos educacionais brasileiros.

Analise este documento de currículo municipal e extraia APENAS as habilidades/objetivos de aprendizagem.
Ignore: apresentação, introdução, legislação, fundamentação teórica, glossários, referências bibliográficas.
Foque APENAS em: tabelas de habilidades, códigos de habilidades, descritores, objetivos de aprendizagem.

Retorne um JSON válido com este formato exato:
{
  "municipio": "${municipio}",
  "total_habilidades": número,
  "habilidades": [
    {
      "codigo": "código da habilidade (ex: ALP01EF01 ou similar)",
      "descricao": "descrição completa da habilidade",
      "ano": "ano escolar (ex: 1º ano, 2º ano, EI, EM)",
      "disciplina": "nome da disciplina ou campo de experiência",
      "eixo": "eixo temático ou unidade (opcional)"
    }
  ]
}

REGRAS:
- Se não houver código explícito, crie um baseado no padrão: [SIGLA_DISC][ANO][SEQUENCIAL]
- Mantenha as descrições fiéis ao documento, sem inventar
- Inclua habilidades de todos os anos e disciplinas encontrados
- Retorne APENAS o JSON, sem texto adicional`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key=${GOOGLE_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { inline_data: { mime_type: "application/pdf", data: base64 } },
              { text: prompt },
            ],
          }],
          generationConfig: { maxOutputTokens: 32000, responseMimeType: "application/json" },
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      await admin.from("user_curriculo_municipal").update({ status: "erro", erro_msg: `IA indisponível: ${err.slice(0, 200)}` }).eq("id", curriculo_id);
      return new Response(JSON.stringify({ error: "Erro ao processar com IA." }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let parsed: { municipio?: string; total_habilidades?: number; habilidades?: unknown[] } = {};
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch {
      await admin.from("user_curriculo_municipal").update({ status: "erro", erro_msg: "Não foi possível estruturar as habilidades do documento." }).eq("id", curriculo_id);
      return new Response(JSON.stringify({ error: "Documento não reconhecido como currículo." }), { status: 422, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const habilidades = Array.isArray(parsed.habilidades) ? parsed.habilidades : [];
    if (habilidades.length === 0) {
      await admin.from("user_curriculo_municipal").update({ status: "erro", erro_msg: "Nenhuma habilidade encontrada no documento. Verifique se o PDF contém as tabelas de habilidades do currículo." }).eq("id", curriculo_id);
      return new Response(JSON.stringify({ error: "Nenhuma habilidade encontrada." }), { status: 422, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // 4. Salvar habilidades e marcar como ativo
    await admin.from("user_curriculo_municipal")
      .update({ status: "ativo", habilidades, ativo: true, usar_municipal: true, updated_at: new Date().toISOString() })
      .eq("id", curriculo_id);

    // Registrar uso no budget de IA do usuário
    try {
      const { recordUsage } = await import("../_shared/ai-budget.ts");
      await recordUsage({ userId, provider: "google", model: "gemini-2.5-flash-lite", task: "processar-curriculo", inputTokens: 60000, outputTokens: habilidades.length * 50 });
    } catch { /* não bloqueia se falhar */ }

    return new Response(
      JSON.stringify({ ok: true, total: habilidades.length }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error)?.message || "Erro interno." }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
