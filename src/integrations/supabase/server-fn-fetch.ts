import { createIsomorphicFn } from "@tanstack/react-start";
import { supabase } from "./client";

/**
 * Injeta o token de acesso do Supabase em todas as chamadas a
 * server functions do TanStack Start (rotas /_serverFn/*) feitas
 * pelo navegador. Sem isso, middlewares como `requireSupabaseAuth`
 * recebem requisições sem header e respondem 401.
 */
let installed = false;

export const installServerFnAuthFetch = createIsomorphicFn()
  .client(() => {
    if (installed) return;
    if (typeof window === "undefined") return;
    installed = true;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init) => {
      try {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : (input as Request).url;

        if (url && url.includes("/_serverFn/")) {
          const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
          if (!headers.has("authorization")) {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            if (token) headers.set("authorization", `Bearer ${token}`);
          }
          return originalFetch(input, { ...init, headers });
        }
      } catch {
        // se algo falhar na inspeção, segue com o fetch original
      }
      return originalFetch(input, init);
    };
  })
  .server(() => {
    // No-op no servidor: o interceptor só existe no browser.
  });