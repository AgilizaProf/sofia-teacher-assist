import { supabase } from "@/integrations/supabase/client";

// O app chama supabase.auth.getUser() em dezenas de lugares, e cada chamada é
// um pedido ao servidor de autenticação. Ao abrir uma tela isso virava 20 a 30
// pedidos iguais em poucos segundos. Aqui as chamadas sem token explícito
// reaproveitam a mesma resposta por alguns segundos; qualquer mudança de
// sessão (entrar, sair, renovar token) limpa o cache.
const VALIDADE_MS = 15_000;
let instalado = false;

export function installGetUserCache() {
  if (instalado || typeof window === "undefined") return;
  instalado = true;
  const auth = supabase.auth;
  const original = auth.getUser.bind(auth);
  let cache: { at: number; p: ReturnType<typeof original> } | null = null;
  auth.getUser = ((jwt?: string) => {
    if (jwt) return original(jwt);
    if (cache && Date.now() - cache.at < VALIDADE_MS) return cache.p;
    const p = original().then((r) => {
      if (r.error || !r.data.user) cache = null;
      return r;
    });
    cache = { at: Date.now(), p };
    return p;
  }) as typeof auth.getUser;
  auth.onAuthStateChange(() => {
    cache = null;
  });
}
