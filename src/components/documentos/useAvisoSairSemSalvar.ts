// Avisa antes de sair da página quando há documento gerado pela Sofia que
// ainda não foi salvo (A17). Cobre a navegação dentro do app (TanStack Router)
// e o fechar/recarregar a aba (beforeunload).
import { useBlocker } from "@tanstack/react-router";

export const MSG_SAIR_SEM_SALVAR =
  "O documento gerado ainda não foi salvo. Se sair agora, ele se perde. Sair mesmo assim?";

export function useAvisoSairSemSalvar(ativo: boolean, mensagem: string = MSG_SAIR_SEM_SALVAR) {
  useBlocker({
    shouldBlockFn: async ({ current, next }) => {
      if (!ativo) return false;
      // Trocar só a busca (?aba=...) na mesma página não perde nada.
      if (current?.pathname === next?.pathname) return false;
      if (typeof window === "undefined") return false;
      return !(await confirmarSaida(mensagem));
    },
    enableBeforeUnload: () => ativo,
    disabled: !ativo,
  });
}

/**
 * Pergunta do próprio app (no lugar do confirm do navegador, que trava a aba
 * e destoa do resto). Devolve true se a professora quiser sair.
 */
export function confirmarSaida(mensagem: string): Promise<boolean> {
  return new Promise((resolve) => {
    const fundo = document.createElement("div");
    fundo.setAttribute("role", "presentation");
    fundo.style.cssText =
      "position:fixed;inset:0;z-index:10000;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:16px;";
    const caixa = document.createElement("div");
    caixa.setAttribute("role", "alertdialog");
    caixa.setAttribute("aria-modal", "true");
    caixa.setAttribute("aria-label", "Sair sem salvar?");
    caixa.style.cssText =
      "background:#fff;color:#1f2937;border-radius:16px;max-width:420px;width:100%;padding:20px;box-shadow:0 20px 50px rgba(0,0,0,.25);font:inherit;";
    const titulo = document.createElement("p");
    titulo.textContent = "Sair sem salvar?";
    titulo.style.cssText = "font-weight:700;font-size:17px;margin:0 0 8px;";
    const texto = document.createElement("p");
    texto.textContent = mensagem;
    texto.style.cssText = "margin:0 0 18px;font-size:15px;line-height:1.45;";
    const linha = document.createElement("div");
    linha.style.cssText = "display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;";
    const ficar = document.createElement("button");
    ficar.type = "button";
    ficar.textContent = "Continuar aqui";
    ficar.style.cssText =
      "min-height:44px;padding:0 16px;border-radius:10px;border:0;background:#0f766e;color:#fff;font-weight:600;cursor:pointer;";
    const sair = document.createElement("button");
    sair.type = "button";
    sair.textContent = "Sair sem salvar";
    sair.style.cssText =
      "min-height:44px;padding:0 16px;border-radius:10px;border:1px solid #d1d5db;background:#fff;color:#1f2937;font-weight:600;cursor:pointer;";
    const fechar = (resposta: boolean) => {
      document.removeEventListener("keydown", tecla);
      fundo.remove();
      resolve(resposta);
    };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") fechar(false); };
    ficar.onclick = () => fechar(false);
    sair.onclick = () => fechar(true);
    fundo.onclick = (e) => { if (e.target === fundo) fechar(false); };
    document.addEventListener("keydown", tecla);
    linha.append(sair, ficar);
    caixa.append(titulo, texto, linha);
    fundo.append(caixa);
    document.body.append(fundo);
    ficar.focus();
  });
}
