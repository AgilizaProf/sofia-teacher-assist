import { createFileRoute } from "@tanstack/react-router";
import { Relatorios } from "@/pages/Relatorios";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios · Pareceres descritivos — AgilizaProf" },
      { name: "description", content: "Gerencie pareceres descritivos do bimestre. Gere com a Sofia, revise rascunhos e finalize em minutos." },
      { property: "og:title", content: "Relatórios · Pareceres descritivos — AgilizaProf" },
      { property: "og:description", content: "Pareceres descritivos alinhados à BNCC, gerados com IA e prontos pra revisão." },
    ],
  }),
  component: Relatorios,
});