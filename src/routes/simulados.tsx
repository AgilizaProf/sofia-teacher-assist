import { createFileRoute } from "@tanstack/react-router";
import { Ferramenta } from "@/pages/Ferramenta";

function Simulados() {
  return (
    <Ferramenta
      titulo="Simulados"
      sub="Banco de questões alinhado à BNCC e ao SAEB. Monte provas com tipos A, B, C e D e corrija pela foto do cartão-resposta."
      src="/ferramentas/simulados.html"
    />
  );
}

export const Route = createFileRoute("/simulados")({
  head: () => ({
    meta: [
      { title: "Simulados e banco de questões — AgilizaProf" },
      {
        name: "description",
        content: "Banco de questões, gerador de simulados e correção pelo cartão-resposta.",
      },
    ],
  }),
  component: Simulados,
});
