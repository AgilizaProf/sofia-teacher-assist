import { createFileRoute } from "@tanstack/react-router";
import { Confirmar } from "@/pages/Confirmar";

export const Route = createFileRoute("/confirmar")({
  head: () => ({
    meta: [
      { title: "Para confirmar · AgilizaProf" },
      {
        name: "description",
        content: "Mensagens do WhatsApp esperando a sua confirmação antes de ir para o aluno.",
      },
    ],
  }),
  component: Confirmar,
});
