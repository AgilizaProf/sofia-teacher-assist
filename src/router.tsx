import { createRouter, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { PaginaNaoEncontrada, TelaStatus } from "@/components/RootErrorBoundary";

function DefaultErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();

  return (
    <TelaStatus
      titulo="Algo deu errado"
      texto="Tivemos um problema ao abrir esta tela. Tente de novo em instantes."
      detalhe={import.meta.env.DEV && error instanceof Error && error.message ? error.message : undefined}
      acoes={[
        {
          label: "Tentar de novo",
          primaria: true,
          onClick: () => {
            router.invalidate();
            reset();
          },
        },
        { label: "Voltar ao início", href: "/" },
      ]}
    />
  );
}

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: {},
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent,
    defaultNotFoundComponent: PaginaNaoEncontrada,
  });

  return router;
};
