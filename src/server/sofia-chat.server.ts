// Núcleo do chat da Sofia (servidor). Usado pela rota com streaming
// (/api/sofia/chat) e pela server function de reserva (askSofia sem stream).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { buildSofiaPrompt } from "@/lib/sofia-constitution";
import { validateSofiaOutput } from "@/lib/sofia-validator";

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };
export type SofiaIssues = Array<{ term: string; suggestion: string; principle: string }> | null;

export type SofiaChatInput = {
  conversationId?: string;
  messages: ChatMsg[];
  routeContext?: string;
  originRoute?: string;
  userContext?: string;
};

type Supa = SupabaseClient<Database>;

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

/** Modelo padrão do chat. Pode ser trocado sem mexer no código (variável SOFIA_CHAT_MODEL). */
const DEFAULT_MODEL = "google/gemini-2.5-flash";

/**
 * "Chave" do modelo avançado: se SOFIA_CHAT_MODEL_DOCS estiver definida
 * (ex.: google/gemini-2.5-pro), pedidos de documento (plano, parecer, PEI,
 * atividade…) usam esse modelo; conversas curtas continuam no padrão.
 */
function pickModel(lastUserText: string): string {
  const base = process.env.SOFIA_CHAT_MODEL || DEFAULT_MODEL;
  const docs = process.env.SOFIA_CHAT_MODEL_DOCS;
  if (!docs) return base;
  return looksLikeDocumentRequest(lastUserText) ? docs : base;
}

const DOC_REQUEST =
  /\b(plano|planejamento|parecer|pareceres|relat[óo]rio|pei|pdi|atividade|atividades|avalia[çc][ãa]o|prova|simulado|sequ[êe]ncia did[áa]tica|projeto|roteiro|adapta[çc][ãa]o|adapte|adaptar|gabarito|lista de exerc[íi]cios|quest[õo]es|rubrica)\b/i;
export function looksLikeDocumentRequest(text: string): boolean {
  return DOC_REQUEST.test(text || "");
}

export function sanitizeMessages(input: unknown): ChatMsg[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(
      (m): m is { role: ChatMsg["role"]; content: string } =>
        !!m &&
        typeof m === "object" &&
        "content" in m &&
        typeof m.content === "string" &&
        "role" in m &&
        (m.role === "user" || m.role === "assistant"),
    )
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 12000) }))
    .filter((m) => m.content.trim().length > 0);
}

export function parseChatInput(d: unknown): SofiaChatInput {
  const o = (d ?? {}) as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);
  return {
    conversationId: typeof o.conversationId === "string" ? o.conversationId : undefined,
    messages: sanitizeMessages(o.messages),
    routeContext: str(o.routeContext, 8000),
    originRoute: str(o.originRoute, 200),
    userContext: str(o.userContext, 3000),
  };
}

/** Mantém o histórico enviado à IA dentro de um tamanho razoável (custo e foco). */
function trimHistory(messages: ChatMsg[]): ChatMsg[] {
  const MAX_MSGS = 24;
  const MAX_CHARS = 60000;
  const out: ChatMsg[] = [];
  let total = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (out.length >= MAX_MSGS || (total + m.content.length > MAX_CHARS && out.length > 0)) break;
    out.unshift(m);
    total += m.content.length;
  }
  // A conversa enviada precisa começar por uma mensagem do usuário.
  while (out.length > 1 && out[0].role !== "user") out.shift();
  return out;
}

function hojeBR(): string {
  const now = new Date();
  const data = now.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const hora = now.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `Hoje é ${data}, ${hora} (horário de Brasília).`;
}

function buildSystemPrompt(routeContext?: string, userContext?: string) {
  const taskPrompt = [
    "Responda à conversa do chat seguindo rigorosamente a Constituição. Use apenas o que o(a) educador(a) registrou; quando faltar informação essencial, pergunte antes de produzir o documento. Escreva sempre em português do Brasil correto.",
    "",
    "ESTILO: Seja direta e objetiva. Sem introduções como 'Claro!' e sem encerramentos como 'Espero ter ajudado!'. Vá direto ao ponto, com conteúdo concreto e pronto para usar.",
    ...(userContext
      ? [
          "",
          '===== CONTEXTO ADICIONAL FORNECIDO PELO(A) EDUCADOR(A) (preferências salvas em "Editar contexto") =====',
          userContext,
          "===== FIM DO CONTEXTO ADICIONAL =====",
        ]
      : []),
  ].join("\n");
  const ctx = [hojeBR(), (routeContext || "").trim()].filter(Boolean).join("\n");
  return buildSofiaPrompt(taskPrompt, ctx);
}

function conversationTitleFromMessages(messages: ChatMsg[]): string {
  const firstUserMessage =
    messages.find((m) => m.role === "user")?.content ?? "Conversa com a Sofia";
  const compact = firstUserMessage
    .replace(/\[Contexto:[\s\S]*?\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!compact) return "Conversa com a Sofia";
  return compact.length > 80 ? `${compact.slice(0, 77).trimEnd()}…` : compact;
}

export class SofiaChatError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export function friendlyGatewayError(status: number): string {
  if (status === 429)
    return "Muita gente usando a Sofia agora. Espere alguns segundos e envie de novo.";
  if (status === 402)
    return "Os créditos de IA do AgilizaProf acabaram por enquanto. Avise o suporte para liberar novamente.";
  if (status === 400)
    return "A Sofia não conseguiu ler essa mensagem. Tente escrever de outro jeito ou comece uma nova conversa.";
  return "A Sofia teve um problema para responder agora. Tente de novo em instantes.";
}

/** Cria o client do Supabase a partir do header Authorization (rotas /api). */
export async function supabaseFromRequest(
  request: Request,
): Promise<{ supabase: Supa; userId: string }> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new SofiaChatError("Configuração do servidor incompleta.", 500);
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer "))
    throw new SofiaChatError("Sua sessão expirou. Entre novamente.", 401);
  const token = auth.slice(7).trim();
  const supabase = createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  const sub = data?.claims?.sub;
  if (error || !sub) throw new SofiaChatError("Sua sessão expirou. Entre novamente.", 401);
  return { supabase, userId: sub };
}

/** Garante a conversa, grava a mensagem do usuário e monta o pedido para a IA. */
export async function prepareSofiaChat(supabase: Supa, userId: string, data: SofiaChatInput) {
  if (data.messages.length === 0)
    throw new SofiaChatError("Nenhuma mensagem foi enviada para a Sofia.", 400);
  if (data.messages[data.messages.length - 1].role !== "user") {
    throw new SofiaChatError("A última mensagem precisa ser sua.", 400);
  }

  let conversationId = data.conversationId ?? null;
  const ctxJson = {
    route_context: data.routeContext ?? null,
    user_context: data.userContext ?? null,
  };

  if (conversationId) {
    const { data: existing, error } = await supabase
      .from("sofia_conversations")
      .select("id")
      .eq("id", conversationId)
      .maybeSingle();
    if (error) throw new SofiaChatError(error.message);
    if (!existing) conversationId = null;
  }

  if (!conversationId) {
    const { data: created, error } = await supabase
      .from("sofia_conversations")
      .insert({
        user_id: userId,
        title: conversationTitleFromMessages(data.messages),
        origin_route: data.originRoute ?? null,
        context: ctxJson,
      })
      .select("id")
      .single();
    if (error) throw new SofiaChatError(error.message);
    conversationId = created.id;
    const cid = conversationId;
    const rows = data.messages.map((m) => ({
      conversation_id: cid,
      user_id: userId,
      role: m.role,
      content: m.content,
    }));
    const { error: histErr } = await supabase.from("sofia_messages").insert(rows);
    if (histErr) throw new SofiaChatError(histErr.message);
  } else {
    const latest = data.messages[data.messages.length - 1];
    const { error } = await supabase.from("sofia_messages").insert({
      conversation_id: conversationId,
      user_id: userId,
      role: "user",
      content: latest.content,
    });
    if (error) throw new SofiaChatError(error.message);
    await supabase
      .from("sofia_conversations")
      .update({
        origin_route: data.originRoute ?? null,
        context: ctxJson,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);
  }

  const history = trimHistory(data.messages);
  const lastUser = history[history.length - 1]?.content ?? "";
  const model = pickModel(lastUser);
  const chatMessages = [
    { role: "system" as const, content: buildSystemPrompt(data.routeContext, data.userContext) },
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];
  return { conversationId: conversationId as string, chatMessages, model };
}

export function gatewayBody(
  model: string,
  messages: Array<{ role: string; content: string }>,
  stream: boolean,
) {
  return JSON.stringify({
    model,
    messages,
    temperature: 0.6,
    max_tokens: 16000,
    stream,
  });
}

/** Tempo máximo sem nenhum dado do gateway (início da resposta ou entre pedaços). */
export const GATEWAY_IDLE_TIMEOUT_MS = 90_000;
/** Sem streaming, a resposta inteira chega de uma vez: dá mais tempo. */
const GATEWAY_TOTAL_TIMEOUT_MS = 150_000;
export const MSG_TEMPO_ESGOTADO = "A Sofia demorou demais para responder. Tente de novo.";

/**
 * Chama o gateway de IA. Com `stream`, o tempo limite vale até chegar a
 * resposta (os pedaços seguintes são vigiados por `lerComTempoLimite`).
 * `signal` cancela a chamada (por exemplo, quando a professora para a
 * resposta ou fecha a página).
 */
export async function callGateway(
  model: string,
  messages: Array<{ role: string; content: string }>,
  stream: boolean,
  signal?: AbortSignal,
) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey)
    throw new SofiaChatError("A Sofia está sem a chave de IA configurada no servidor.", 500);
  const ctrl = new AbortController();
  let estourou = false;
  const timer = setTimeout(
    () => {
      estourou = true;
      ctrl.abort();
    },
    stream ? GATEWAY_IDLE_TIMEOUT_MS : GATEWAY_TOTAL_TIMEOUT_MS,
  );
  const repassar = () => ctrl.abort();
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener("abort", repassar, { once: true });
  }
  let res: Response;
  try {
    res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: gatewayBody(model, messages, stream),
      signal: ctrl.signal,
    });
    // Sem streaming, o corpo também precisa chegar dentro do prazo.
    if (!stream && res.ok) {
      const txt = await res.text();
      res = new Response(txt, { status: res.status, headers: res.headers });
    }
  } catch (err) {
    if (estourou) throw new SofiaChatError(MSG_TEMPO_ESGOTADO, 504);
    if (signal?.aborted) throw new SofiaChatError("Resposta interrompida.", 499);
    throw err;
  } finally {
    clearTimeout(timer);
  }
  // Depois que a resposta começou, `signal` continua ligado a `ctrl`:
  // cancelar também interrompe a leitura do corpo.
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[sofia.chat] gateway ${res.status}: ${text.slice(0, 300)}`);
    throw new SofiaChatError(friendlyGatewayError(res.status), res.status);
  }
  return res;
}

/**
 * A resposta parou antes do fim? O gateway (formato OpenAI) usa "length";
 * o Gemini pode mandar "MAX_TOKENS". Filtro de conteúdo também corta o texto.
 * Sem finish_reason não dá para saber: tratamos como completa.
 */
export function isTruncatedFinish(finish: string | null): boolean {
  if (!finish) return false;
  return /^(length|max_tokens|content_filter|safety|recitation)$/i.test(finish);
}

/** Valida a resposta final, grava no banco e devolve o que o app mostra. */
export async function finalizeSofiaChat(
  supabase: Supa,
  userId: string,
  conversationId: string,
  rawContent: string,
  finishReason: string | null,
) {
  const content = (rawContent || "").trim();
  if (!content) {
    throw new SofiaChatError(
      "A Sofia não conseguiu montar uma resposta desta vez. Envie de novo ou escreva de outro jeito.",
      502,
    );
  }
  const validation = validateSofiaOutput(content);
  const issues: SofiaIssues = validation.issues.length > 0 ? validation.issues : null;
  if (validation.quality.length > 0) {
    console.info("[sofia.chat] quality:", validation.quality.map((q) => q.term).join(", "));
  }
  const { error } = await supabase.from("sofia_messages").insert({
    conversation_id: conversationId,
    user_id: userId,
    role: "assistant",
    content: validation.sanitized,
    issues: issues as unknown as Json,
  });
  if (error) console.error("[sofia.chat] falha ao salvar resposta:", error.message);
  return {
    conversationId,
    content: validation.sanitized,
    issues,
    truncated: isTruncatedFinish(finishReason),
  };
}

/** Respostas com 1500+ caracteres contam como geração longa (CUSTOS.chat_sofia_longa). */
export const CHAT_LIMIAR_LONGA = 1500;
export const CHAT_CUSTO_LONGA = 5;

/**
 * Cobrança do chat, feita no servidor (antes era o navegador que descontava,
 * e quem chamasse a rota direto conversava de graça):
 * - geração longa: 5 créditos nesta mensagem;
 * - chat curto: registrar_mensagem_sofia (1 crédito a cada 10 mensagens).
 * Roda com o login da própria professora; as funções do banco conferem
 * auth.uid(). Nunca lança: uma falha fica no log e não apaga a resposta.
 */
export async function cobrarMensagemChat(
  supabase: Supa,
  userId: string,
  texto: string,
): Promise<void> {
  try {
    if (texto.trim().length >= CHAT_LIMIAR_LONGA) {
      const { error } = await supabase.rpc(
        "consumir_creditos" as never,
        {
          _user_id: userId,
          _quantidade: CHAT_CUSTO_LONGA,
          _descricao: "Chat — geração longa",
        } as never,
      );
      if (error) console.warn("[sofia.chat] cobrança (longa) falhou:", error.message);
    } else {
      const { error } = await supabase.rpc(
        "registrar_mensagem_sofia" as never,
        { _user_id: userId } as never,
      );
      if (error) console.warn("[sofia.chat] cobrança (mensagem) falhou:", error.message);
    }
  } catch (e) {
    console.warn("[sofia.chat] cobrança falhou:", e);
  }
}
