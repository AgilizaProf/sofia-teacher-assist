import type {
  RelatorioCampo, RelatorioDocumento, RelatorioModo, RelatorioTipo,
} from "./relatorioTypes";
import { escolherLeisRelatorio } from "./relatorioLeis";
import { inferirNivelEnsino } from "@/lib/sofia/nivelEnsino";

const CAMPOS_EI: RelatorioCampo[] = [
  { nome: "O eu, o outro e o nós", descricao: "" },
  { nome: "Corpo, gestos e movimentos", descricao: "" },
  { nome: "Traços, sons, cores e formas", descricao: "" },
  { nome: "Escuta, fala, pensamento e imaginação", descricao: "" },
  { nome: "Espaços, tempos, quantidades, relações e transformações", descricao: "" },
];

const AREAS_FUND: RelatorioCampo[] = [
  { nome: "Língua Portuguesa", descricao: "" },
  { nome: "Matemática", descricao: "" },
  { nome: "Ciências", descricao: "" },
  { nome: "História e Geografia", descricao: "" },
  { nome: "Arte", descricao: "" },
];

/** Decide o tipo a partir do nível de ensino e do flag PCD. */
export function decidirTipoRelatorio(args: {
  nivelTexto?: string | null;
  pcd?: boolean;
  semestral?: boolean;
}): RelatorioTipo {
  if (args.pcd) return "pcd";
  if (args.semestral) return "semestral";
  const nivel = inferirNivelEnsino(args.nivelTexto ?? null);
  if (nivel === "Educação Infantil") return "ei";
  return "geral";
}

export function camposPadrao(tipo: RelatorioTipo): RelatorioCampo[] {
  if (tipo === "ei") return CAMPOS_EI.map((c) => ({ ...c }));
  return AREAS_FUND.map((c) => ({ ...c }));
}

export function buildRelatorioBase(args: {
  tipo: RelatorioTipo;
  modo: RelatorioModo;
  periodo: string;
  dataInicio: string;
  dataFim: string;
  escola: string;
  professor: string;
  turmaId?: string | null;
  turmaNome: string;
  nivelTexto?: string | null;
  alunoClientId: string;
  alunoNome: string;
  dataNascimento?: string | null;
  anoReferencia?: string | null;
  diagnostico?: string | null;
  cids?: string[];
  anoReferenciaPedagogico?: string | null;
  frequentaAee?: boolean;
  curriculoId?: string | null;
  /** Conteúdo opcional pré-preenchido (vindo da Sofia ou do app). */
  conteudo?: Partial<Pick<RelatorioDocumento,
    | "desenvolvimentoGlobal" | "campos" | "bncc" | "observacoes" | "avancos"
    | "proximosPassos" | "adaptacoes" | "evolucaoPei" | "apoioTeorico" | "areas"
  >>;
}): RelatorioDocumento {
  const leis = escolherLeisRelatorio({
    tipo: args.tipo,
    nivelTexto: args.nivelTexto,
    cidsAluno: args.cids,
    frequentaAee: args.frequentaAee,
  });
  const c = args.conteudo ?? {};
  return {
    tipo: args.tipo,
    modo: args.modo,
    periodo: args.periodo,
    dataInicio: args.dataInicio,
    dataFim: args.dataFim,
    escola: args.escola,
    professor: args.professor,
    turmaId: args.turmaId ?? null,
    turmaNome: args.turmaNome,
    nivelTexto: args.nivelTexto ?? null,
    alunoClientId: args.alunoClientId,
    alunoNome: args.alunoNome,
    dataNascimento: args.dataNascimento ?? null,
    anoReferencia: args.anoReferencia ?? String(new Date().getFullYear()),
    diagnostico: args.diagnostico ?? null,
    cids: args.cids ?? [],
    anoReferenciaPedagogico: args.anoReferenciaPedagogico ?? null,
    desenvolvimentoGlobal: c.desenvolvimentoGlobal ?? "",
    campos: c.campos && c.campos.length ? c.campos : camposPadrao(args.tipo),
    bncc: c.bncc ?? [],
    observacoes: c.observacoes ?? "",
    avancos: c.avancos ?? "",
    proximosPassos: c.proximosPassos ?? "",
    adaptacoes: c.adaptacoes,
    evolucaoPei: c.evolucaoPei,
    apoioTeorico: c.apoioTeorico,
    areas: c.areas,
    leis,
  };
}
