/**
 * Limpeza de dados locais (localStorage) ao trocar de usuário / logout.
 *
 * O app guarda dados sensíveis (turmas, escolas, alunos, PEI, anamnese,
 * agenda, planos) no localStorage via `usePersistentState`, sob o prefixo
 * `aprof:`. Se o localStorage não for limpo no logout, a próxima conta que
 * fizer login no mesmo navegador pode ver os dados da conta anterior antes
 * da sincronização remota — um vazamento de dados entre usuários.
 *
 * Esta função remove todas as chaves do app (prefixo `aprof:`) e deve ser
 * chamada imediatamente antes de `supabase.auth.signOut()`.
 */
export const APROF_PREFIX = "aprof:";

export function clearLocalAppData() {
  if (typeof window === "undefined") return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(APROF_PREFIX)) toRemove.push(k);
    }
    toRemove.forEach((k) => {
      try { window.localStorage.removeItem(k); } catch { /* ignore */ }
    });
  } catch {
    /* localStorage indisponível — nada a fazer */
  }
}
