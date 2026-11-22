import { createFileRoute, redirect } from "@tanstack/react-router";

// A página separada da Educação Infantil saiu: o roteiro por Campos de
// Experiência agora abre dentro do Planejamento. Links antigos e favoritos
// caem direto nele.
export const Route = createFileRoute("/planejamento/ei")({
  beforeLoad: () => {
    throw redirect({ to: "/planejamento", search: { m: "atv", ei: "1" } as never });
  },
});
