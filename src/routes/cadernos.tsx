import { createFileRoute } from "@tanstack/react-router";
import { Cadernos } from "@/pages/Cadernos";

export const Route = createFileRoute("/cadernos")({
  head: () => ({
    meta: [
      { title: "Cadernos prontos · AgilizaProf" },
      {
        name: "description",
        content:
          "Fichas por ano e disciplina, prontas para imprimir, com versão PCD. Acesso a partir de 13/03/2027.",
      },
    ],
  }),
  component: Cadernos,
});
