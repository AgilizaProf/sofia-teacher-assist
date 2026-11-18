import { createFileRoute } from "@tanstack/react-router";
import { PagamentoConfirmado } from "@/lib/mercadopago/PagamentoConfirmado";

export const Route = createFileRoute("/pagamento-confirmado-mensal")({
  head: () => ({
    meta: [
      { title: "AgilizaProf · Pagamento confirmado (mensal)" },
      { name: "description", content: "Pagamento mensal confirmado com sucesso." },
    ],
  }),
  component: PagamentoMensalPage,
});

function PagamentoMensalPage() {
  return <PagamentoConfirmado ciclo="mensal" />;
}
