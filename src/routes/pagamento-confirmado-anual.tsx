import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/tracking";

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
  const [src, setSrc] = useState<string>("/pagamento-confirmado-anual.html");

  useEffect(() => {
    trackEvent("plano_contratado", { location: "plan_page", plan: "anual", value: 247, currency: "BRL" });
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      const params = new URLSearchParams();
      const name =
        (user?.user_metadata?.display_name as string | undefined) ||
        (user?.user_metadata?.name as string | undefined) ||
        (user?.email ? user.email.split("@")[0] : "");
      if (name) params.set("name", name);
      if (user?.email) params.set("email", user.email);
      params.set("purchase", new Date().toISOString());
      setSrc(`/pagamento-confirmado-anual.html?${params.toString()}`);
    })();
  }, []);

  return (
    <iframe
      src={src}
      title="Pagamento confirmado · Anual"
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", border: "none" }}
    />
  );
}
