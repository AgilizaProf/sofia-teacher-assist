// Entrega o conteúdo das ferramentas (Questões, Jogos) só para quem está logado.
//
// Antes os arquivos ficavam em public/ferramentas/ e o banco de questões, com
// gabaritos, abria sem login. O conteúdo agora fica embutido nesta função
// (gerado por scripts/empacotar-ferramentas.mjs a partir de
// ferramentas-privadas/) e o app o mostra num iframe com srcdoc.
//
// Resposta em text/plain: o Supabase reescreve text/html para text/plain em
// funções sem domínio próprio, e o app usa o texto como srcdoc de qualquer jeito.
import { userIdFromAuthHeader } from "../_shared/ai-budget.ts";
import { corsHeaders } from "../_shared/sofia-router.ts";

const cors = { ...corsHeaders, "Access-Control-Allow-Methods": "GET, OPTIONS" };

// Import dinâmico: cada arquivo só é carregado quando pedido.
const CARREGAR: Record<string, () => Promise<{ default: string }>> = {
  questoes: () => import("./_gerado/questoes.ts"),
  jogos: () => import("./_gerado/jogos.ts"),
};

const erro = (status: number, mensagem: string) =>
  new Response(JSON.stringify({ ok: false, error: mensagem }), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "GET") return erro(405, "Método não permitido.");

  const userId = await userIdFromAuthHeader(req.headers.get("Authorization"));
  if (!userId) return erro(401, "Sua sessão expirou. Entre de novo para abrir a ferramenta.");

  const nome = new URL(req.url).searchParams.get("nome") || "";
  const carregar = CARREGAR[nome];
  if (!carregar) return erro(404, "Ferramenta não encontrada.");

  try {
    const { default: html } = await carregar();
    return new Response(html, {
      headers: {
        ...cors,
        "Content-Type": "text/plain; charset=utf-8",
        // Só o navegador da própria professora guarda (nunca um cache compartilhado).
        "Cache-Control": "private, max-age=600",
      },
    });
  } catch (e) {
    console.error("[ferramenta] falha ao carregar", nome, e);
    return erro(500, "Não consegui abrir a ferramenta agora. Tente de novo em instantes.");
  }
});
