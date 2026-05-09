import { supabase } from "@/integrations/supabase/client";

// UI shape (mantém o tipo `Student` usado em src/pages/Inclusao.tsx).
export type StudentUI = {
  id: string;
  name: string;
  initials: string;
  age: string;
  turma: string;
  diag: string;
  cid: string;
  aee: string;
  anoEscolar?: string;
  featured?: boolean;
  anamnese: string;
  registros: string;
  trend: string;
  trendTone: "ok" | "warn" | "muted";
  // Campos vindos do widget de cadastro do Dashboard (preservados no jsonb `data`).
  birth?: string;
  notes?: string;
  pcd?: string;
};

export type StudentInput = Omit<StudentUI, "id">;

type StudentRow = {
  id: string;
  user_id: string;
  nome: string;
  idade: number | null;
  client_id: string | null;
  condicao: string | null;
  nivel: string | null;
  faixa_etaria: string | null;
  turma: string | null;
  observacoes: string | null;
  aee: string | null;
  nivel_suporte: string | null;
  cid: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

function deriveInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0] ?? "")
      .join("")
      .toUpperCase() || "AL"
  );
}

function parseIdade(age: string): number | null {
  const m = /(\d+)/.exec(age || "");
  return m ? Number(m[1]) : null;
}

function rowToUI(r: StudentRow): StudentUI {
  const extra = (r.data ?? {}) as Partial<StudentUI> & Record<string, unknown>;
  const name = r.nome;
  return {
    id: r.id,
    name,
    initials: (extra.initials as string) || deriveInitials(name),
    age:
      (extra.age as string) ??
      (r.idade != null ? `${r.idade} anos` : "—"),
    turma: r.turma ?? "Sem turma",
    diag: r.condicao ?? "",
    cid: r.cid ?? "",
    aee: r.aee ?? "",
    anoEscolar: (extra.anoEscolar as string) ?? undefined,
    featured: (extra.featured as boolean) ?? undefined,
    anamnese: (extra.anamnese as string) ?? "0/14",
    registros: (extra.registros as string) ?? "0",
    trend: (extra.trend as string) ?? "—",
    trendTone: ((extra.trendTone as StudentUI["trendTone"]) ?? "muted"),
    birth: (extra.birth as string) ?? undefined,
    notes: ((extra.notes as string) ?? r.observacoes) ?? undefined,
    pcd: (extra.pcd as string) ?? undefined,
  };
}

function uiToPayload(input: StudentInput) {
  return {
    nome: input.name,
    idade: parseIdade(input.age),
    turma: input.turma || null,
    condicao: input.diag || null,
    cid: input.cid || null,
    aee: input.aee || null,
    observacoes: input.notes ?? null,
    data: {
      initials: input.initials,
      age: input.age,
      anoEscolar: input.anoEscolar ?? null,
      featured: input.featured ?? false,
      anamnese: input.anamnese,
      registros: input.registros,
      trend: input.trend,
      trendTone: input.trendTone,
      birth: input.birth ?? null,
      notes: input.notes ?? null,
      pcd: input.pcd ?? null,
    },
  };
}

export async function listInclusaoStudents(): Promise<StudentUI[]> {
  const { data, error } = await supabase
    .from("alunos_inclusao")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToUI(r as StudentRow));
}

export async function createInclusaoStudent(
  input: StudentInput,
): Promise<StudentUI> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Usuário não autenticado");
  // eslint-disable-next-line no-console
  console.log("[inclusao.db] insert nova aluna", { userId, nome: input.name });
  const { data, error } = await supabase
    .from("alunos_inclusao")
    .insert({ ...uiToPayload(input), user_id: userId })
    .select()
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[inclusao.db] erro no insert", error);
    throw error;
  }
  // eslint-disable-next-line no-console
  console.log("[inclusao.db] insert OK", { id: (data as StudentRow).id });
  return rowToUI(data as StudentRow);
}

export async function updateInclusaoStudent(
  id: string,
  input: Partial<StudentInput>,
): Promise<StudentUI> {
  // Carrega a linha atual para mesclar `data` jsonb sem perder campos.
  const { data: existing, error: getErr } = await supabase
    .from("alunos_inclusao")
    .select("*")
    .eq("id", id)
    .single();
  if (getErr) throw getErr;
  const current = rowToUI(existing as StudentRow);
  const merged: StudentInput = { ...current, ...input } as StudentInput;
  const payload = uiToPayload(merged);
  const { data, error } = await supabase
    .from("alunos_inclusao")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToUI(data as StudentRow);
}

export async function deleteInclusaoStudent(id: string): Promise<void> {
  const { error } = await supabase
    .from("alunos_inclusao")
    .delete()
    .eq("id", id);
  if (error) throw error;
}