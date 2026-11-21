import { createFileRoute, redirect } from "@tanstack/react-router";

// "Simulados" agora se chama "Questões". O endereço antigo continua funcionando
// (links salvos, favoritos, mensagens antigas da Sofia) e leva para /questoes.
export const Route = createFileRoute("/simulados")({
  beforeLoad: () => {
    throw redirect({ to: "/questoes", replace: true });
  },
});
