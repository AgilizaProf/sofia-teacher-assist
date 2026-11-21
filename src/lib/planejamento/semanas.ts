import { useCallback } from "react";
import { usePersistentState } from "@/lib/persist/usePersistentState";
import { localDateKey } from "@/lib/datetime";

// Plano da semana guardado POR SEMANA.
//
// Antes, "Sofia preenche a semana" guardava um único plano (chave plan_m1_plan)
// com os dias SEG a SEX, sem dizer de qual semana. Ao andar para a próxima
// semana, apareciam as mesmas atividades, e uma atividade agendada para daqui a
// três semanas caía no mesmo dia da semana atual. Agora cada semana tem o seu
// plano, identificado pela data da segunda-feira (AAAA-MM-DD).

export type DiaSemana = "seg" | "ter" | "qua" | "qui" | "sex";
export type PlanoSemana<C> = Record<DiaSemana, C[]>;

export const CHAVE_SEMANAS = "plan_m1_semanas";
export const CHAVE_PLANO_ANTIGO = "plan_m1_plan";

export function planoVazio<C>(): PlanoSemana<C> {
  return { seg: [], ter: [], qua: [], qui: [], sex: [] };
}

/** Segunda-feira (AAAA-MM-DD) da semana de uma data. Sábado e domingo contam
 *  como a semana que termina. */
export function segundaDe(data: Date): string {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return localDateKey(d);
}

/** Dia útil (seg…sex) de uma data, ou null no fim de semana. */
export function diaDaData(data: Date): DiaSemana | null {
  const map: Array<DiaSemana | null> = [null, "seg", "ter", "qua", "qui", "sex", null];
  return map[data.getDay()] ?? null;
}

function temAtividade(p: unknown): boolean {
  if (!p || typeof p !== "object") return false;
  return Object.values(p as Record<string, unknown>).some((v) => Array.isArray(v) && v.length > 0);
}

/**
 * Lê e grava os planos por semana. Na primeira vez, o plano antigo (único)
 * aparece na semana atual, para ninguém perder o que já tinha feito; ele passa
 * a ser gravado nessa semana assim que a professora mexer.
 */
export function useSemanasPlano<C>() {
  const [semanas, setSemanas] = usePersistentState<Record<string, PlanoSemana<C>>>(CHAVE_SEMANAS, {});
  const [antigo] = usePersistentState<PlanoSemana<C> | null>(CHAVE_PLANO_ANTIGO, null);

  const semanaAtual = segundaDe(new Date());
  const herdado = Object.keys(semanas).length === 0 && temAtividade(antigo) ? antigo : null;

  const planoDe = useCallback(
    (segunda: string): PlanoSemana<C> => {
      const p = semanas[segunda];
      if (p) return { ...planoVazio<C>(), ...p };
      if (herdado && segunda === semanaAtual) return { ...planoVazio<C>(), ...herdado };
      return planoVazio<C>();
    },
    [semanas, herdado, semanaAtual],
  );

  const atualizar = useCallback(
    (segunda: string, u: PlanoSemana<C> | ((p: PlanoSemana<C>) => PlanoSemana<C>)) => {
      setSemanas((todas) => {
        const base: PlanoSemana<C> = todas[segunda]
          ? { ...planoVazio<C>(), ...todas[segunda] }
          : Object.keys(todas).length === 0 && herdado && segunda === semanaAtual
            ? { ...planoVazio<C>(), ...herdado }
            : planoVazio<C>();
        const novo = typeof u === "function" ? u(base) : u;
        return { ...todas, [segunda]: novo };
      });
    },
    [setSemanas, herdado, semanaAtual],
  );

  /** Acrescenta um cartão no dia certo da semana certa de uma data. */
  const agendar = useCallback(
    (data: Date, card: C) => {
      const dia = diaDaData(data);
      if (!dia) return false;
      atualizar(segundaDe(data), (p) => ({ ...p, [dia]: [...(p[dia] || []), card] }));
      return true;
    },
    [atualizar],
  );

  return { semanas, planoDe, atualizar, agendar, semanaAtual };
}
