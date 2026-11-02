import { createFileRoute, redirect } from "@tanstack/react-router";

// A antiga aba Storage virou o cartão "Arquivos guardados" em Saúde do sistema.
export const Route = createFileRoute("/admin/storage")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/infra" });
  },
});
