import { createFileRoute } from "@tanstack/react-router";
import { Ferramenta } from "@/pages/Ferramenta";

function Jogos() {
  return (
    <Ferramenta
      titulo="Jogos e atividades interativas"
      sub="Mais de 120 jogos para criar a partir da aula e jogar com a turma, no computador ou projetados na sala."
      src="/ferramentas/jogos.html"
    />
  );
}

export const Route = createFileRoute("/jogos")({
  head: () => ({
    meta: [
      { title: "Jogos e atividades interativas — AgilizaProf" },
      {
        name: "description",
        content: "Jogos educativos para criar a partir da aula e jogar com a turma.",
      },
    ],
  }),
  component: Jogos,
});
