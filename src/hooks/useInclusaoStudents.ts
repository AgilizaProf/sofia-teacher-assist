import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listInclusaoStudents,
  createInclusaoStudent,
  updateInclusaoStudent,
  deleteInclusaoStudent,
  bulkDeleteInclusaoStudents,
  bulkAssignTurmaInclusao,
  type StudentUI,
  type StudentInput,
} from "@/lib/db/inclusao";

const STUDENTS_KEY = ["inclusao_students"] as const;

export function useInclusaoStudents() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: STUDENTS_KEY,
    queryFn: listInclusaoStudents,
    staleTime: 1000 * 60, // 1min
  });

  const students = useMemo<StudentUI[]>(() => {
    const list = query.data ?? [];
    return [...list].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" }),
    );
  }, [query.data]);

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: STUDENTS_KEY });
  }, [qc]);

  const createMut = useMutation({ mutationFn: createInclusaoStudent, onSuccess: invalidate });
  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<StudentInput> }) =>
      updateInclusaoStudent(id, input),
    onSuccess: invalidate,
  });
  const deleteMut = useMutation({ mutationFn: deleteInclusaoStudent, onSuccess: invalidate });
  const bulkDelMut = useMutation({ mutationFn: bulkDeleteInclusaoStudents, onSuccess: invalidate });
  const bulkAssignMut = useMutation({
    mutationFn: ({ ids, turma }: { ids: string[]; turma: string }) =>
      bulkAssignTurmaInclusao(ids, turma),
    onSuccess: invalidate,
  });

  const create = useCallback((input: StudentInput) => createMut.mutateAsync(input), [createMut]);
  const update = useCallback(
    (id: string, input: Partial<StudentInput>) => updateMut.mutateAsync({ id, input }),
    [updateMut],
  );
  const remove = useCallback((id: string) => deleteMut.mutateAsync(id), [deleteMut]);
  const bulkRemove = useCallback((ids: string[]) => bulkDelMut.mutateAsync(ids), [bulkDelMut]);
  const bulkAssignTurma = useCallback(
    (ids: string[], turma: string) => bulkAssignMut.mutateAsync({ ids, turma }),
    [bulkAssignMut],
  );
  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: STUDENTS_KEY });
  }, [qc]);

  return {
    students,
    loading: query.isLoading,
    error: query.error ? "Não foi possível carregar a lista de alunos." : null,
    refresh,
    create,
    update,
    remove,
    bulkRemove,
    bulkAssignTurma,
  };
}
