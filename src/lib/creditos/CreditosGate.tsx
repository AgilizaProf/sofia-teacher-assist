import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CheckArgs = {
  custo: number;
  acao: string; // ex: "Plano de aula BNCC", "Trilha semestral"
};

type Estado = {
  open: boolean;
  custo: number;
  saldo: number;
  acao: string;
};

type Ctx = {
  /** Faz pré-checagem do saldo. Se houver crédito, devolve true; senão, abre o modal e devolve false. */
  checar: (args: CheckArgs) => Promise<boolean>;
};

const CreditosGateCtx = createContext<Ctx | null>(null);

async function fetchSaldoAtual(): Promise<number | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  // garante linha + bônus/renovações antes de ler
  const { data: rpcData } = await supabase.rpc("garantir_creditos_usuario" as any, { _user_id: user.id });
  const disp = (rpcData as any)?.creditos_disponiveis;
  if (typeof disp === "number") return Math.max(0, disp);
  const { data } = await supabase
    .from("creditos_usuario" as any)
    .select("creditos_totais, creditos_utilizados")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return 0;
  const t = Number((data as any).creditos_totais ?? 0);
  const u = Number((data as any).creditos_utilizados ?? 0);
  return Math.max(0, t - u);
}

export function CreditosGateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Estado>({ open: false, custo: 0, saldo: 0, acao: "" });

  const checar = useCallback(async ({ custo, acao }: CheckArgs) => {
    if (custo <= 0) return true;
    const saldo = await fetchSaldoAtual();
    if (saldo === null) {
      toast.error("Sessão expirada. Faça login novamente.");
      return false;
    }
    if (saldo >= custo) return true;
    // Trackeia bloqueio por créditos — sinal valioso para conversão Pro
    void import("@/lib/admin/track").then(({ trackEvent }) =>
      trackEvent("creditos_insuficientes", {
        acao,
        custo_acao: custo,
        saldo_atual: saldo,
        faltam: custo - saldo,
      })
    );
    setState({ open: true, custo, saldo, acao });
    return false;
  }, []);

  const ctx = useMemo<Ctx>(() => ({ checar }), [checar]);
  const faltam = Math.max(0, state.custo - state.saldo);

  return (
    <CreditosGateCtx.Provider value={ctx}>
      {children}
      <Dialog open={state.open} onOpenChange={(v) => setState((s) => ({ ...s, open: v }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Créditos insuficientes</DialogTitle>
            <DialogDescription>
              Esta ação{state.acao ? <> (<strong>{state.acao}</strong>)</> : null} consome{" "}
              <strong>{state.custo}</strong> {state.custo === 1 ? "crédito" : "créditos"}, mas você tem apenas{" "}
              <strong>{state.saldo}</strong> disponível{state.saldo === 1 ? "" : "is"}.
            </DialogDescription>
          </DialogHeader>

          <div
            style={{
              marginTop: 6,
              padding: "12px 14px",
              borderRadius: 10,
              background: "linear-gradient(135deg,#FFF1E8,#FFE4D1)",
              color: "#8a3a12",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            Faltam <strong>{faltam}</strong> {faltam === 1 ? "crédito" : "créditos"} para liberar a geração.
            Seus créditos serão renovados automaticamente no próximo ciclo do seu plano, ou você pode fazer o
            upgrade agora para continuar sem esperar.
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setState((s) => ({ ...s, open: false }))}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid var(--line, #e5e7eb)",
                background: "#fff",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Entendi
            </button>
            <Link
              to="/configuracoes"
              onClick={() => setState((s) => ({ ...s, open: false }))}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                background: "#FF7A45",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Ver planos e créditos
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CreditosGateCtx.Provider>
  );
}

export function useCreditosGate(): Ctx {
  const ctx = useContext(CreditosGateCtx);
  if (!ctx) {
    // Fallback "no-op" para evitar travar a UI caso o provider não esteja montado
    return {
      checar: async () => true,
    };
  }
  return ctx;
}
