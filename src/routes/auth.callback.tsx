import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TelaStatus } from "@/components/RootErrorBoundary";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "AgilizaProf · Entrando" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Erro no callback OAuth:", error.message);
        navigate({ to: "/auth" });
        return;
      }
      if (data.session) {
        navigate({ to: "/" });
      } else {
        navigate({ to: "/auth" });
      }
    };
    handleCallback();
  }, [navigate]);

  return <TelaStatus titulo="Entrando na sua conta" texto="Só um instante." carregando />;
}
