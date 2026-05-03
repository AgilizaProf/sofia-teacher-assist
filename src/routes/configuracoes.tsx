import { createFileRoute } from "@tanstack/react-router";
import { Configuracoes } from "@/pages/Configuracoes";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações · AgilizaProf" },
      { name: "description", content: "Princípios da Sofia, preferências e ajustes da sua conta no AgilizaProf." },
    ],
  }),
  component: Configuracoes,
});