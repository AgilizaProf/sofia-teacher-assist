import { createFileRoute } from "@tanstack/react-router";
import { Alfabetizacao } from "@/pages/Alfabetizacao";

export const Route = createFileRoute("/alfabetizacao")({
  head: () => ({
    meta: [
      { title: "Criança alfabetizada · AgilizaProf" },
      {
        name: "description",
        content:
          "Avalie a leitura e a escrita de cada aluno, imprima cartões de leitura e acompanhe a evolução da turma.",
      },
    ],
  }),
  component: Alfabetizacao,
});
