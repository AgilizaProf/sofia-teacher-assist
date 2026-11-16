import { createFileRoute } from "@tanstack/react-router";
import { PagamentoConfirmado } from "@/lib/mercadopago/PagamentoConfirmado";

export const Route = createFileRoute("/pagamento-confirmado-anual")({
  head: () => ({
    meta: [
      { title: "AgilizaProf · Pagamento confirmado (anual)" },
      { name: "description", content: "Pagamento anual confirmado com sucesso." },
    ],
  }),
  component: PagamentoAnualPage,
});

function PagamentoAnualPage() {
  return <PagamentoConfirmado ciclo="anual" />;
}
