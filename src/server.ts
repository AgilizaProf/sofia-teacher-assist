import handler from "@tanstack/react-start/server-entry";

/**
 * Cabeçalhos de segurança em todas as páginas e rotas do servidor.
 *
 * - HSTS: o navegador passa a usar sempre https no domínio do app.
 * - nosniff: o navegador não "adivinha" o tipo de um arquivo.
 * - Referrer-Policy: outros sites não recebem o endereço completo das páginas.
 * - frame-ancestors: só o próprio app (e o editor do Lovable) podem abrir o
 *   app dentro de um iframe. Impede que um site falso coloque o app por baixo
 *   de botões enganosos (clickjacking).
 *
 * Uma Content-Security-Policy completa (scripts, estilos, conexões) ficou de
 * fora de propósito: ela precisa listar cada serviço usado (Supabase, Mercado
 * Pago, fontes, IA) e, se faltar um, quebra a tela. Vale fazer em um segundo
 * passo, testando no ar com Content-Security-Policy-Report-Only.
 */
const CABECALHOS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy":
    "frame-ancestors 'self' https://lovable.dev https://*.lovable.dev https://*.lovable.app",
};

type Fetch = (request: Request, ...rest: unknown[]) => Response | Promise<Response>;

export default {
  ...handler,
  async fetch(request: Request, ...rest: unknown[]) {
    const res = await (handler.fetch as Fetch)(request, ...rest);
    // Conexões websocket (101) seguem como vieram.
    if (res.status === 101) return res;
    const comCabecalhos = new Response(res.body, res);
    for (const [nome, valor] of Object.entries(CABECALHOS)) {
      if (!comCabecalhos.headers.has(nome)) comCabecalhos.headers.set(nome, valor);
    }
    return comCabecalhos;
  },
};
