import { createFileRoute } from "@tanstack/react-router";

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
  return (
    <iframe
      src="/pagamento-confirmado-anual.html"
      title="Pagamento confirmado · Anual"
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", border: "none" }}
    />
  );
}