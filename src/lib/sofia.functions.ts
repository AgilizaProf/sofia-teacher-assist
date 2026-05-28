import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildSofiaPrompt } from "@/lib/sofia-constitution";

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

function sanitizeMessages(input: unknown): ChatMsg[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(
      (m): m is { role: ChatMsg["role"]; content: string } =>
        !!m
        && typeof m === "object"
        && "content" in m
        && typeof m.content === "string"
        && "role" in m
        && (m.role === "user" || m.role === "assistant" || m.role === "system"),
    )
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 8000) }));
}

function buildSystemPrompt(routeContext?: string, userContext?: string) {
  const taskPrompt = [
    "Responda à conversa do chat seguindo rigorosamente a Constituição. Use apenas o que o(a) educador(a) registrou; quando faltar informação essencial, pergunte antes de produzir o documento. Escreva sempre em português do Brasil correto.",
    "",
    "ESTILO: Seja direta e objetiva. Sem introduções tipo 'Claro!' ou encerramentos tipo 'Espero ter ajudado!'. Vá direto ao ponto.",
    ...(userContext
      ? [
          "",
          "===== CONTEXTO ADICIONAL FORNECIDO PELA PROFESSORA =====",
          userContext,
          "===== FIM DO CONTEXTO ADICIONAL =====",
        ]
      : []),
  ].join("\n");
  return buildSofiaPrompt(taskPrompt, routeContext);
}

function conversationTitleFromMessages(messages: ChatMsg[]): string {
  const firstUserMessage = messages.find((message) => message.role === "user")?.content ?? "Conversa com a Sofia";
  const compact = firstUserMessage.replace(/\s+/g, " ").trim();
  return compact.slice(0, 80) || "Conversa com a Sofia";
}

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

const askSofiaServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ({
    conversationId: typeof (d as { conversationId?: unknown })?.conversationId === "string"
      ? (d as { conversationId: string }).conversationId
      : undefined,
    messages: sanitizeMessages((d as { messages?: unknown })?.messages),
    routeContext: typeof (d as { routeContext?: unknown })?.routeContext === "string"
      ? (d as { routeContext: string }).routeContext.slice(0, 4000)
      : undefined,
    originRoute: typeof (d as { originRoute?: unknown })?.originRoute === "string"
      ? (d as { originRoute: string }).originRoute.slice(0, 200)
      : undefined,
    userContext: typeof (d as { userContext?: unknown })?.userContext === "string"
      ? (d as { userContext: string }).userContext.slice(0, 2000)
      : undefined,
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.messages.length === 0) throw new Error("Nenhuma mensagem foi enviada para a Sofia.");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Variável de ambiente ausente: LOVABLE_API_KEY.");

    let conversationId = data.conversationId ?? null;

    if (conversationId) {
      const { data: existing, error: existingError } = await supabase
        .from("sofia_conversations")
        .select("id")
        .eq("id", conversationId)
        .maybeSingle();

      if (existingError) throw new Error(existingError.message);
      if (!existing) conversationId = null;
    }

    if (!conversationId) {
      const { data: created, error: createError } = await supabase
        .from("sofia_conversations")
        .insert({
          user_id: userId,
          title: conversationTitleFromMessages(data.messages),
          origin_route: data.originRoute ?? null,
          context: {
            route_context: data.routeContext ?? null,
            user_context: data.userContext ?? null,
          },
        })
        .select("id")
        .single();

      if (createError) throw new Error(createError.message);
      conversationId = created.id;

      const createdConversationId = conversationId;
      const historyRows = data.messages.map((message) => ({
        conversation_id: createdConversationId,
        user_id: userId,
        role: message.role,
        content: message.content,
      }));

      if (historyRows.length > 0) {
        const { error: historyError } = await supabase.from("sofia_messages").insert(historyRows);
        if (historyError) throw new Error(historyError.message);
      }
    } else {
      const latestUserMessage = [...data.messages].reverse().find((message) => message.role === "user");
      if (latestUserMessage) {
        const { error: userMessageError } = await supabase.from("sofia_messages").insert({
          conversation_id: conversationId,
          user_id: userId,
          role: "user",
          content: latestUserMessage.content,
        });
        if (userMessageError) throw new Error(userMessageError.message);
      }

      await supabase
        .from("sofia_conversations")
        .update({
          origin_route: data.originRoute ?? null,
          context: {
            route_context: data.routeContext ?? null,
            user_context: data.userContext ?? null,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
    }

    const system = buildSystemPrompt(data.routeContext, data.userContext);

    const chatMessages = [
      { role: "system" as const, content: system },
      ...data.messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: chatMessages,
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text().catch(() => "");
      if (aiRes.status === 429) {
        throw new Error("Limite de uso da IA atingido. Aguarde alguns instantes e tente novamente.");
      }
      if (aiRes.status === 402) {
        throw new Error("Créditos de IA esgotados no workspace. Adicione créditos para continuar.");
      }
      throw new Error(`IA ${aiRes.status}: ${text.slice(0, 200)}`);
    }

    const aiJson = await aiRes.json();
    const content: string = aiJson?.choices?.[0]?.message?.content ?? "";

    // Roda o validator para P3 (linguagem), P2 (BNCC) e P6 (transparência)
    const { validateSofiaOutput } = await import("@/lib/sofia-validator");
    const validation = validateSofiaOutput(content);
    const issues = validation.issues.length > 0 ? validation.issues : null;

    const { error: assistantError } = await supabase.from("sofia_messages").insert({
      conversation_id: conversationId,
      user_id: userId,
      role: "assistant",
      content: validation.sanitized,
      issues: issues as unknown as import("@/integrations/supabase/types").Json,
    });

    if (assistantError) throw new Error(assistantError.message);

    return {
      conversationId,
      content: validation.sanitized,
      issues,
      truncated: false,
    };
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

export async function* askSofia(args: {
  data: {
    conversationId?: string;
    messages: ChatMsg[];
    routeContext?: string;
    originRoute?: string;
    userContext?: string;
  };
}): AsyncGenerator<SofiaChunk> {
  const { content, conversationId, issues, truncated } = await askSofiaServer(args);
  yield { type: "delta", content };
  yield { type: "done", content, conversationId, issues, truncated };
}
