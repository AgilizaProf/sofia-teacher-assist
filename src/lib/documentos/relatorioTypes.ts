export type RelatorioTipo = "geral" | "ei" | "pcd" | "semestral";
export type RelatorioModo = "completo" | "simplificado";

export type RelatorioCampo = {
  /** Nome do campo de experiência (EI) ou componente curricular (Fund/Médio). */
  nome: string;
  /** Texto descritivo livre. */
  descricao: string;
};

export type RelatorioBnccItem = {
  codigo: string;
  descricao?: string;
};

export type RelatorioAreaSimples = {
  nome: string;
  /** Status: "Consolidado" | "Em desenvolvimento" | "Consolidando" | "A trabalhar". */
  status: string;
};

export type RelatorioDocumento = {
  id?: string;
  tipo: RelatorioTipo;
  modo: RelatorioModo;
  /** Período em texto (ex.: "2º Bimestre", "1º Semestre", "Anual"). */
  periodo: string;
  dataInicio: string; // YYYY-MM-DD
  dataFim: string;    // YYYY-MM-DD
  escola: string;
  professor: string;
  turmaId?: string | null;
  turmaNome: string;
  nivelTexto?: string | null;
  alunoClientId: string;
  alunoNome: string;
  dataNascimento?: string | null;
  anoReferencia?: string | null;
  /** Diagnóstico textual livre (quando PCD). */
  diagnostico?: string | null;
  cids?: string[];
  anoReferenciaPedagogico?: string | null;

  // Corpo (modo completo)
  desenvolvimentoGlobal: string;
  campos: RelatorioCampo[];
  bncc: RelatorioBnccItem[];
  observacoes: string;
  avancos: string;
  proximosPassos: string;
  adaptacoes?: string;
  evolucaoPei?: string;
  apoioTeorico?: string;

  // Corpo (modo simplificado)
  areas?: RelatorioAreaSimples[];

  leis: string[];
};

/** Título dinâmico conforme tipo. */
export function tituloRelatorio(doc: Pick<RelatorioDocumento, "tipo">): string {
  switch (doc.tipo) {
    case "ei": return "PARECER DESCRITIVO";
    case "pcd": return "RELATÓRIO DE INCLUSÃO";
    case "semestral": return "RELATÓRIO SEMESTRAL";
    case "geral":
    default: return "RELATÓRIO DE DESEMPENHO";
  }
}

export function nomeArquivo(doc: RelatorioDocumento, ext: "pdf" | "docx" | "zip"): string {
  const slug = (doc.alunoNome || "aluno").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "aluno";
  const per = (doc.periodo || "").replace(/\s+/g, "-").toLowerCase() || "periodo";
  return `relatorio-${slug}-${per}.${ext}`;
}