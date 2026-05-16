/**
 * useDashLegacyData — adaptador que entrega turmas/alunos no MESMO formato
 * que as telas legadas esperavam de `dash_classes` / `dash_students`
 * (localStorage), mas lendo do Supabase via `useTurmas` e
 * `useInclusaoStudents`. Isso elimina a divergência entre Dashboard,
 * Planejamento, Inclusão, Relatórios e Sofia.
 */
import { useMemo } from "react";
import { useTurmas } from "@/hooks/useTurmas";
import { useInclusaoStudents } from "@/hooks/useInclusaoStudents";

export type LegacyDashClass = {
  name: string;
  school: string;
  grade: string;
  shift: string;
  students: string;
};

export type LegacyDashStudent = {
  id?: string;
  name: string;
  classRef: string;
  birth: string;
  pcd: string;
  notes: string;
  createdAt?: string;
};

export function useDashClasses(): LegacyDashClass[] {
  const { turmas } = useTurmas();
  return useMemo<LegacyDashClass[]>(
    () =>
      turmas.map((t) => ({
        name: t.name,
        school: t.school ?? "",
        grade: t.grade ?? "",
        shift: t.shift ?? "",
        students: t.students ?? "",
      })),
    [turmas],
  );
}

export function useDashStudents(): LegacyDashStudent[] {
  const { students } = useInclusaoStudents();
  return useMemo<LegacyDashStudent[]>(
    () =>
      students.map((s) => ({
        id: s.id,
        name: s.name,
        classRef: s.turma && s.turma !== "Sem turma" ? s.turma : "",
        birth: s.birth ?? "",
        pcd: s.pcd || (s.diag && s.diag !== "" ? s.diag : "nao"),
        notes: s.notes ?? "",
        createdAt: s.createdAt,
      })),
    [students],
  );
}
