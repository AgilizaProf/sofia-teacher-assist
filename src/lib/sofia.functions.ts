import { createServerFn } from "@tanstack/react-start";
import { validateSofiaOutput } from "@/lib/sofia-validator";
import { buildSofiaPrompt } from "@/lib/sofia-constitution";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertBudget, recordUsage, BudgetExceededError, MONTHLY_LIMIT_BRL } from "@/lib/aiBudget.server";

type ChatMessage = { role: "user" | "assistant"; content: string };

function buildSystemPrompt(routeContext?: string) {
  const taskPrompt = "Responda à conversa do chat seguindo rigorosamente a Constituição. Use apenas o que a professora registrou; quando faltar informação essencial, pergunte antes de produzir o documento.";
  return buildSofiaPrompt(taskPrompt, routeContext);
}

export const askSofia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown): { conversationId?: string; messages: ChatMessage[]; routeContext?: string; originRoute?: string } => {
    const d = (data || {}) as { conversationId?: unknown; messages?: unknown; routeContext?: unknown; originRoute?: unknown };
    const arr = Array.isArray(d.messages) ? d.messages : [];
    const messages: ChatMessage[] = arr
      .map((m) => m as { role?: string; content?: string })
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content as string }));
    return {
      conversationId: typeof d.conversationId === "string" ? d.conversationId : undefined,
      messages,
      routeContext: typeof d.routeContext === "string" ? d.routeContext.slice(0, 4000) : undefined,
      originRoute: typeof d.originRoute === "string" ? d.originRoute.slice(0, 200) : undefined,
    };
  })
  .handler(async function* ({ data, context }) {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente.");

    // Bloqueio por orçamento mensal.
    try {
      await assertBudget(userId);
    } catch (e) {
      if (e instanceof BudgetExceededError) {
        yield {
          type: "done" as const,
          conversationId: data.conversationId ?? null,
          content: `Você atingiu o limite mensal de uso da IA (R$ ${MONTHLY_LIMIT_BRL.toFixed(2)}). O contador zera no início do próximo mês.`,
          issues: null,
          sanitizedApplied: false,
          blocked: true,
          usedBrl: e.usedBrl,
          limitBrl: e.limitBrl,
        };
        return;
      }
      throw e;
    }

    // ensure conversation
    let conversationId = data.conversationId;
    if (!conversationId) {
      const firstUser = data.messages.find((m) => m.role === "user")?.content || "Nova conversa";
      const title = firstUser.slice(0, 80);
      const { data: conv, error } = await supabase
        .from("sofia_conversations")
        .insert([{ user_id: userId, title, origin_route: data.originRoute ?? null, context: data.routeContext ? { route: data.routeContext } : {} }])
        .select("id")
        .single();
      if (error || !conv) throw new Error("Falha ao criar conversa: " + (error?.message || ""));
      conversationId = conv.id;
    }

    // persist last user message
    const lastUser = [...data.messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      await supabase.from("sofia_messages").insert([{
        conversation_id: conversationId,
        user_id: userId,
        role: "user",
        content: lastUser.content,
      }]);
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: buildSystemPrompt(data.routeContext) }, ...data.messages],
        stream: true,
        max_tokens: 800,
      }),
    });
    if (!res.ok || !res.body) {
      const t = await res.text();
      throw new Error(`Falha no AI Gateway (${res.status}): ${t.slice(0, 300)}`);
    }

    let raw = "";
    let inputTokens = 0;
    let outputTokens = 0;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let streamDone = false;
    while (!streamDone) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line || line.startsWith(":")) continue;
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") { streamDone = true; break; }
        try {
          const j = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
            usage?: { prompt_tokens?: number; completion_tokens?: number };
          };
          const delta = j.choices?.[0]?.delta?.content;
          if (delta) {
            raw += delta;
            yield { type: "delta" as const, content: delta };
          }
          if (j.usage) {
            inputTokens = Number(j.usage.prompt_tokens ?? inputTokens);
            outputTokens = Number(j.usage.completion_tokens ?? outputTokens);
          }
        } catch {
          // partial JSON: rebuffer and wait for more
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    await recordUsage({
      userId,
      provider: "lovable",
      model: "google/gemini-2.5-flash",
      task: "chat",
      inputTokens,
      outputTokens,
    });
    const { ok, issues, sanitized } = validateSofiaOutput(raw);

    await supabase.from("sofia_messages").insert([{
      conversation_id: conversationId,
      user_id: userId,
      role: "assistant",
      content: sanitized,
      issues: (issues && issues.length ? JSON.parse(JSON.stringify(issues)) : null) as never,
    }]);

    yield {
      type: "done" as const,
      conversationId,
      content: sanitized,
      issues,
      sanitizedApplied: !ok,
    };
  });

export const listSofiaConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { supabase, userId } = context;
      const { data, error } = await supabase
        .from("sofia_conversations")
        .select("id,title,origin_route,updated_at,created_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) {
        console.error("[Sofia] Erro ao listar conversas:", error);
        return { conversations: [] as Array<{ id: string; title: string; origin_route: string | null; updated_at: string }> };
      }
      return { conversations: data ?? [] };
    } catch (err) {
      console.error("[Sofia] Exceção em listSofiaConversations:", err);
      return { conversations: [] as Array<{ id: string; title: string; origin_route: string | null; updated_at: string }> };
    }
  });

export const getSofiaConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const id = (d as { id?: unknown })?.id;
    if (typeof id !== "string") throw new Error("id inválido");
    return { id };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: msgs, error } = await supabase
      .from("sofia_messages")
      .select("id,role,content,issues,created_at")
      .eq("conversation_id", data.id)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { messages: msgs || [] };
  });