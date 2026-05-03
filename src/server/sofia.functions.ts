import { createServerFn } from "@tanstack/react-start";
import { validateSofiaOutput } from "@/lib/sofia-validator";
import { buildSofiaPrompt } from "@/lib/sofia-constitution";

const SOFIA_SYSTEM_PROMPT = buildSofiaPrompt(
  "Responda à conversa do chat seguindo rigorosamente a Constituição. Use apenas o que a professora registrou; quando faltar informação essencial, pergunte antes de produzir o documento.",
);

type ChatMessage = { role: "user" | "assistant"; content: string };

export const askSofia = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): { messages: ChatMessage[] } => {
    const d = (data || {}) as { messages?: unknown };
    const arr = Array.isArray(d.messages) ? d.messages : [];
    const messages: ChatMessage[] = arr
      .map((m) => m as { role?: string; content?: string })
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content as string }));
    return { messages };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente.");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SOFIA_SYSTEM_PROMPT }, ...data.messages],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Falha no AI Gateway (${res.status}): ${t.slice(0, 300)}`);
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content || "";
    const { ok, issues, sanitized } = validateSofiaOutput(raw);
    return { content: sanitized, issues, sanitizedApplied: !ok };
  });