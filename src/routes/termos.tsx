import { createFileRoute } from "@tanstack/react-router";
import { Termos } from "@/pages/Termos";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso · AgilizaProf" },
      { name: "description", content: "Termos de Uso do AgilizaProf — regras de utilização da Sofia, conformidade com LGPD, ECA, LBI, LDB, BNCC e CDC." },
    ],
  }),
  component: Termos,
});