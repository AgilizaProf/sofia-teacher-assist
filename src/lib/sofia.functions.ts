import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildSofiaPrompt } from "@/lib/sofia-constitution";

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

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

const askSofiaServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => {
    const messages: ChatMsg[] = Array.isArray(d?.messages)
      ? d.messages
          .filter((m: any) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant" || m.role === "system"))
          .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 8000) }))
      : [];
    return {
      conversationId: typeof d?.conversationId === "string" ? d.conversationId : undefined,
      messages,
      routeContext: typeof d?.routeContext === "string" ? d.routeContext.slice(0, 4000) : undefined,
      originRoute: typeof d?.originRoute === "string" ? d.originRoute.slice(0, 200) : undefined,
      userContext: typeof d?.userContext === "string" ? d.userContext.slice(0, 2000) : undefined,
    };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");
    const system = buildSystemPrompt(data.routeContext, data.userContext);
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, ...data.messages],
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`AI gateway ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    return { content };
  });

export type SofiaChunk =
  | { type: "delta"; content: string }
  | { type: "done"; content: string };

export async function* askSofia(args: {
  data: {
    conversationId?: string;
    messages: ChatMsg[];
    routeContext?: string;
    originRoute?: string;
    userContext?: string;
  };
}): AsyncGenerator<SofiaChunk> {
  const { content } = await askSofiaServer(args);
  yield { type: "delta", content };
  yield { type: "done", content };
}
