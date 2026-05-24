import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { userIdFromAuthHeader } from "../_shared/ai-budget.ts";
import { corsHeaders as cors } from "../_shared/sofia-router.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_KEY   = Deno.env.get("GOOGLE_API_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function processarComGemini(curriculo_id: string, arquivo_path: string, municipio: string, ordemValida: 1 | 2, userId: string) {
  try {
    console.log(`[processar-curriculo:bg] iniciando curriculo_id=${curriculo_id} ordem=${ordemValida}`);

    // 1. Baixar PDF
    const { data: fileData, error: fileErr } = await admin.storage
      .from("documentos-professor")
      .download(arquivo_path);
    if (fileErr || !fileData) {
      await admin.from("user_curriculo_municipal").update({ status: "erro", erro_msg: "Não foi possível ler o arquivo." }).eq("id", curriculo_id);
      return;
    }

    // 2. base64
    const buffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const CHUNK = 8192;
    let binary = "";
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    const base64 = btoa(binary);

    // 3. Escolher modelo
    const pdfSizeMB = bytes.length / (1024 * 1024);
    const initialModel = pdfSizeMB <= 2 ? "gemini-2.5-flash-lite" : "gemini-2.5-flash";
    console.log(`[processar-curriculo:bg] PDF size: ${pdfSizeMB.toFixed(2)} MB → modelo inicial: ${initialModel}`);

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

    async function callGemini(model: string) {
      console.log(`[processar-curriculo:bg] Chamando Gemini com modelo: ${model}`);
      return await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_KEY}`,
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
            generationConfig: { maxOutputTokens: 64000, responseMimeType: "application/json" },
          }),
        }
      );
    }

    let modelUsed = initialModel;
    let geminiRes = await callGemini(modelUsed);

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      await admin.from("user_curriculo_municipal").update({ status: "erro", erro_msg: `IA indisponível: ${err.slice(0, 200)}` }).eq("id", curriculo_id);
      return;
    }

    let geminiData = await geminiRes.json();
    let rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    let finishReason = geminiData?.candidates?.[0]?.finishReason;
    console.log(`[processar-curriculo:bg] finishReason (${modelUsed}): ${finishReason}`);

    let parsed: { municipio?: string; total_habilidades?: number; habilidades?: unknown[] } = {};
    let parseOk = false;
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
      parseOk = true;
    } catch { parseOk = false; }

    if (!parseOk && modelUsed !== "gemini-2.5-flash") {
      console.warn(`[processar-curriculo:bg] Parse falhou com ${modelUsed}. Retry com gemini-2.5-flash.`);
      modelUsed = "gemini-2.5-flash";
      geminiRes = await callGemini(modelUsed);
      if (geminiRes.ok) {
        geminiData = await geminiRes.json();
        rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        finishReason = geminiData?.candidates?.[0]?.finishReason;
        console.log(`[processar-curriculo:bg] finishReason (retry ${modelUsed}): ${finishReason}`);
        try {
          parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
          parseOk = true;
        } catch { parseOk = false; }
      }
    }

    if (!parseOk) {
      await admin.from("user_curriculo_municipal").update({ status: "erro", erro_msg: "Não foi possível estruturar as habilidades do documento." }).eq("id", curriculo_id);
      return;
    }

    const habilidades = Array.isArray(parsed.habilidades) ? parsed.habilidades : [];
    if (habilidades.length === 0) {
      await admin.from("user_curriculo_municipal").update({ status: "erro", erro_msg: "Nenhuma habilidade encontrada no documento. Verifique se o PDF contém as tabelas de habilidades do currículo." }).eq("id", curriculo_id);
      return;
    }

    await admin.from("user_curriculo_municipal")
      .update({ status: "ativo", habilidades, ativo: true, usar_municipal: true, updated_at: new Date().toISOString() })
      .eq("id", curriculo_id);

    try {
      const { recordUsage } = await import("../_shared/ai-budget.ts");
      await recordUsage({ userId, provider: "google", model: modelUsed, task: "processar-curriculo", inputTokens: 60000, outputTokens: habilidades.length * 50 });
    } catch { /* não bloqueia */ }

    console.log(`[processar-curriculo:bg] concluído curriculo_id=${curriculo_id} habilidades=${habilidades.length}`);
  } catch (e) {
    console.error(`[processar-curriculo:bg] erro:`, e);
    await admin.from("user_curriculo_municipal").update({ status: "erro", erro_msg: (e as Error)?.message?.slice(0, 200) || "Erro interno no processamento." }).eq("id", curriculo_id);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const userId = await userIdFromAuthHeader(req.headers.get("Authorization"));
    if (!userId) return new Response(JSON.stringify({ error: "Não autenticado." }), { status: 401, headers: cors });

    const body = await req.json().catch(() => ({}));
    const { curriculo_id, arquivo_path, municipio, ordem } = body as { curriculo_id: string; arquivo_path: string; municipio: string; ordem?: number };
    const ordemValida: 1 | 2 = ordem === 2 ? 2 : 1;
    console.log(`[processar-curriculo] curriculo_id=${curriculo_id} ordem=${ordemValida}`);

    if (!curriculo_id || !arquivo_path) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Verificar ownership
    const { data: ownerCheck } = await admin
      .from("user_curriculo_municipal")
      .select("id")
      .eq("id", curriculo_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!ownerCheck) {
      return new Response(JSON.stringify({ error: "Currículo não encontrado." }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Confirmar que o arquivo existe (HEAD via createSignedUrl barato seria overkill; tenta listar)
    const folder = arquivo_path.includes("/") ? arquivo_path.substring(0, arquivo_path.lastIndexOf("/")) : "";
    const fname = arquivo_path.includes("/") ? arquivo_path.substring(arquivo_path.lastIndexOf("/") + 1) : arquivo_path;
    const { data: listed } = await admin.storage.from("documentos-professor").list(folder, { search: fname });
    if (!listed || !listed.some((f) => f.name === fname)) {
      await admin.from("user_curriculo_municipal").update({ status: "erro", erro_msg: "Arquivo não encontrado no storage." }).eq("id", curriculo_id);
      return new Response(JSON.stringify({ error: "Arquivo não encontrado." }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Fire and forget: processa em background
    const processamento = processarComGemini(curriculo_id, arquivo_path, municipio, ordemValida, userId);
    try {
      EdgeRuntime.waitUntil(processamento);
    } catch {
      // Fallback: dispara sem aguardar
      void processamento;
    }

    return new Response(
      JSON.stringify({ ok: true, status: "processando" }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error)?.message || "Erro interno." }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
