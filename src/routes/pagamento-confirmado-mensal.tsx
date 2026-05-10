import { createFileRoute } from "@tanstack/react-router";

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
  return (
    <iframe
      src="/pagamento-confirmado-mensal.html"
      title="Pagamento confirmado · Mensal"
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", border: "none" }}
    />
  );
}