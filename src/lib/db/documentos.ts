import { supabase } from "@/integrations/supabase/client";
import type { DocumentoPlanejamento } from "@/lib/documentos/types";

type Row = {
  id: string;
  user_id: string;
  turma_id: string | null;
  tipo: DocumentoPlanejamento["tipo"];
  escola: string | null;
  professor: string | null;
  data_inicio: string;
  data_fim: string;
  modo: DocumentoPlanejamento["modo"];
  conteudo: DocumentoPlanejamento;
  leis: string[];
  created_at: string;
  updated_at: string;
};

export type DocumentoSalvo = {
  id: string;
  turmaId: string | null;
  tipo: DocumentoPlanejamento["tipo"];
  dataInicio: string;
  dataFim: string;
  modo: DocumentoPlanejamento["modo"];
  conteudo: DocumentoPlanejamento;
  createdAt: string;
  updatedAt: string;
};

function rowToUI(r: Row): DocumentoSalvo {
  return {
    id: r.id,
    turmaId: r.turma_id,
    tipo: r.tipo,
    dataInicio: r.data_inicio,
    dataFim: r.data_fim,
    modo: r.modo,
    conteudo: { ...r.conteudo, id: r.id },
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listDocumentos(filtro?: { turmaId?: string | null; tipo?: DocumentoPlanejamento["tipo"] }): Promise<DocumentoSalvo[]> {
  let q = supabase.from("documentos_planejamento").select("*").order("data_inicio", { ascending: false }).limit(200);
  if (filtro?.turmaId) q = q.eq("turma_id", filtro.turmaId);
  if (filtro?.tipo) q = q.eq("tipo", filtro.tipo);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as unknown as Row[]).map(rowToUI);
}

export async function saveDocumento(doc: DocumentoPlanejamento): Promise<DocumentoSalvo> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Usuário não autenticado");

  const payload = {
    user_id: userId,
    turma_id: doc.turmaId ?? null,
    tipo: doc.tipo,
    escola: doc.escola || null,
    professor: doc.professor || null,
    data_inicio: doc.dataInicio,
    data_fim: doc.dataFim,
    modo: doc.modo,
    conteudo: doc as unknown as Record<string, unknown>,
    leis: doc.leis,
  };

  if (doc.id) {
    const { data, error } = await supabase
      .from("documentos_planejamento")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", doc.id)
      .select()
      .single();
    if (error) throw error;
    return rowToUI(data as unknown as Row);
  }

  const { data, error } = await supabase
    .from("documentos_planejamento")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return rowToUI(data as unknown as Row);
}

export async function deleteDocumento(id: string): Promise<void> {
  const { error } = await supabase.from("documentos_planejamento").delete().eq("id", id);
  if (error) throw error;
}