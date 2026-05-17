import { supabase } from "@/integrations/supabase/client";
import type { RelatorioDocumento } from "@/lib/documentos/relatorioTypes";

export type RelatorioSalvo = {
  id: string;
  alunoClientId: string;
  alunoNome: string;
  periodo: string;
  modo: RelatorioDocumento["modo"];
  tipo: RelatorioDocumento["tipo"];
  dataInicio: string;
  dataFim: string;
  versao: number;
  updatedAt: string;
  conteudo: RelatorioDocumento;
};

function rowToSaved(r: Record<string, unknown>): RelatorioSalvo {
  const conteudo = r.conteudo as RelatorioDocumento;
  return {
    id: r.id as string,
    alunoClientId: r.aluno_client_id as string,
    alunoNome: r.aluno_nome as string,
    periodo: r.periodo as string,
    modo: conteudo.modo,
    tipo: conteudo.tipo,
    dataInicio: r.data_inicio as string,
    dataFim: r.data_fim as string,
    versao: r.versao as number,
    updatedAt: r.updated_at as string,
    conteudo: { ...conteudo, id: r.id as string },
  };
}

export async function saveRelatorioDoc(
  doc: RelatorioDocumento,
  opts: { replace?: boolean } = {},
): Promise<RelatorioSalvo> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Não autenticado.");

  const payload = {
    user_id: uid,
    aluno_client_id: doc.alunoClientId,
    aluno_nome: doc.alunoNome,
    turma_id: doc.turmaId ?? null,
    turma_nome: doc.turmaNome,
    tipo: doc.tipo,
    modo: doc.modo,
    periodo: doc.periodo,
    data_inicio: doc.dataInicio,
    data_fim: doc.dataFim,
    escola: doc.escola,
    professor: doc.professor,
    conteudo: doc,
    leis: doc.leis,
  };

  if (doc.id) {
    const { data, error } = await supabase
      .from("relatorios_documento" as never)
      .update(payload as never)
      .eq("id", doc.id)
      .select()
      .single();
    if (error) throw error;
    return rowToSaved(data as Record<string, unknown>);
  }

  if (opts.replace) {
    const existing = await listRelatoriosDoc({
      alunoClientId: doc.alunoClientId,
      periodo: doc.periodo,
    });
    if (existing.length > 0) {
      const target = existing[0];
      const { data, error } = await supabase
        .from("relatorios_documento" as never)
        .update({ ...payload, versao: target.versao } as never)
        .eq("id", target.id)
        .select()
        .single();
      if (error) throw error;
      return rowToSaved(data as Record<string, unknown>);
    }
  }

  const existing = await listRelatoriosDoc({
    alunoClientId: doc.alunoClientId,
    periodo: doc.periodo,
  });
  const versao = existing.length > 0 ? Math.max(...existing.map((e) => e.versao)) + 1 : 1;

  const { data, error } = await supabase
    .from("relatorios_documento" as never)
    .insert({ ...payload, versao } as never)
    .select()
    .single();
  if (error) throw error;
  return rowToSaved(data as Record<string, unknown>);
}

export async function listRelatoriosDoc(filters: {
  alunoClientId?: string;
  periodo?: string;
} = {}): Promise<RelatorioSalvo[]> {
  let q = supabase
    .from("relatorios_documento" as never)
    .select("*")
    .order("updated_at", { ascending: false });
  if (filters.alunoClientId) q = q.eq("aluno_client_id", filters.alunoClientId);
  if (filters.periodo) q = q.eq("periodo", filters.periodo);
  const { data, error } = await q;
  if (error) throw error;
  return (data as Record<string, unknown>[] | null ?? []).map(rowToSaved);
}

export async function deleteRelatorioDoc(id: string): Promise<void> {
  const { error } = await supabase
    .from("relatorios_documento" as never)
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function checkExistingRelatorio(
  alunoClientId: string, periodo: string,
): Promise<RelatorioSalvo | null> {
  const list = await listRelatoriosDoc({ alunoClientId, periodo });
  return list[0] ?? null;
}