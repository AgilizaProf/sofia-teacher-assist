import { useCallback, useEffect, useState } from "react";
import {
  listAgendaEvents,
  createAgendaEvent,
  updateAgendaEvent,
  deleteAgendaEvent,
  type AgendaEventUI,
  type AgendaEventInput,
} from "@/lib/db/agenda";

export function useAgenda() {
  const [events, setEvents] = useState<AgendaEventUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listAgendaEvents();
      setEvents(list);
    } catch (e) {
      console.error("[useAgenda] erro ao listar:", e);
      setError("Não foi possível carregar a agenda.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: AgendaEventInput) => {
      const created = await createAgendaEvent(input);
      await refresh();
      return created;
    },
    [refresh],
  );

  const update = useCallback(
    async (id: string, input: Partial<AgendaEventInput>) => {
      const updated = await updateAgendaEvent(id, input);
      await refresh();
      return updated;
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteAgendaEvent(id);
      await refresh();
    },
    [refresh],
  );

  return { events, loading, error, refresh, create, update, remove };
}