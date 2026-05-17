import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BONUS_NOMES,
  MESES_PT_LONGO,
  diasAteRenovacaoMensal,
  planoFromSnapshot,
  type PlanoAtual,
} from "./policy";

export type CreditosState = {
  loading: boolean;
  totais: number;
  utilizados: number;
  disponiveis: number;
  plano: PlanoAtual;
  data_renovacao: string | null;
  ultimo_bonus_mes: number | null;
  ultimo_bonus_ano: number | null;
  ano_referencia: number | null;
  mes_referencia: number | null;
};

const EMPTY: CreditosState = {
  loading: true,
  totais: 0,
  utilizados: 0,
  disponiveis: 0,
  plano: "free",
  data_renovacao: null,
  ultimo_bonus_mes: null,
  ultimo_bonus_ano: null,
  ano_referencia: null,
  mes_referencia: null,
};

function rowToState(row: any, loading = false): CreditosState {
  const totais = Number(row?.creditos_totais ?? 0);
  const utilizados = Number(row?.creditos_utilizados ?? 0);
  return {
    loading,
    totais,
    utilizados,
    disponiveis: Math.max(0, totais - utilizados),
    plano: planoFromSnapshot(row?.plano_snapshot ?? null, row?.ciclo_snapshot ?? null),
    data_renovacao: row?.data_renovacao ?? null,
    ultimo_bonus_mes: row?.ultimo_bonus_mes ?? null,
    ultimo_bonus_ano: row?.ultimo_bonus_ano ?? null,
    ano_referencia: row?.ano_referencia ?? null,
    mes_referencia: row?.mes_referencia ?? null,
  };
}

export function useCreditos(): CreditosState & { refresh: () => Promise<void> } {
  const [state, setState] = useState<CreditosState>(EMPTY);
  const lastBonusRef = useRef<string | null>(null);
  const lastMesRef = useRef<string | null>(null);
  const renovAlertRef = useRef<string | null>(null);

  const fetchRow = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("creditos_usuario" as any)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      const next = rowToState(data, false);
      setState(next);
      lastBonusRef.current = next.ultimo_bonus_mes && next.ultimo_bonus_ano
        ? `${next.ultimo_bonus_ano}-${next.ultimo_bonus_mes}` : null;
      lastMesRef.current = next.ano_referencia && next.mes_referencia
        ? `${next.ano_referencia}-${next.mes_referencia}` : null;

      // Alerta 3 dias antes da renovação (apenas mensal/free), 1x por ciclo.
      if (next.plano !== "anual") {
        const dias = diasAteRenovacaoMensal();
        const cicloKey = `cred_renov_alert:${lastMesRef.current ?? ""}`;
        if (dias <= 3 && dias > 0 && typeof window !== "undefined" && !window.localStorage.getItem(cicloKey)) {
          window.localStorage.setItem(cicloKey, "1");
          renovAlertRef.current = cicloKey;
          toast.info("🔄 Renovação em breve", {
            description: `Seus créditos renovam em ${dias} dia${dias > 1 ? "s" : ""}. Você tem ${next.disponiveis} créditos restantes este mês.`,
            duration: 8000,
          });
        }
      }
    }
  }, []);

  const ensureAndFetch = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setState({ ...EMPTY, loading: false });
      return;
    }
    await supabase.rpc("garantir_creditos_usuario" as any, { _user_id: user.id });
    await fetchRow(user.id);
  }, [fetchRow]);

  const refresh = useCallback(async () => {
    await ensureAndFetch();
  }, [ensureAndFetch]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      await ensureAndFetch();
      if (cancelled) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel("creditos:" + user.id)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "creditos_usuario", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const next = rowToState(payload.new, false);
            setState(next);
            // Toast quando bônus mensal mudar
            const key = next.ultimo_bonus_mes && next.ultimo_bonus_ano
              ? `${next.ultimo_bonus_ano}-${next.ultimo_bonus_mes}` : null;
            if (key && key !== lastBonusRef.current && next.ultimo_bonus_mes) {
              const nome = BONUS_NOMES[next.ultimo_bonus_mes];
              if (nome) {
                const mesNome = MESES_PT_LONGO[next.ultimo_bonus_mes - 1];
                toast.success(`${nome}`, {
                  description: `Seus 500 créditos bônus de ${mesNome} foram adicionados! Bom trabalho.`,
                  duration: 8000,
                });
              }
              lastBonusRef.current = key;
            }
            // Toast de renovação mensal (mês de referência mudou e plano não-anual)
            const mesKey = next.ano_referencia && next.mes_referencia
              ? `${next.ano_referencia}-${next.mes_referencia}` : null;
            if (mesKey && lastMesRef.current && mesKey !== lastMesRef.current && next.plano !== "anual") {
              toast.success("✅ Créditos renovados!", {
                description: `Seus ${next.totais.toLocaleString("pt-BR")} créditos foram renovados. Bom trabalho este mês!`,
                duration: 8000,
              });
            }
            lastMesRef.current = mesKey;
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [ensureAndFetch]);

  return { ...state, refresh };
}

// Histórico das últimas N movimentações
export type MovimentacaoCredito = {
  id: string;
  tipo: string;
  quantidade: number;
  descricao: string;
  saldo_apos: number;
  created_at: string;
};

export function useHistoricoCreditos(limit = 5): { items: MovimentacaoCredito[]; loading: boolean } {
  const [items, setItems] = useState<MovimentacaoCredito[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("creditos_historico" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!cancelled) {
        setItems((data as any[] | null) ?? []);
        setLoading(false);
      }
      channel = supabase
        .channel("creditos_hist:" + user.id)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "creditos_historico", filter: `user_id=eq.${user.id}` },
          () => { void load(); },
        )
        .subscribe();
    }
    void load();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [limit]);

  return { items, loading };
}