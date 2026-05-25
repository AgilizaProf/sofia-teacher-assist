import { createFileRoute } from "@tanstack/react-router";
import { Privacidade } from "@/pages/Privacidade";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade · AgilizaProf" },
      { name: "description", content: "Política de Privacidade do AgilizaProf — como tratamos dados pessoais de educadores e estudantes em conformidade com a LGPD, o ECA e a LBI." },
    ],
  }),
  component: Privacidade,
});