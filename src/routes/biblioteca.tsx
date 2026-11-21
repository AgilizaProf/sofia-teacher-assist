import { createFileRoute } from "@tanstack/react-router";
import { Biblioteca } from "@/pages/Biblioteca";

export const Route = createFileRoute("/biblioteca")({
  head: () => ({
    meta: [
      { title: "Minha Biblioteca · AgilizaProf" },
      {
        name: "description",
        content: "Planos, atividades e simulados guardados para o próximo ano letivo.",
      },
    ],
  }),
  component: Biblioteca,
});
