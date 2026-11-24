// Catálogo real dos Cadernos AgilizaProf (PDFs do Drive "Atividades
// AgilizaProf > Cadernos"). O índice ficha por ficha (título, habilidades da
// BNCC e página de cada PDF) está em catalogo.json, gerado lendo os próprios
// PDFs. Os arquivos ficam no Storage, no bucket privado "cadernos", com o
// mesmo nome do arquivo no Drive. Quem envia é o admin, em /admin/cadernos.
//
// O JSON é carregado sob demanda (import dinâmico) para não pesar nas outras
// telas. A busca roda no aparelho, sem IA e sem gastar créditos.

import { supabase } from "@/integrations/supabase/client";
import { codigosBncc, type EtapaFolha, type TipoFolha } from "@/lib/cadernos/folhas";

export const CADERNOS_BUCKET = "cadernos";

/** Liberação para as professoras: 13/03/2027, 00h de Brasília. Admin vê antes. */
export const CADERNOS_LIBERA_ISO = "2027-03-13T00:00:00-03:00";
export function cadernosLiberados(agora: Date = new Date()): boolean {
  return agora.getTime() >= new Date(CADERNOS_LIBERA_ISO).getTime();
}

export type TipoCaderno = TipoFolha | "jogos";

export const NOME_TIPO: Record<TipoCaderno, string> = {
  atividades: "Atividades",
  conceito: "Conceitos",
  fixacao: "Fixação",
  aprofundamento: "Aprofundamento",
  pcd: "Adaptado (PCD)",
  caderno_professor: "Caderno do professor",
  jogos: "Jogos",
};

export const ORDEM_TIPO: TipoCaderno[] = [
  "atividades",
  "conceito",
  "fixacao",
  "aprofundamento",
  "pcd",
  "caderno_professor",
  "jogos",
];

/** Uma ficha dentro de um PDF. Nomes curtos para o JSON ficar leve. */
export type FichaCatalogo = {
  /** Número da ficha (o mesmo em todos os cadernos do ano e disciplina). */
  n: number;
  /** Título. */
  t: string;
  /** Códigos da BNCC. */
  h: string[];
  /** Página do PDF onde a ficha começa (null quando não deu para ler). */
  p: number | null;
  /** Quantas páginas a ficha ocupa, quando é mais de uma. */
  np?: number;
  /** Tema (Temas do ano, Educação Infantil). */
  tema?: string;
};

export type CadernoCatalogo = {
  arquivo: string;
  etapa: EtapaFolha;
  componente: string;
  ano: string;
  tipo: TipoCaderno;
  tema?: string;
  paginas: number | null;
  tamanho: number;
  fichas: FichaCatalogo[];
};

export type Catalogo = {
  versao: string;
  cadernos: CadernoCatalogo[];
  /** Texto oficial de cada código da BNCC usado nos cadernos. */
  bncc: Record<string, string>;
};

let cache: Promise<Catalogo> | null = null;
export function carregarCatalogo(): Promise<Catalogo> {
  if (!cache) {
    cache = import("./catalogo.json").then((m) => (m.default ?? m) as unknown as Catalogo);
    cache.catch(() => {
      cache = null;
    });
  }
  return cache;
}

/** Nome do caderno para mostrar: "Matemática · 3º ano · Fixação". */
export function nomeCaderno(c: CadernoCatalogo): string {
  if (c.tipo === "jogos") return "Caderno de Jogos";
  if (c.etapa === "infantil")
    return c.tema ? `Educação Infantil · ${c.tema}` : "Educação Infantil · Atividades";
  return `${c.componente} · ${c.ano} · ${NOME_TIPO[c.tipo]}`;
}

export const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// ---------------------------------------------------------------------------
// Atividade = uma ficha (mesmo número, ano e disciplina) com todos os PDFs
// onde ela aparece: atividades, conceitos, fixação, aprofundamento, PCD e
// caderno do professor.

export type PdfDaFicha = {
  tipo: TipoCaderno;
  arquivo: string;
  pagina: number | null;
  paginas: number;
};

export type Atividade = {
  chave: string;
  etapa: EtapaFolha;
  ano: string;
  componente: string;
  n: number;
  titulo: string;
  tema?: string;
  habilidades: string[];
  pdfs: PdfDaFicha[];
};

function chaveGrupo(c: CadernoCatalogo): string {
  if (c.etapa === "infantil" || c.tipo === "jogos") return c.arquivo;
  return `${c.etapa}|${c.ano}|${c.componente}`;
}

const atividadesCache = new WeakMap<Catalogo, Atividade[]>();
export function atividadesDoCatalogo(cat: Catalogo): Atividade[] {
  const pronto = atividadesCache.get(cat);
  if (pronto) return pronto;
  const mapa = new Map<string, Atividade>();
  for (const c of cat.cadernos) {
    for (const f of c.fichas) {
      const chave = `${chaveGrupo(c)}#${f.n}`;
      let a = mapa.get(chave);
      if (!a) {
        a = {
          chave,
          etapa: c.etapa,
          ano: c.ano,
          componente: c.componente,
          n: f.n,
          titulo: f.t,
          tema: f.tema ?? c.tema,
          habilidades: [],
          pdfs: [],
        };
        mapa.set(chave, a);
      }
      // O título do caderno de atividades manda; os outros só completam.
      if (c.tipo === "atividades" && f.t) a.titulo = f.t;
      if (!a.tema && f.tema) a.tema = f.tema;
      for (const h of f.h) if (!a.habilidades.includes(h)) a.habilidades.push(h);
      a.pdfs.push({ tipo: c.tipo, arquivo: c.arquivo, pagina: f.p, paginas: f.np ?? 1 });
    }
  }
  const lista = [...mapa.values()];
  for (const a of lista)
    a.pdfs.sort((x, y) => ORDEM_TIPO.indexOf(x.tipo) - ORDEM_TIPO.indexOf(y.tipo));
  atividadesCache.set(cat, lista);
  return lista;
}

// ---------------------------------------------------------------------------
// Busca

export type FiltrosBusca = {
  etapa?: EtapaFolha | null;
  /** "3º ano", "Educação Infantil"... */
  ano?: string;
  componente?: string;
};

const PALAVRAS_VAZIAS = new Set([
  "a",
  "o",
  "as",
  "os",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "um",
  "uma",
  "para",
  "com",
  "por",
  "que",
  "ano",
  "anos",
  "caderno",
  "cadernos",
  "atividade",
  "atividades",
  "ficha",
  "fichas",
  "pdf",
]);

const COMPONENTES_SINONIMOS: Record<string, string> = {
  matematica: "Matemática",
  mat: "Matemática",
  portugues: "Língua Portuguesa",
  "lingua portuguesa": "Língua Portuguesa",
  lp: "Língua Portuguesa",
  ciencias: "Ciências",
  historia: "História",
  geografia: "Geografia",
  jogos: "Jogos",
  jogo: "Jogos",
};

/** Lê "3º ano", "3 ano", "terceiro ano" e "educação infantil" de um texto. */
function anoDoTexto(q: string): string | null {
  const t = norm(q);
  if (/infantil|\bei\b|creche|pre-escola|\bpre\b/.test(t)) return "Educação Infantil";
  const m = /\b([1-5])\s*[ºo°]?\s*ano\b/.exec(t);
  if (m) return `${m[1]}º ano`;
  const ext: Record<string, string> = {
    primeiro: "1",
    segundo: "2",
    terceiro: "3",
    quarto: "4",
    quinto: "5",
  };
  const e = /\b(primeiro|segundo|terceiro|quarto|quinto)\s+ano\b/.exec(t);
  return e ? `${ext[e[1]]}º ano` : null;
}

function componenteDoTexto(q: string): string | null {
  const t = ` ${norm(q)} `;
  for (const [k, v] of Object.entries(COMPONENTES_SINONIMOS)) {
    if (t.includes(` ${k} `)) return v;
  }
  return null;
}

/** Singular simples: frações → fracao, animais → animal, sons → son. */
function raiz(p: string): string {
  if (p.length <= 3) return p;
  return p
    .replace(/(oes|aes)$/, "ao")
    .replace(/ais$/, "al")
    .replace(/eis$/, "el")
    .replace(/s$/, "");
}

const raizesCache = new Map<string, string[]>();
function raizes(texto: string): string[] {
  let r = raizesCache.get(texto);
  if (!r) {
    r = norm(texto)
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .map(raiz);
    raizesCache.set(texto, r);
  }
  return r;
}

/** A palavra buscada bate com o começo de alguma palavra do texto. */
const temTermo = (palavrasTexto: string[], termo: string) =>
  palavrasTexto.some((w) => w.startsWith(termo));

export type ResultadoBusca = {
  atividades: Atividade[];
  cadernos: CadernoCatalogo[];
  /** O que a busca entendeu do texto digitado. */
  entendido: {
    ano: string | null;
    componente: string | null;
    codigos: string[];
    palavras: string[];
  };
};

/**
 * Busca por disciplina, ano, código da BNCC ou assunto ("frações",
 * "EF03MA09", "matemática 4º ano", "ciclo da água"). Todas as palavras
 * precisam aparecer (no título, no tema ou no texto oficial da habilidade).
 */
export function buscarNoCatalogo(
  cat: Catalogo,
  texto: string,
  filtros: FiltrosBusca = {},
): ResultadoBusca {
  const codigos = codigosBncc(texto);
  const ano = filtros.ano || anoDoTexto(texto);
  const componente = filtros.componente || componenteDoTexto(texto);

  let resto = norm(texto)
    .replace(/\b(?:ef|ei)\d{2}[a-z]{2}\d{2}\b/g, " ")
    .replace(/\b[1-5]\s*[ºo°]?\s*ano\b|\b(primeiro|segundo|terceiro|quarto|quinto)\s+ano\b/g, " ")
    .replace(/educacao infantil/g, " ");
  if (componente) {
    for (const [k, v] of Object.entries(COMPONENTES_SINONIMOS)) {
      if (v === componente) resto = ` ${resto} `.replace(new RegExp(` ${k} `, "g"), " ");
    }
  }
  const palavras = resto.split(/[^a-z0-9]+/).filter((p) => p.length > 1 && !PALAVRAS_VAZIAS.has(p));

  const passaFiltro = (etapa: EtapaFolha, a: string, comp: string) => {
    if (filtros.etapa && etapa !== filtros.etapa) return false;
    if (ano && a !== ano && !(ano !== "Educação Infantil" && comp === "Jogos")) return false;
    if (componente && comp !== componente) return false;
    return true;
  };

  const termos = palavras.map(raiz);

  const atividades: Array<{ a: Atividade; pontos: number }> = [];
  for (const a of atividadesDoCatalogo(cat)) {
    if (!passaFiltro(a.etapa, a.ano, a.componente)) continue;
    let pontos = 0;
    if (codigos.length) {
      const bate = a.habilidades.filter((h) => codigos.includes(h)).length;
      if (!bate) continue;
      pontos += 10 * bate;
    }
    if (termos.length) {
      const tit = raizes(a.titulo);
      const tema = raizes(a.tema ?? "");
      const desc = raizes(a.habilidades.map((h) => cat.bncc[h] ?? "").join(" "));
      let todas = true;
      for (const t of termos) {
        if (temTermo(tit, t)) pontos += 5;
        else if (temTermo(tema, t)) pontos += 3;
        else if (temTermo(desc, t)) pontos += 1;
        else {
          todas = false;
          break;
        }
      }
      if (!todas) continue;
    }
    if (!codigos.length && !termos.length && !ano && !componente) continue;
    atividades.push({ a, pontos });
  }
  atividades.sort(
    (x, y) =>
      y.pontos - x.pontos ||
      Number(x.a.componente === "Jogos") - Number(y.a.componente === "Jogos") ||
      x.a.ano.localeCompare(y.a.ano) ||
      x.a.componente.localeCompare(y.a.componente) ||
      x.a.n - y.a.n,
  );

  // Cadernos inteiros: quando a busca é por disciplina/ano/tema, ou quando
  // algum caderno tem fichas encontradas.
  const comFicha = new Set(atividades.flatMap((x) => x.a.pdfs.map((p) => p.arquivo)));
  const cadernos = cat.cadernos.filter((c) => {
    if (!passaFiltro(c.etapa, c.ano, c.componente)) return false;
    if (comFicha.has(c.arquivo)) return true;
    if (!codigos.length && !termos.length) return !!(ano || componente);
    if (c.tema && termos.length && termos.every((t) => temTermo(raizes(c.tema ?? ""), t)))
      return true;
    return false;
  });

  return {
    atividades: atividades.map((x) => x.a),
    cadernos,
    entendido: { ano, componente, codigos, palavras },
  };
}

// ---------------------------------------------------------------------------
// Sugestão para o Planejamento (bloco "Atividades em folha")

const CAMPOS_EI: Array<[string, string]> = [
  ["o eu", "EO"],
  ["corpo", "CG"],
  ["tracos", "TS"],
  ["escuta", "EF"],
  ["espacos", "ET"],
];

export function atividadesParaPlano(
  cat: Catalogo,
  busca: { etapa: EtapaFolha | null; ano?: string; componentes?: string[]; habilidades?: string[] },
): Atividade[] {
  if (!busca.etapa) return [];
  const anoNum = /\b([1-5])\b/.exec(norm(busca.ano ?? "").replace(/[ºo°]/g, " "))?.[1];
  const comps = (busca.componentes ?? []).map((c) => COMPONENTES_SINONIMOS[norm(c)] ?? c).map(norm);
  const habs = (busca.habilidades ?? []).map((h) => h.toUpperCase().trim()).filter(Boolean);
  if (busca.etapa === "infantil") {
    // Na Educação Infantil o filtro é o campo de experiência (EO, CG, TS, EF, ET).
    const siglas = comps.map((c) => CAMPOS_EI.find(([k]) => c.startsWith(k))?.[1]).filter(Boolean);
    return atividadesDoCatalogo(cat).filter((a) => {
      if (a.etapa !== "infantil") return false;
      if (habs.length) return a.habilidades.some((h) => habs.includes(h));
      if (siglas.length) return a.habilidades.some((h) => siglas.includes(h.slice(4, 6)));
      return true;
    });
  }
  return atividadesDoCatalogo(cat).filter((a) => {
    if (a.etapa !== busca.etapa || a.componente === "Jogos") return false;
    if (busca.etapa === "fund1" && anoNum && !a.ano.startsWith(`${anoNum}º`)) return false;
    if (habs.length) return a.habilidades.some((h) => habs.includes(h));
    if (comps.length && !comps.includes(norm(a.componente))) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Abrir o PDF (link temporário do Storage, já na página da ficha)

export async function urlDoPdf(arquivo: string, pagina?: number | null): Promise<string> {
  const { data, error } = await supabase.storage
    .from(CADERNOS_BUCKET)
    .createSignedUrl(arquivo, 60 * 60);
  if (error || !data?.signedUrl) throw new Error(error?.message || "Não foi possível abrir o PDF.");
  return pagina ? `${data.signedUrl}#page=${pagina}` : data.signedUrl;
}

/** Abre o PDF numa aba nova. A aba abre antes do pedido para o navegador não bloquear. */
export async function abrirPdf(arquivo: string, pagina?: number | null): Promise<void> {
  const aba = typeof window !== "undefined" ? window.open("", "_blank") : null;
  try {
    const url = await urlDoPdf(arquivo, pagina);
    if (aba) aba.location.href = url;
    else window.location.href = url;
  } catch (e) {
    aba?.close();
    throw e;
  }
}
