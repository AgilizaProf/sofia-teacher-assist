import { createFileRoute } from "@tanstack/react-router";
import {
  GATEWAY_IDLE_TIMEOUT_MS,
  MSG_TEMPO_ESGOTADO,
  SofiaChatError,
  callGateway,
  finalizeSofiaChat,
  parseChatInput,
  prepareSofiaChat,
  supabaseFromRequest,
} from "@/server/sofia-chat.server";

// Chat da Sofia com resposta em tempo real (o texto aparece enquanto é escrito).
// Resposta: uma linha JSON por evento (NDJSON):
//   {"type":"delta","content":"..."}  → pedaço novo do texto
//   {"type":"done", ...}              → texto final validado + id da conversa
//   {"type":"error","message":"..."}  → erro amigável para mostrar
export const Route = createFileRoute("/api/sofia/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let auth: Awaited<ReturnType<typeof supabaseFromRequest>>;
        let input: ReturnType<typeof parseChatInput>;
        try {
          auth = await supabaseFromRequest(request);
          input = parseChatInput(await request.json().catch(() => ({})));
        } catch (err) {
          const status = err instanceof SofiaChatError ? err.status : 400;
          const message = err instanceof Error ? err.message : "Pedido inválido.";
          return Response.json({ type: "error", message }, { status });
        }
        const { supabase, userId } = auth;

        const encoder = new TextEncoder();
        // Cancela a chamada à IA quando a professora para a resposta ou
        // fecha a página (o navegador encerra a conexão).
        const cancel = new AbortController();
        const pararTudo = () => cancel.abort();
        request.signal?.addEventListener?.("abort", pararTudo, { once: true });
        let fechado = false;
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const send = (obj: unknown) => {
              if (fechado) return;
              try {
                controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
              } catch {
                fechado = true;
              }
            };
            let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
            try {
              const prep = await prepareSofiaChat(supabase, userId, input);
              send({ type: "meta", conversationId: prep.conversationId });
              const res = await callGateway(prep.model, prep.chatMessages, true, cancel.signal);
              reader = res.body!.getReader();
              const r = reader;
              // Lê o próximo pedaço; se nada chegar em 90 s, desiste.
              const lerComTempoLimite = () =>
                new Promise<ReadableStreamReadResult<Uint8Array>>((resolve, reject) => {
                  const t = setTimeout(
                    () => reject(new SofiaChatError(MSG_TEMPO_ESGOTADO, 504)),
                    GATEWAY_IDLE_TIMEOUT_MS,
                  );
                  r.read().then(
                    (v) => {
                      clearTimeout(t);
                      resolve(v);
                    },
                    (e) => {
                      clearTimeout(t);
                      reject(e);
                    },
                  );
                });
              const decoder = new TextDecoder();
              let buf = "";
              let acc = "";
              let finish: string | null = null;
              for (;;) {
                if (cancel.signal.aborted) throw new SofiaChatError("Resposta interrompida.", 499);
                const { value, done } = await lerComTempoLimite();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                let nl: number;
                while ((nl = buf.indexOf("\n")) >= 0) {
                  const line = buf.slice(0, nl).trim();
                  buf = buf.slice(nl + 1);
                  if (!line.startsWith("data:")) continue;
                  const payload = line.slice(5).trim();
                  if (!payload || payload === "[DONE]") continue;
                  try {
                    const j = JSON.parse(payload);
                    const choice = j?.choices?.[0];
                    const piece: string = choice?.delta?.content ?? "";
                    if (choice?.finish_reason) finish = choice.finish_reason;
                    if (piece) {
                      acc += piece;
                      send({ type: "delta", content: piece });
                    }
                  } catch {
                    // linha parcial ou comentário: ignora
                  }
                }
              }
              const final = await finalizeSofiaChat(
                supabase,
                userId,
                prep.conversationId,
                acc,
                finish,
              );
              send({ type: "done", ...final });
            } catch (err) {
              const message =
                err instanceof Error
                  ? err.message
                  : "A Sofia teve um problema para responder agora.";
              if (!cancel.signal.aborted) console.error("[sofia.chat] erro:", message);
              send({ type: "error", message });
            } finally {
              cancel.abort();
              reader?.cancel().catch(() => {});
              request.signal?.removeEventListener?.("abort", pararTudo);
              if (!fechado) {
                fechado = true;
                try {
                  controller.close();
                } catch {
                  /* já fechado */
                }
              }
            }
          },
          cancel() {
            // O app parou de ler (botão Parar, troca de conversa, página fechada).
            fechado = true;
            cancel.abort();
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
