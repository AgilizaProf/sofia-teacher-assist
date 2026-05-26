import { supabase } from "@/integrations/supabase/client";

// UI shape (mantido igual ao tipo `Event` em src/pages/Agenda.tsx).
export type AgendaEventUI = {
  id: string;
  date: string;            // YYYY-MM-DD
  title: string;
  time?: string;
  type: string;            // EventType na UI; persistido como text
  notes?: string;
  data?: Record<string, unknown>; // metadados extras (ex: { origem: "calendario" })
};

export type AgendaEventInput = Omit<AgendaEventUI, "id">;

type AgendaRow = {
  id: string;
  user_id: string;
  titulo: string;
  data_evento: string;
  hora: string | null;
  tipo: string | null;
  notas: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

function rowToUI(r: AgendaRow): AgendaEventUI {
  return {
    id: r.id,
    date: r.data_evento,
    title: r.titulo,
    time: r.hora ?? undefined,
    type: r.tipo ?? "meeting",
    notes: r.notas ?? undefined,
  };
}

function uiToPayload(input: AgendaEventInput) {
  return {
    titulo: input.title,
    data_evento: input.date,
    hora: input.time ?? null,
    tipo: input.type ?? null,
    notas: input.notes ?? null,
  };
}

export async function listAgendaEvents(): Promise<AgendaEventUI[]> {
  const { data, error } = await supabase
    .from("agenda_eventos")
    .select("*")
    .order("data_evento", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => rowToUI(r as AgendaRow));
}

export async function createAgendaEvent(input: AgendaEventInput): Promise<AgendaEventUI> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Usuário não autenticado");
  const { data, error } = await supabase
    .from("agenda_eventos")
    .insert({ ...uiToPayload(input), user_id: userId })
    .select()
    .single();
  if (error) throw error;
  void import("@/lib/admin/track").then(({ trackEvent }) =>
    trackEvent("agenda_evento_criado", { tipo: input.type ?? "outro" })
  );
  return rowToUI(data as AgendaRow);
}

export async function updateAgendaEvent(
  id: string,
  input: Partial<AgendaEventInput>,
): Promise<AgendaEventUI> {
  const payload: {
    titulo?: string;
    data_evento?: string;
    hora?: string | null;
    tipo?: string | null;
    notas?: string | null;
    updated_at: string;
  } = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) payload.titulo = input.title;
  if (input.date !== undefined) payload.data_evento = input.date;
  if (input.time !== undefined) payload.hora = input.time ?? null;
  if (input.type !== undefined) payload.tipo = input.type ?? null;
  if (input.notes !== undefined) payload.notas = input.notes ?? null;
  const { data, error } = await supabase
    .from("agenda_eventos")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToUI(data as AgendaRow);
}

export async function deleteAgendaEvent(id: string): Promise<void> {
  const { error } = await supabase.from("agenda_eventos").delete().eq("id", id);
  if (error) throw error;
}
