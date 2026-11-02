import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

type SofiaConversationSummary = {
  id: string;
  title: string;
  origin_route: string | null;
  updated_at: string;
};

type SofiaStoredMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  issues: Array<{ term: string; suggestion: string; principle: string }> | null;
};

const listSofiaConversationsServer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("sofia_conversations")
      .select("id, title, origin_route, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);

    return {
      conversations: (data ?? []) as SofiaConversationSummary[],
    };
  });

export const getSofiaConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ({
    id: typeof (d as { id?: unknown })?.id === "string" ? (d as { id: string }).id : "",
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    if (!data.id) throw new Error("Conversa inválida.");

    const { data: conversation, error: conversationError } = await supabase
      .from("sofia_conversations")
      .select("id")
      .eq("id", data.id)
      .maybeSingle();

    if (conversationError) throw new Error(conversationError.message);
    if (!conversation) throw new Error("Conversa não encontrada.");

    const { data: messages, error: messagesError } = await supabase
      .from("sofia_messages")
      .select("role, content, issues")
      .eq("conversation_id", data.id)
      .order("created_at", { ascending: true });

    if (messagesError) throw new Error(messagesError.message);

    return {
      id: conversation.id,
      messages: ((messages ?? []) as Array<{ role: string; content: string; issues: SofiaStoredMessage["issues"] }>)
        .filter((message) => message.role === "user" || message.role === "assistant" || message.role === "system"),
    };
  });

export const deleteSofiaConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ({
    id: typeof (d as { id?: unknown })?.id === "string" ? (d as { id: string }).id : "",
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    if (!data.id) throw new Error("Conversa inválida.");

    const { error } = await supabase.from("sofia_conversations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearSofiaConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("sofia_conversations").delete().eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Reserva sem streaming: usada só se a rota /api/sofia/chat não responder.
const askSofiaServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => d as AskArgs["data"])
  .handler(async ({ data: raw, context }) => {
    const { supabase, userId } = context;
    const { callGateway, finalizeSofiaChat, parseChatInput, prepareSofiaChat } = await import("@/server/sofia-chat.server");
    const data = parseChatInput(raw);
    const prep = await prepareSofiaChat(supabase, userId, data);
    const res = await callGateway(prep.model, prep.chatMessages, false);
    const json = await res.json();
    const choice = json?.choices?.[0];
    return finalizeSofiaChat(supabase, userId, prep.conversationId, choice?.message?.content ?? "", choice?.finish_reason ?? null);
  });

export type SofiaChunk =
  | { type: "delta"; content: string }
  | {
      type: "done";
      content: string;
      conversationId: string | null;
      issues?: SofiaStoredMessage["issues"];
      truncated?: boolean;
    };

export async function listSofiaConversations() {
  return listSofiaConversationsServer();
}

type AskArgs = {
  data: {
    conversationId?: string;
    messages: ChatMsg[];
    routeContext?: string;
    originRoute?: string;
    userContext?: string;
  };
};

async function* askSofiaFallback(args: AskArgs): AsyncGenerator<SofiaChunk> {
  const { content, conversationId, issues, truncated } = await askSofiaServer(args);
  yield { type: "delta", content };
  yield { type: "done", content, conversationId, issues, truncated };
}

/**
 * Envia a conversa para a Sofia e devolve o texto em pedaços, enquanto ela
 * escreve. Se a rota com streaming não estiver disponível, usa a server
 * function sem streaming (resposta inteira de uma vez).
 */
export async function* askSofia(args: AskArgs): AsyncGenerator<SofiaChunk> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("Sua sessão expirou. Entre novamente para falar com a Sofia.");

  let res: Response;
  try {
    res = await fetch("/api/sofia/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(args.data),
    });
  } catch {
    yield* askSofiaFallback(args);
    return;
  }
  if (res.status === 404 || res.status === 405) {
    yield* askSofiaFallback(args);
    return;
  }
  if (!res.ok || !res.body) {
    const j = await res.json().catch(() => null) as { message?: string } | null;
    throw new Error(j?.message || "A Sofia teve um problema para responder agora. Tente de novo em instantes.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let gotDone = false;
  let conversationId: string | null = args.data.conversationId ?? null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let ev: { type: string; [k: string]: unknown };
      try { ev = JSON.parse(line); } catch { continue; }
      if (ev.type === "meta" && typeof ev.conversationId === "string") {
        conversationId = ev.conversationId;
      } else if (ev.type === "delta" && typeof ev.content === "string") {
        yield { type: "delta", content: ev.content };
      } else if (ev.type === "done") {
        gotDone = true;
        yield {
          type: "done",
          content: String(ev.content ?? ""),
          conversationId: (ev.conversationId as string) ?? conversationId,
          issues: (ev.issues as SofiaStoredMessage["issues"]) ?? null,
          truncated: Boolean(ev.truncated),
        };
      } else if (ev.type === "error") {
        const err = new Error(String(ev.message || "A Sofia teve um problema para responder agora."));
        (err as Error & { conversationId?: string | null }).conversationId = conversationId;
        throw err;
      }
    }
  }
  if (!gotDone) {
    const err = new Error("A conexão caiu antes de a Sofia terminar. Envie de novo.");
    (err as Error & { conversationId?: string | null }).conversationId = conversationId;
    throw err;
  }
}
