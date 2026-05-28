import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TempoAcao } from "./acumular";

export type TempoEconomizadoState = {
  loading: boolean;
  minutos: number;
};

export type UseTempoEconomizadoOpts = {
  /** Se informado, soma apenas registros do histórico cuja `acao` esteja na lista. */
  acoes?: TempoAcao[];
  /** Se informado, soma apenas registros cujo `motivo` contenha o texto (case-insensitive). */
  motivoContains?: string;
};

/**
 * Saldo de tempo devolvido ao usuário (em minutos), com atualização em tempo real.
 *
 * Sem opções → retorna o saldo total (tabela `tempo_economizado`).
 * Com `acoes`/`motivoContains` → soma a partir de `tempo_economizado_historico`
 * (escopo por página/contexto). Esses dois caminhos compartilham a mesma fonte
 * de dados, então o filtro por página sempre integra o contador global.
 */
export function useTempoEconomizado(opts?: UseTempoEconomizadoOpts): TempoEconomizadoState {
  const [state, setState] = useState<TempoEconomizadoState>({ loading: true, minutos: 0 });
  const acoesKey = opts?.acoes ? [...opts.acoes].sort().join(",") : "";
  const motivoKey = opts?.motivoContains ?? "";
  const filtered = Boolean(acoesKey || motivoKey);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setState({ loading: false, minutos: 0 });
        return;
      }
      if (!filtered) {
        const { data } = await supabase
          .from("tempo_economizado" as any)
          .select("minutos_totais")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!cancelled) {
          setState({ loading: false, minutos: Number((data as any)?.minutos_totais ?? 0) });
        }
      } else {
        let q = supabase
          .from("tempo_economizado_historico" as any)
          .select("minutos,acao,motivo")
          .eq("user_id", user.id);
        if (acoesKey) q = q.in("acao", acoesKey.split(","));
        if (motivoKey) q = q.ilike("motivo", `%${motivoKey}%`);
        const { data } = await q;
        const total = (Array.isArray(data) ? data : []).reduce(
          (acc, r: any) => acc + Number(r?.minutos ?? 0),
          0,
        );
        if (!cancelled) setState({ loading: false, minutos: total });
      }

      channel = supabase
        .channel(`tempo_economizado:${user.id}:${filtered ? `f:${acoesKey}|${motivoKey}` : "total"}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: filtered ? "tempo_economizado_historico" : "tempo_economizado",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (!filtered) {
              const min = Number((payload.new as any)?.minutos_totais ?? 0);
              setState({ loading: false, minutos: min });
              return;
            }
            const row = (payload.new ?? payload.old) as any;
            if (!row) return;
            if (acoesKey && !acoesKey.split(",").includes(String(row.acao))) return;
            if (motivoKey && !String(row.motivo ?? "").toLowerCase().includes(motivoKey.toLowerCase())) return;
            // recarrega o total filtrado (mais simples que reconciliar incrementalmente)
            void load();
          },
        )
        .subscribe();
    }

    void load();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [acoesKey, motivoKey, filtered]);

  return state;
}