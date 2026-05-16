/** Imprime apenas o documento atualmente renderizado (.documento-print-root). */
export function imprimirDocumento(): void {
  if (typeof window === "undefined") return;
  document.body.classList.add("documento-printing");
  const cleanup = () => {
    document.body.classList.remove("documento-printing");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  // Pequeno delay garante o reflow do CSS de impressão.
  setTimeout(() => window.print(), 50);
}