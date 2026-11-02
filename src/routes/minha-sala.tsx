import { createFileRoute, redirect } from "@tanstack/react-router";

// A página "Minha sala" saiu do app. Links antigos (inclusive os da Sofia)
// levam à página inicial; o cadastro de escolas e turmas fica em Configurações.
export const Route = createFileRoute("/minha-sala")({
  beforeLoad: ({ search }) => {
    const open = (search as { open?: string }).open;
    if (open === "schools" || open === "classes") {
      throw redirect({ to: "/configuracoes" });
    }
    throw redirect({ to: "/" });
  },
});
