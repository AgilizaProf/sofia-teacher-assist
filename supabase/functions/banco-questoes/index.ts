// Entrega o banco de questões (52 mil questões, com gabarito) só para quem
// está logado.
//
// Antes o arquivo ficava em public/ferramentas/dados/ e qualquer pessoa o
// baixava sem login, só sabendo o endereço. Agora ele vem embutido nesta
// função (gerado por scripts/empacotar-banco-questoes.mjs) e a tela de
// Questões pede o arquivo por aqui, com o login da professora.
import { userIdFromAuthHeader } from "../_shared/ai-budget.ts";
import { corsHeaders } from "../_shared/sofia-router.ts";
import { BANCO_BASE64, VERSAO } from "./_gerado/banco.ts";

const cors = {
  ...corsHeaders,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers": "x-banco-versao",
};

// Decodifica uma vez por instância da função.
let bytes: Uint8Array | null = null;
function banco(): Uint8Array {
  if (!bytes) {
    const bin = atob(BANCO_BASE64);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const userId = await userIdFromAuthHeader(req.headers.get("Authorization"));
  if (!userId) {
    return new Response(
      JSON.stringify({ ok: false, error: "Sua sessão expirou. Entre de novo para abrir as Questões." }),
      { status: 401, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  return new Response(banco(), {
    headers: {
      ...cors,
      "Content-Type": "application/octet-stream",
      "x-banco-versao": VERSAO,
      // Só o navegador da própria professora guarda (nunca um cache compartilhado).
      "Cache-Control": "private, max-age=3600",
    },
  });
});
