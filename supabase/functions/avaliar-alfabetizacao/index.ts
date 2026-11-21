// Leitura e escrita (Criança alfabetizada).
//
// modo "leitura": recebe o áudio (até ~70 s) da criança lendo um cartão e
//   devolve a transcrição literal. Quem compara com o cartão e sugere o nível
//   é o app, com conta simples. O ÁUDIO NÃO É GUARDADO: vai direto para a IA
//   e some quando esta função termina.
// modo "texto": recebe a foto do texto da criança e devolve a transcrição,
//   o nível de escrita, a nota por critério e os erros por categoria.
//   A FOTO TAMBÉM NÃO É GUARDADA.
//
// Créditos: confere o saldo antes e desconta só depois de um resultado válido.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isBudgetExceeded, recordUsage, userIdFromAuthHeader } from "../_shared/ai-budget.ts";
import { corsHeaders as cors, parseAiJson, jsonTruncado } from "../_shared/sofia-router.ts";
import { CATEGORIAS_ERRO } from "./categorias.ts";

const CUSTO = { leitura: 5, texto: 10 } as const;

const MODELO_LEITURA = Deno.env.get("ALFA_MODELO_LEITURA") || "gemini-2.5-flash";
const MODELO_TEXTO = Deno.env.get("ALFA_MODELO_TEXTO") || "gemini-2.5-pro";
const MODELO_RESERVA = "gemini-2.5-flash";

const MAX_BASE64 = 7_000_000; // ~5 MB de arquivo

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const falha = (error: string, extra: Record<string, unknown> = {}) =>
  json({ ok: false, error, ...extra });

type RespostaIA = {
  ok: boolean;
  status: number;
  text: string;
  truncated: boolean;
  inTok: number;
  outTok: number;
  model: string;
  detalhe?: string;
};

/** Chama o Gemini com um arquivo (áudio ou imagem) e pede JSON. */
async function chamarIA(args: {
  model: string;
  system: string;
  user: string;
  mime: string;
  base64: string;
  maxTokens: number;
}): Promise<RespostaIA> {
  const GOOGLE_KEY = Deno.env.get("GOOGLE_API_KEY");
  const ehPro = /pro/i.test(args.model);
  if (GOOGLE_KEY) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${args.model}:generateContent?key=${GOOGLE_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: args.system }] },
          contents: [
            {
              role: "user",
              parts: [
                { inline_data: { mime_type: args.mime, data: args.base64 } },
                { text: args.user },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: args.maxTokens,
            responseMimeType: "application/json",
            // O modelo Pro não deixa desligar o raciocínio: fica no mínimo.
            thinkingConfig: { thinkingBudget: ehPro ? 128 : 0 },
          },
        }),
      },
    );
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      return {
        ok: false,
        status: r.status,
        text: "",
        truncated: false,
        inTok: 0,
        outTok: 0,
        model: args.model,
        detalhe: t.slice(0, 600),
      };
    }
    const d = await r.json();
    const cand = d?.candidates?.[0];
    const text = (cand?.content?.parts || [])
      .map((p: { text?: string }) => p?.text || "")
      .join("");
    const finish = String(cand?.finishReason || "");
    return {
      ok: true,
      status: 200,
      text,
      truncated: finish === "MAX_TOKENS",
      inTok: Number(d?.usageMetadata?.promptTokenCount ?? 0),
      outTok:
        Number(d?.usageMetadata?.candidatesTokenCount ?? 0) +
        Number(d?.usageMetadata?.thoughtsTokenCount ?? 0),
      model: args.model,
    };
  }

  // Sem a chave do Google: usa o gateway (formato OpenAI).
  const KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!KEY) {
    return {
      ok: false,
      status: 500,
      text: "",
      truncated: false,
      inTok: 0,
      outTok: 0,
      model: args.model,
      detalhe: "sem chave de IA",
    };
  }
  const ehAudio = args.mime.startsWith("audio/");
  const arquivo = ehAudio
    ? { type: "input_audio", input_audio: { data: args.base64, format: "wav" } }
    : { type: "image_url", image_url: { url: `data:${args.mime};base64,${args.base64}` } };
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: `google/${args.model}`,
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: [{ type: "text", text: args.user }, arquivo] },
      ],
      max_tokens: args.maxTokens,
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    return {
      ok: false,
      status: r.status,
      text: "",
      truncated: false,
      inTok: 0,
      outTok: 0,
      model: args.model,
      detalhe: t.slice(0, 600),
    };
  }
  const d = await r.json();
  const choice = d?.choices?.[0];
  const finish = String(choice?.finish_reason || "");
  return {
    ok: true,
    status: 200,
    text: String(choice?.message?.content || ""),
    truncated: finish === "length" || finish === "MAX_TOKENS",
    inTok: Number(d?.usage?.prompt_tokens ?? 0),
    outTok: Number(d?.usage?.completion_tokens ?? 0),
    model: args.model,
  };
}

function mensagemDeErro(r: RespostaIA, oQue: string): string {
  if (r.status === 429) return "A Sofia está com muitos pedidos agora. Tente de novo em instantes.";
  if (r.status === 402) return "A Sofia está temporariamente indisponível. Já fomos avisados.";
  if (r.status >= 500) return "A Sofia está instável agora. Tente de novo em alguns segundos.";
  return `A Sofia não conseguiu ${oQue} agora. Tente de novo em instantes.`;
}

const limpaBase64 = (v: unknown) =>
  String(v || "")
    .replace(/^data:[^,]*,/, "")
    .replace(/\s+/g, "");

const SYS_LEITURA = `Você transcreve a leitura em voz alta de uma criança brasileira em fase de alfabetização. A professora vai comparar a sua transcrição com o cartão que a criança leu para saber quais palavras ela acertou. Por isso, a transcrição precisa ser LITERAL.

Regras:
- Escreva exatamente o que a criança DISSE, na ordem em que disse, em português, com letras minúsculas e sem pontuação.
- NÃO corrija. Se a criança leu "cavalo" como "cabalo", escreva "cabalo". Se leu "prato" como "pato", escreva "pato".
- Se a criança leu a palavra aos pedaços, sem juntar ("ca... sa"), escreva os pedaços separados por espaço: "ca sa". Se depois juntou e falou a palavra inteira, escreva também a palavra inteira: "ca sa casa".
- Se a criança repetiu ou se corrigiu, escreva tudo o que ela falou.
- Se o cartão é de sílabas soltas, escreva cada sílaba que ela falou separada por espaço.
- Ignore a voz de adultos (a professora dando instruções ou ajudando) e conversas ao fundo.
- Trechos que não der para entender: escreva [inaudível].
- O texto do cartão vem abaixo SÓ para você conhecer o vocabulário esperado e escrever as palavras com a grafia certa quando a criança as leu certo. Nunca copie do cartão o que a criança não falou.
- Se não houver nenhuma leitura no áudio (silêncio ou só ruído), devolva a transcrição vazia.

Responda APENAS com JSON válido:
{"transcricao": "o que a criança disse", "observacao": "uma frase curta sobre a leitura (ex.: leu sílaba por sílaba, corrigiu-se sozinha, muito ruído na sala). Deixe vazio se não houver nada a notar."}`;

function sysTexto(): string {
  const cats = CATEGORIAS_ERRO.map(([id, d]) => `- "${id}": ${d}`).join("\n");
  return `Você é a Sofia, assistente pedagógica do AgilizaProf, especialista em alfabetização. A professora fotografou a produção de texto de uma criança dos anos iniciais do Ensino Fundamental. Sua tarefa é ler a letra da criança, classificar o nível de escrita e apontar os erros para a professora planejar o reforço. A professora revisa tudo antes de salvar.

1) TRANSCRIÇÃO
- Transcreva o texto EXATAMENTE como a criança escreveu, mantendo os erros de ortografia, a falta de pontuação, as palavras grudadas e as letras maiúsculas ou minúsculas. Não corrija nada.
- Mantenha as quebras de linha do original com \\n.
- Não transcreva o cabeçalho (nome da criança, escola, data): comece no texto.
- Palavra que não der para ler: escreva [ilegível].
- Se a foto não mostra um texto escrito à mão ou está ilegível, devolva "legivel": false e explique em "comentario" o que a professora deve fazer (ex.: tirar a foto mais de perto, com mais luz).

2) NÍVEL DE ESCRITA (campo "nivel_escrita", número de 1 a 5)
1 = Pré-silábico: letras, rabiscos ou números sem relação com os sons.
2 = Silábico: em geral uma letra para cada sílaba.
3 = Silábico-alfabético: mistura sílabas completas com sílabas de uma letra só.
4 = Alfabético: representa todos os sons, escreve como fala, com muitos erros de ortografia.
5 = Alfabético com ortografia em consolidação: poucos erros, já usa várias regras.

3) CRITÉRIOS (campo "criterios", nota de 1 a 4 em cada um; 1 = precisa de muita ajuda, 2 = em desenvolvimento, 3 = adequado para o ano, 4 = muito bom para o ano). Considere o ano escolar informado.
- "ortografia": escrita correta das palavras.
- "segmentacao": separação entre as palavras.
- "pontuacao": pontuação e letra maiúscula.
- "ideias": sequência e clareza das ideias.
- "genero": o texto atende à proposta e ao tipo de texto pedido. Se a proposta não foi informada, avalie se o texto tem começo, meio e fim.

4) ERROS (campo "erros", no máximo 25)
Para cada palavra ou trecho com erro: "escrita" (como a criança escreveu), "correta" (a forma certa) e "cat" (UMA das categorias abaixo, pelo id). Liste cada palavra errada uma vez só. Não liste como erro o que está certo. Para pontuação e maiúscula, liste no máximo 2 exemplos de cada.
${cats}

5) DEVOLUTIVA
- "pontos_fortes": uma frase com o que a criança já faz bem.
- "comentario": duas ou três frases para a professora, dizendo o que a criança já domina e qual é o próximo passo. Linguagem respeitosa, sem rótulos e sem comparar com outras crianças. Use "está desenvolvendo", "ainda precisa de apoio em", nunca "não sabe" ou "fraco".
- "justificativa_nivel": uma frase curta explicando o nível escolhido.

Nunca invente trechos que não estão na foto. Responda APENAS com JSON válido:
{"legivel": true, "transcricao": "...", "nivel_escrita": 4, "justificativa_nivel": "...", "criterios": {"ortografia": 2, "segmentacao": 3, "pontuacao": 2, "ideias": 3, "genero": 3}, "erros": [{"escrita": "canpo", "correta": "campo", "cat": "m_pb"}], "pontos_fortes": "...", "comentario": "..."}`;
}

const nota = (v: unknown, min: number, max: number, padrao: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const userId = await userIdFromAuthHeader(req.headers.get("Authorization"));
    if (!userId) return falha("Sua sessão expirou. Entre novamente.", { upstreamStatus: 401 });

    const body = await req.json().catch(() => ({}));
    const modo = body?.modo === "texto" ? "texto" : body?.modo === "leitura" ? "leitura" : "";
    if (!modo) return falha("Pedido inválido.");
    const custo = CUSTO[modo];

    const b = await isBudgetExceeded(userId);
    if (b.erro) {
      return falha("Não consegui conferir seus créditos agora. Tente de novo em instantes.", {
        creditCheckFailed: true,
      });
    }
    if (b.creditos < custo) {
      return falha(
        `Créditos insuficientes para esta ação (precisa de ${custo}, você tem ${b.creditos}).`,
        { blocked: true },
      );
    }

    const ano = String(body?.ano || "").slice(0, 20);
    let resultado: Record<string, unknown>;
    let usada: RespostaIA;

    if (modo === "leitura") {
      const audio = limpaBase64(body?.audio_base64);
      if (!audio) return falha("Não recebi a gravação. Grave de novo.");
      if (audio.length > MAX_BASE64)
        return falha("A gravação ficou grande demais. Grave até 1 minuto.");
      const mime = /^audio\/[a-z0-9.+-]+$/i.test(String(body?.mime || ""))
        ? String(body.mime)
        : "audio/wav";
      const cartao = String(body?.cartao_texto || "").slice(0, 1500);
      const tipo = String(body?.cartao_tipo || "").slice(0, 20);
      // Sem cartão: a criança leu um livro ou outro texto que não temos.
      const user = cartao.trim()
        ? `Tipo de cartão: ${tipo || "não informado"}.${ano ? ` Ano escolar: ${ano}.` : ""}
Texto do cartão (só referência de vocabulário):
"""
${cartao}
"""
Transcreva o áudio.`
        : `A criança leu em voz alta um livro ou outro texto que não temos aqui.${ano ? ` Ano escolar: ${ano}.` : ""}
Não há texto de referência. Transcreva o áudio exatamente como a criança leu, sem corrigir nem completar.`;
      usada = await chamarIA({
        model: MODELO_LEITURA,
        system: SYS_LEITURA,
        user,
        mime,
        base64: audio,
        maxTokens: 2000,
      });
      if (!usada.ok) {
        console.error("[avaliar-alfabetizacao] leitura", usada.status, usada.detalhe);
        return falha(mensagemDeErro(usada, "ouvir a leitura"), { upstreamStatus: usada.status });
      }
      const p = parseAiJson<{ transcricao?: unknown; observacao?: unknown }>(usada.text || "{}");
      if (usada.truncated || jsonTruncado(p)) {
        return falha("A resposta veio incompleta. Tente de novo.", { truncated: true });
      }
      resultado = {
        transcricao: String(p?.transcricao ?? "").slice(0, 4000),
        observacao: String(p?.observacao ?? "").slice(0, 300),
      };
    } else {
      const img = limpaBase64(body?.imagem_base64);
      if (!img) return falha("Não recebi a foto. Tire a foto de novo.");
      if (img.length > MAX_BASE64) return falha("A foto ficou grande demais. Tire outra foto.");
      const mime = /^image\/(jpeg|png|webp)$/i.test(String(body?.mime || ""))
        ? String(body.mime)
        : "image/jpeg";
      const proposta = String(body?.proposta || "").slice(0, 600);
      const user = `${ano ? `Ano escolar da criança: ${ano}.` : "Ano escolar não informado: considere os anos iniciais."}
${proposta ? `Proposta de produção dada pela professora: ${proposta}` : "A professora não informou a proposta de produção."}
Leia a foto e responda no formato pedido.`;
      const args = { system: sysTexto(), user, mime, base64: img, maxTokens: 6000 };
      usada = await chamarIA({ model: MODELO_TEXTO, ...args });
      // Modelo mais forte indisponível (nome trocado, sem acesso): usa o padrão.
      if (!usada.ok && [400, 403, 404].includes(usada.status) && MODELO_TEXTO !== MODELO_RESERVA) {
        console.warn("[avaliar-alfabetizacao] modelo de texto indisponível", usada.detalhe);
        usada = await chamarIA({ model: MODELO_RESERVA, ...args });
      }
      if (!usada.ok) {
        console.error("[avaliar-alfabetizacao] texto", usada.status, usada.detalhe);
        return falha(mensagemDeErro(usada, "ler o texto"), { upstreamStatus: usada.status });
      }
      const p = parseAiJson<Record<string, unknown>>(usada.text || "{}");
      if (usada.truncated || jsonTruncado(p)) {
        return falha("A resposta veio incompleta. Tente de novo.", { truncated: true });
      }
      const transcricao = String(p?.transcricao ?? "").slice(0, 6000);
      if (p?.legivel === false || !transcricao.trim()) {
        // Foto ilegível: não cobra.
        return falha(
          String(p?.comentario || "").slice(0, 300) ||
            "Não consegui ler o texto nesta foto. Tire outra, mais de perto e com boa luz.",
          { ilegivel: true },
        );
      }
      const ids = new Set(CATEGORIAS_ERRO.map(([id]) => id));
      const erros = (Array.isArray(p?.erros) ? p.erros : [])
        .slice(0, 25)
        .map((e: Record<string, unknown>) => ({
          escrita: String(e?.escrita ?? "").slice(0, 80),
          correta: String(e?.correta ?? "").slice(0, 80),
          cat: ids.has(String(e?.cat)) ? String(e.cat) : "outro",
        }))
        .filter((e: { escrita: string; correta: string }) => e.escrita && e.correta);
      const c = (p?.criterios || {}) as Record<string, unknown>;
      resultado = {
        transcricao,
        nivel_escrita: nota(p?.nivel_escrita, 1, 5, 4),
        justificativa_nivel: String(p?.justificativa_nivel ?? "").slice(0, 300),
        criterios: {
          ortografia: nota(c.ortografia, 1, 4, 2),
          segmentacao: nota(c.segmentacao, 1, 4, 2),
          pontuacao: nota(c.pontuacao, 1, 4, 2),
          ideias: nota(c.ideias, 1, 4, 2),
          genero: nota(c.genero, 1, 4, 2),
        },
        erros,
        pontos_fortes: String(p?.pontos_fortes ?? "").slice(0, 400),
        comentario: String(p?.comentario ?? "").slice(0, 800),
      };
    }

    await recordUsage({
      userId,
      provider: "google",
      // O áudio tem preço de entrada diferente: registra com nome próprio.
      model: modo === "leitura" ? `${usada.model}-audio` : usada.model,
      task: modo === "leitura" ? "leitura_fluencia" : "correcao_texto",
      inputTokens: usada.inTok,
      outputTokens: usada.outTok,
    });

    // Desconta os créditos só agora, com o resultado pronto.
    const descricao =
      String(body?.descricaoCobranca || "").slice(0, 120) ||
      (modo === "leitura" ? "Avaliação de leitura" : "Correção de texto por foto");
    let saldo: number | null = null;
    const { data: cob, error: cobErr } = await admin.rpc("consumir_creditos", {
      _user_id: userId,
      _quantidade: custo,
      _descricao: descricao,
    });
    if (cobErr) console.error("[avaliar-alfabetizacao] cobrança", cobErr.message);
    else saldo = Number((cob as { saldo?: number } | null)?.saldo ?? NaN);

    return json({ ok: true, ...resultado, creditos_cobrados: cobErr ? 0 : custo, saldo });
  } catch (e) {
    console.error("[avaliar-alfabetizacao] erro interno", e);
    return falha("A Sofia não conseguiu agora. Tente de novo em instantes.", {
      detail: String((e as Error)?.message || e).slice(0, 300),
    });
  }
});
