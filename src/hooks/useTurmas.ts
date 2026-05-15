import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listTurmas, createTurma, updateTurma, deleteTurma,
  type TurmaUI, type TurmaInput,
} from "@/lib/db/turmas";

const TURMAS_KEY = ["turmas"] as const;

export function useTurmas() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: TURMAS_KEY,
    queryFn: listTurmas,
    staleTime: 1000 * 60 * 5, // 5min — turmas mudam pouco
  });

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: TURMAS_KEY });
  }, [qc]);

  const createMut = useMutation({
    mutationFn: (input: TurmaInput) => createTurma(input),
    onSuccess: invalidate,
  });
  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TurmaInput> }) =>
      updateTurma(id, input),
    onSuccess: invalidate,
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTurma(id),
    onSuccess: invalidate,
  });

  const create = useCallback(
    (input: TurmaInput) => createMut.mutateAsync(input),
    [createMut],
  );
  const update = useCallback(
    (id: string, input: Partial<TurmaInput>) => updateMut.mutateAsync({ id, input }),
    [updateMut],
  );
  const remove = useCallback(
    (id: string) => deleteMut.mutateAsync(id),
    [deleteMut],
  );
  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: TURMAS_KEY });
  }, [qc]);

  return {
    turmas: (query.data ?? []) as TurmaUI[],
    loading: query.isLoading,
    error: query.error ? "Não foi possível carregar as turmas." : null,
    refresh,
    create,
    update,
    remove,
  };
}
