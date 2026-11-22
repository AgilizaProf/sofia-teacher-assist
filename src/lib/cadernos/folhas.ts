// Atividades em folha (PDF) dos Cadernos prontos, sugeridas como complemento
// quando a professora de Educação Infantil ou Fundamental 1 busca uma
// atividade pela BNCC.
//
// Os cadernos ainda estão trancados (acesso a partir de CADERNOS_LIBERA_EM) e
// o catálogo real ainda não foi carregado: CATALOGO_FOLHAS começa vazio e NÃO
// deve receber fichas inventadas. A regra de "mostrar só o que está de acordo
// com a busca" já está pronta em `folhasDeAcordo` para quando ele chegar.

export const CADERNOS_LIBERA_EM = "13/03/2027";
export const CADERNOS_LIBERA_CURTO = "13/03";

export type EtapaFolha = "infantil" | "fund1";

export type TipoFolha =
  | "conceito"
  | "atividades"
  | "aprofundamento"
  | "fixacao"
  | "pcd"
  | "caderno_professor";

export const TIPOS_FOLHA: Array<{ id: TipoFolha; nome: string; resumo: string }> = [
  { id: "conceito", nome: "Conceito", resumo: "Apresenta o conteúdo" },
  { id: "atividades", nome: "Atividades", resumo: "Para fazer em sala" },
  { id: "aprofundamento", nome: "Aprofundamento", resumo: "Para ir além" },
  { id: "fixacao", nome: "Fixação", resumo: "Para praticar de novo" },
  { id: "pcd", nome: "PCD", resumo: "Versão adaptada" },
  { id: "caderno_professor", nome: "Caderno do professor", resumo: "Orientações e respostas" },
];

export type Folha = {
  id: string;
  tipo: TipoFolha;
  etapa: EtapaFolha;
  /** "1º" a "5º" no Fundamental 1. Na Educação Infantil, a faixa (ex.: "Pré I"). */
  ano: string;
  /** Disciplina (Fundamental 1) ou Campo de Experiência (Educação Infantil). */
  componente: string;
  /** Códigos da BNCC que a folha trabalha (ex.: "EF02MA05", "EI03EO01"). */
  habilidades: string[];
  titulo: string;
  pdf: string;
};

export type BuscaFolha = {
  etapa: EtapaFolha | null;
  ano?: string;
  componentes?: string[];
  habilidades?: string[];
};

/** Catálogo real das folhas. Vazio até os cadernos ficarem prontos. */
export const CATALOGO_FOLHAS: Folha[] = [];

const norm = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Descobre a etapa a partir do texto do ano ou da turma ("2º ano EF",
 * "Pré II", "Educação Infantil", "Pequenos (4 anos)"). Devolve null para
 * Fundamental 2, Médio e EJA, que não têm atividades em folha.
 */
export function etapaDoAno(texto: string): EtapaFolha | null {
  const t = norm(texto);
  if (!t) return null;
  if (/\bem\b|medio|serie|\beja\b/.test(t)) return null;
  if (
    /infantil|\(ei\)|creche|\bpre\b|pre-escola|bercario|maternal|jardim|bebes|bem pequenos|pequenos|maiores/.test(
      t,
    )
  )
    return "infantil";
  const m = /\b([1-9])\s*[ºo°]?/.exec(t);
  if (m && Number(m[1]) <= 5) return "fund1";
  return null;
}

/** Extrai códigos da BNCC de um texto livre ("EF02LP01, ef02lp03"). */
export function codigosBncc(texto: string): string[] {
  const achados = (texto || "").toUpperCase().match(/\b(?:EF|EI)\d{2}[A-Z]{2}\d{2}\b/g) ?? [];
  return [...new Set(achados)];
}

const numeroDoAno = (s: string) => /\b([1-9])\b/.exec(norm(s).replace(/[ºo°]/g, " "))?.[1] ?? "";

/**
 * Folhas que estão de acordo com a busca: mesma etapa, mesmo ano, mesmo
 * componente e, quando a professora informou a habilidade, mesma habilidade.
 * Critério não informado na busca não filtra.
 */
export function folhasDeAcordo(busca: BuscaFolha, catalogo: Folha[] = CATALOGO_FOLHAS): Folha[] {
  if (!busca.etapa) return [];
  const comps = (busca.componentes ?? []).map(norm).filter(Boolean);
  const habs = (busca.habilidades ?? []).map((h) => h.toUpperCase().trim()).filter(Boolean);
  const ano = busca.ano ? norm(busca.ano) : "";
  return catalogo.filter((f) => {
    if (f.etapa !== busca.etapa) return false;
    if (ano) {
      const igual =
        busca.etapa === "fund1"
          ? numeroDoAno(f.ano) === numeroDoAno(ano)
          : norm(f.ano) === ano || ano.includes(norm(f.ano)) || norm(f.ano).includes(ano);
      if (!igual) return false;
    }
    if (comps.length && !comps.includes(norm(f.componente))) return false;
    if (habs.length && !f.habilidades.some((h) => habs.includes(h.toUpperCase()))) return false;
    return true;
  });
}

/** Tipos de folha que têm ao menos uma folha de acordo com a busca. */
export function tiposDeAcordo(busca: BuscaFolha, catalogo: Folha[] = CATALOGO_FOLHAS): TipoFolha[] {
  const tipos = new Set(folhasDeAcordo(busca, catalogo).map((f) => f.tipo));
  return TIPOS_FOLHA.map((t) => t.id).filter((id) => tipos.has(id));
}
