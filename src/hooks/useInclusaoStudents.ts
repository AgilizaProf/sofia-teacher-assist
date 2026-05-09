import { useCallback, useEffect, useState } from "react";
import {
  listInclusaoStudents,
  createInclusaoStudent,
  updateInclusaoStudent,
  deleteInclusaoStudent,
  type StudentUI,
  type StudentInput,
} from "@/lib/db/inclusao";

export function useInclusaoStudents() {
  const [students, setStudents] = useState<StudentUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listInclusaoStudents();
      setStudents(list);
    } catch (e) {
      console.error("[useInclusaoStudents] erro ao listar:", e);
      setError("Não foi possível carregar a lista de alunos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: StudentInput) => {
      const created = await createInclusaoStudent(input);
      await refresh();
      return created;
    },
    [refresh],
  );

  const update = useCallback(
    async (id: string, input: Partial<StudentInput>) => {
      const updated = await updateInclusaoStudent(id, input);
      await refresh();
      return updated;
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteInclusaoStudent(id);
      await refresh();
    },
    [refresh],
  );

  return { students, loading, error, refresh, create, update, remove };
}