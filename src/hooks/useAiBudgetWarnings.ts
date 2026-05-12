import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const LIMIT_BRL = 4.2;
const THRESHOLDS = [70, 80, 90, 100] as const;

function monthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function fetchUsage(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("ai_usage")
    .select("cost_brl")
    .eq("user_id", userId)
    .eq("month", monthKey());
  if (error || !data) return 0;
  return data.reduce((s: number, r: any) => s + Number(r.cost_brl ?? 0), 0);
}

function notify(pct: number) {
  if (pct >= 100) {
    toast.error("Limite mensal de IA atingido", {
      description: "Você usou 100% do seu orçamento mensal. Novas chamadas serão bloqueadas até o próximo mês.",
      duration: 10000,
    });
  } else {
    toast.warning(`Você já usou ${pct}% do seu limite mensal de IA`, {
      description: `Limite: R$ ${LIMIT_BRL.toFixed(2)}/mês. Considere reduzir o ritmo para não bloquear.`,
      duration: 8000,
    });
  }
}

export function useAiBudgetWarnings() {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const used = await fetchUsage(user.id);
      const pct = Math.floor((used / LIMIT_BRL) * 100);
      const storageKey = `ai_budget_notified:${user.id}:${monthKey()}`;
      const last = Number(localStorage.getItem(storageKey) ?? 0);
      const reached = [...THRESHOLDS].reverse().find((t) => pct >= t);
      if (reached && reached > last) {
        notify(reached);
        localStorage.setItem(storageKey, String(reached));
      }
    }

    check();
    timer.current = setInterval(check, 60_000);
    return () => {
      cancelled = true;
      if (timer.current) clearInterval(timer.current);
    };
  }, []);
}
