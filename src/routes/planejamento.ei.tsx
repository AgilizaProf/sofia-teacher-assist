import { createFileRoute, redirect } from "@tanstack/react-router";

// A tela de roteiros da Educação Infantil saiu do app.
// Links antigos e favoritos caem no Planejamento.
export const Route = createFileRoute("/planejamento/ei")({
  beforeLoad: () => {
    throw redirect({ to: "/planejamento" });
  },
});
