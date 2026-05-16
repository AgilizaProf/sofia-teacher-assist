export type DocumentoTipo = "atividades" | "pcd" | "trilhas" | "sofia";
export type DocumentoModo = "completo" | "simplificado";

export type ObjetivoItem = {
  texto: string;
  /** Código BNCC opcional (ex.: EF01MA01). */
  bncc?: string;
};

export type DiaPlanejamento = {
  /** ISO date (YYYY-MM-DD). */
  data: string;
  diaSemana: string;
  atividades: string;
  /** Lista de itens "atalho" no modo simplificado (ex.: "Frações"). */
  atividadesItens?: ObjetivoItem[];
  objetivos: ObjetivoItem[];
  materiais: string[];
  /** Se true, força quebra de página antes deste dia (início de semana). */
  novaSemana?: boolean;
};

export type DocumentoPlanejamento = {
  /** ID no Supabase, quando já salvo. */
  id?: string;
  tipo: DocumentoTipo;
  escola: string;
  turmaId?: string | null;
  turmaNome: string;
  professor: string;
  dataInicio: string; // YYYY-MM-DD
  dataFim: string;    // YYYY-MM-DD
  modo: DocumentoModo;
  dias: DiaPlanejamento[];
  leis: string[];
};