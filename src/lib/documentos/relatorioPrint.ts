/** Imprime o relatório renderizado em tela usando o CSS `.documento-print-root`. */
export function imprimirRelatorio(): void {
  if (typeof window === "undefined") return;
  document.body.classList.add("documento-printing");
  const cleanup = () => {
    document.body.classList.remove("documento-printing");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  setTimeout(() => window.print(), 50);
}