import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listAgendaEvents,
  createAgendaEvent,
  updateAgendaEvent,
  deleteAgendaEvent,
  type AgendaEventUI,
  type AgendaEventInput,
} from "@/lib/db/agenda";

const AGENDA_KEY = ["agenda_events"] as const;

export function useAgenda() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: AGENDA_KEY,
    queryFn: listAgendaEvents,
    staleTime: 1000 * 60, // 1min
  });

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: AGENDA_KEY });
  }, [qc]);

  const createMut = useMutation({ mutationFn: createAgendaEvent, onSuccess: invalidate });
  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AgendaEventInput> }) =>
      updateAgendaEvent(id, input),
    onSuccess: invalidate,
  });
  const deleteMut = useMutation({ mutationFn: deleteAgendaEvent, onSuccess: invalidate });

  const create = useCallback(
    (input: AgendaEventInput) => createMut.mutateAsync(input),
    [createMut],
  );
  const update = useCallback(
    (id: string, input: Partial<AgendaEventInput>) => updateMut.mutateAsync({ id, input }),
    [updateMut],
  );
  const remove = useCallback((id: string) => deleteMut.mutateAsync(id), [deleteMut]);
  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: AGENDA_KEY });
  }, [qc]);

  return {
    events: (query.data ?? []) as AgendaEventUI[],
    loading: query.isLoading,
    error: query.error ? "Não foi possível carregar a agenda." : null,
    refresh,
    create,
    update,
    remove,
  };
}
