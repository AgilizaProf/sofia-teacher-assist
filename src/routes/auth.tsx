import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/pages/Auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar · AgilizaProf" },
      { name: "description", content: "Acesse sua conta no AgilizaProf e converse com a Sofia." },
    ],
  }),
  component: AuthPage,
});