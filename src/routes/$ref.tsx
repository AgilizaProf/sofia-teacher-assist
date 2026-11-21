import { useEffect, useState } from "react";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { PaginaNaoEncontrada, TelaStatus } from "@/components/RootErrorBoundary";
import { REFERRAL_CODE_RE, referralCodeExists, savePendingReferral } from "@/lib/referral";

/**
 * Link curto de indicação: agilizaprof.app.br/CODIGO
 *
 * A15: só vira indicação se o endereço tiver o formato de código E o código
 * existir no banco. Qualquer outro endereço curto (link antigo, rota digitada
 * errado) mostra "Página não encontrada". As rotas do app têm prioridade
 * sobre esta, então /agenda, /jogos etc. nunca chegam aqui.
 */
export const Route = createFileRoute("/$ref")({
  beforeLoad: ({ params }) => {
    const code = String(params.ref || "")
      .trim()
      .toUpperCase();
    if (!REFERRAL_CODE_RE.test(code)) throw notFound();
  },
  notFoundComponent: PaginaNaoEncontrada,
  component: RefLink,
});

function RefLink() {
  const { ref } = Route.useParams();
  const navigate = useNavigate();
  const [inexistente, setInexistente] = useState(false);

  useEffect(() => {
    let ativo = true;
    const code = String(ref || "")
      .trim()
      .toUpperCase();
    (async () => {
      const existe = await referralCodeExists(code);
      if (!ativo) return;
      if (!existe) {
        setInexistente(true);
        return;
      }
      savePendingReferral(code);
      void import("@/lib/tracking").then(({ trackReferral }) =>
        trackReferral("ref_cadastro_via_link", { code }),
      );
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.auth.getSession();
      if (!ativo) return;
      if (data.session) {
        // Já tem conta: o código fica guardado e é aplicado em Indicações.
        navigate({ to: "/", replace: true });
      } else {
        navigate({ to: "/auth", search: { ref: code } as never, replace: true });
      }
    })();
    return () => {
      ativo = false;
    };
  }, [ref, navigate]);

  if (inexistente) return <PaginaNaoEncontrada />;
  return <TelaStatus titulo="Abrindo o convite" texto="Só um instante." carregando />;
}
