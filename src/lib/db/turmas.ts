import { supabase } from "@/integrations/supabase/client";

export type TurmaUI = {
  id: string;
  name: string;
  school: string;
  grade: string;
  shift: string;
  students: string;
};

export type TurmaInput = Omit<TurmaUI, "id">;

type TurmaRow = {
  id: string;
  user_id: string;
  nome: string;
  escola: string | null;
  ano: string | null;
  turno: string | null;
  qtd_alunos: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

function rowToUI(r: TurmaRow): TurmaUI {
  return {
    id: r.id,
    name: r.nome,
    school: r.escola ?? "",
    grade: r.ano ?? "",
    shift: r.turno ?? "",
    students: r.qtd_alunos ?? "",
  };
}

function uiToPayload(input: Partial<TurmaInput>) {
  const p: Record<string, unknown> = {};
  if (input.name !== undefined) p.nome = input.name;
  if (input.school !== undefined) p.escola = input.school || null;
  if (input.grade !== undefined) p.ano = input.grade || null;
  if (input.shift !== undefined) p.turno = input.shift || null;
  if (input.students !== undefined) p.qtd_alunos = input.students || null;
  return p;
}

export async function listTurmas(): Promise<TurmaUI[]> {
  const { data, error } = await supabase
    .from("turmas")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((r) => rowToUI(r as TurmaRow));
}

export async function createTurma(input: TurmaInput): Promise<TurmaUI> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Usuário não autenticado");
  const { data, error } = await supabase
    .from("turmas")
    .insert({ ...uiToPayload(input), nome: input.name, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return rowToUI(data as TurmaRow);
}

export async function updateTurma(id: string, input: Partial<TurmaInput>): Promise<TurmaUI> {
  const { data, error } = await supabase
    .from("turmas")
    .update({ ...uiToPayload(input), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToUI(data as TurmaRow);
}

export async function deleteTurma(id: string): Promise<void> {
  const { error } = await supabase.from("turmas").delete().eq("id", id);
  if (error) throw error;
}
