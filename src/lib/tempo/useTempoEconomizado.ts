import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TempoEconomizadoState = {
  loading: boolean;
  minutos: number;
};

/**
 * Saldo de tempo devolvido ao usuário (em minutos), com atualização em tempo real.
 */
export function useTempoEconomizado(): TempoEconomizadoState {
  const [state, setState] = useState<TempoEconomizadoState>({ loading: true, minutos: 0 });

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setState({ loading: false, minutos: 0 });
        return;
      }
      const { data } = await supabase
        .from("tempo_economizado" as any)
        .select("minutos_totais")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) {
        setState({ loading: false, minutos: Number((data as any)?.minutos_totais ?? 0) });
      }

      channel = supabase
        .channel("tempo_economizado:" + user.id)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tempo_economizado",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const min = Number((payload.new as any)?.minutos_totais ?? 0);
            setState({ loading: false, minutos: min });
          },
        )
        .subscribe();
    }

    void load();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return state;
}