// Avisa antes de sair da página quando há documento gerado pela Sofia que
// ainda não foi salvo (A17). Cobre a navegação dentro do app (TanStack Router)
// e o fechar/recarregar a aba (beforeunload).
import { useBlocker } from "@tanstack/react-router";

export const MSG_SAIR_SEM_SALVAR =
  "O documento gerado ainda não foi salvo. Se sair agora, ele se perde. Sair mesmo assim?";

export function useAvisoSairSemSalvar(ativo: boolean, mensagem: string = MSG_SAIR_SEM_SALVAR) {
  useBlocker({
    shouldBlockFn: ({ current, next }) => {
      if (!ativo) return false;
      // Trocar só a busca (?aba=...) na mesma página não perde nada.
      if (current?.pathname === next?.pathname) return false;
      if (typeof window === "undefined") return false;
      return !window.confirm(mensagem);
    },
    enableBeforeUnload: () => ativo,
    disabled: !ativo,
  });
}
