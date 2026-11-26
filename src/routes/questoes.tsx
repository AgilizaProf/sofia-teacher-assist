import { createFileRoute } from "@tanstack/react-router";
import { Ferramenta } from "@/pages/Ferramenta";

function Questoes() {
  return (
    <Ferramenta
      titulo="Questões"
      sub="52 mil questões alinhadas à BNCC e ao SAEB, do 1º ao 9º ano. Monte provas A, B, C e D, imprima e corrija pela foto do cartão-resposta."
      src="/ferramentas/questoes.html"
    />
  );
}

export const Route = createFileRoute("/questoes")({
  head: () => ({
    meta: [
      { title: "Questões — AgilizaProf" },
      {
        name: "description",
        content:
          "52 mil questões alinhadas à BNCC e ao SAEB, gerador de provas A, B, C e D e correção pela foto do cartão-resposta.",
      },
    ],
  }),
  component: Questoes,
});
