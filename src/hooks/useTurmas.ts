import { useCallback, useEffect, useState } from "react";
import {
  listTurmas, createTurma, updateTurma, deleteTurma,
  type TurmaUI, type TurmaInput,
} from "@/lib/db/turmas";

export function useTurmas() {
  const [turmas, setTurmas] = useState<TurmaUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const list = await listTurmas();
      setTurmas(list);
    } catch (e) {
      console.error("[useTurmas] erro ao listar:", e);
      setError("Não foi possível carregar as turmas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // Sincroniza instâncias do hook em diferentes telas: quando uma turma é
  // criada/editada/removida em qualquer lugar, todas as instâncias refazem
  // a busca para refletir o estado atual.
  useEffect(() => {
    const handler = () => { void refresh(); };
    window.addEventListener("turmas:changed", handler);
    return () => window.removeEventListener("turmas:changed", handler);
  }, [refresh]);

  const create = useCallback(async (input: TurmaInput) => {
    const created = await createTurma(input);
    await refresh();
    if (typeof window !== "undefined") window.dispatchEvent(new Event("turmas:changed"));
    return created;
  }, [refresh]);

  const update = useCallback(async (id: string, input: Partial<TurmaInput>) => {
    const updated = await updateTurma(id, input);
    await refresh();
    if (typeof window !== "undefined") window.dispatchEvent(new Event("turmas:changed"));
    return updated;
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await deleteTurma(id);
    await refresh();
    if (typeof window !== "undefined") window.dispatchEvent(new Event("turmas:changed"));
  }, [refresh]);

  return { turmas, loading, error, refresh, create, update, remove };
}
