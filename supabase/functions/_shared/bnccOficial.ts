// Habilidades oficiais da BNCC para as funções que geram planos.
//
// Dois usos:
//  1) listar as habilidades reais de um ano e componente, para a Sofia
//     escolher de uma lista em vez de lembrar o código de cabeça;
//  2) conferir o que a Sofia devolveu: código que não existe sai, código de
//     outro ano ou componente sai, e a descrição passa a ser o texto oficial
//     (assim código e texto sempre batem).
//
// Arquivo sem APIs do Deno, para poder ser testado também pelo vitest.

import { BNCC_EF, BNCC_EI } from "./bnccDados.ts";

export type Habilidade = { codigo: string; descricao: string };

const COMP_EF: Record<string, string> = {
  "lingua portuguesa": "lp",
  "portugues": "lp",
  "matematica": "mat",
  "ciencias": "cie",
  "historia": "his",
  "geografia": "geo",
  "arte": "arte",
  "artes": "arte",
  "educacao fisica": "ef",
  "ingles": "ing",
  "lingua inglesa": "ing",
  "ensino religioso": "rel",
};

const CAMPO_EI: Record<string, string> = {
  "o eu, o outro e o nos": "eo",
  "corpo, gestos e movimentos": "cg",
  "tracos, sons, cores e formas": "ts",
  "escuta, fala, pensamento e imaginacao": "ef",
  "espacos, tempos, quantidades, relacoes e transformacoes": "et",
};

function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function ehEducacaoInfantil(ano: string): boolean {
  return /infantil|creche|berc|bebe|maternal|\bpre\b|pre-?escola/.test(norm(ano));
}

/** Grupo etário da BNCC na Educação Infantil: 1 bebês, 2 bem pequenas, 3 pequenas. */
export function grupoEI(ano: string): 1 | 2 | 3 | null {
  const a = norm(ano);
  if (/berc|bebe|0\s*a\s*1/.test(a)) return 1;
  if (/maternal|bem pequen|1\s*a\s*3|creche/.test(a)) return 2;
  if (/pre|pequen|4\s*a\s*5|4 anos|5 anos/.test(a)) return 3;
  return null;
}

export function anoNumero(ano: string): number {
  // Ensino Médio e EJA ficam fora da conferência (sem ano do Fundamental).
  if (/medio|\bem\b|eja|serie/.test(norm(ano))) return 0;
  const m = (ano || "").match(/(\d+)/);
  const n = m ? parseInt(m[1], 10) : 0;
  return n >= 1 && n <= 9 ? n : 0;
}

function componentesEF(disciplinas: string[]): string[] {
  return disciplinas.map((d) => COMP_EF[norm(d)]).filter(Boolean);
}

function camposEI(disciplinas: string[]): string[] {
  return disciplinas.map((d) => CAMPO_EI[norm(d)]).filter(Boolean);
}

/** Texto oficial de um código da BNCC (Fundamental ou Infantil), ou null. */
export function textoOficial(codigo: string): string | null {
  const c = (codigo || "").trim().toUpperCase();
  return BNCC_EF[c]?.[0] ?? BNCC_EI[c]?.[0] ?? null;
}

/**
 * Habilidades oficiais para o ano e os componentes (ou campos de experiência).
 * Sem componente reconhecido, devolve as do ano inteiro. Limite para não
 * estourar o prompt (Língua Portuguesa tem muitas habilidades por ano).
 */
export function habilidadesDoAno(ano: string, disciplinas: string[], limite = 80): Habilidade[] {
  if (ehEducacaoInfantil(ano)) {
    const g = grupoEI(ano);
    const campos = camposEI(disciplinas);
    return Object.entries(BNCC_EI)
      .filter(([, [, grupo, campo]]) => (!g || grupo === g) && (!campos.length || campos.includes(campo)))
      .slice(0, limite)
      .map(([codigo, [descricao]]) => ({ codigo, descricao }));
  }
  const n = anoNumero(ano);
  if (!n) return [];
  const comps = componentesEF(disciplinas);
  return Object.entries(BNCC_EF)
    .filter(([, [, ini, fim, comp]]) => n >= ini && n <= fim && (!comps.length || comps.includes(comp)))
    .slice(0, limite)
    .map(([codigo, [descricao]]) => ({ codigo, descricao }));
}

/** Lista curta para o prompt: "EF03CI05: Descrever e comunicar ...". */
export function listaParaPrompt(habs: Habilidade[]): string {
  return habs.map((h) => `${h.codigo}: ${h.descricao}`).join("\n");
}

export type ResultadoConferencia = {
  habilidades: Habilidade[];
  removidas: Array<{ codigo: string; motivo: string }>;
};

/**
 * Confere as habilidades devolvidas pela Sofia.
 * - Código da BNCC que existe e cabe no ano/componente: fica, com o texto oficial.
 * - Código da BNCC que não existe, ou de outro ano/componente: sai.
 * - Com currículo municipal: código próprio da rede que está na lista fica, com
 *   o texto da rede; código da BNCC passa pela mesma conferência oficial;
 *   o resto sai.
 */
export function conferirHabilidades(
  habilidades: Array<{ codigo?: string; descricao?: string }> | undefined,
  ano: string,
  disciplinas: string[],
  municipal?: Array<{ codigo: string; descricao: string }> | null,
): ResultadoConferencia {
  const lista = Array.isArray(habilidades) ? habilidades : [];
  const out: Habilidade[] = [];
  const removidas: ResultadoConferencia["removidas"] = [];
  const vistos = new Set<string>();

  const mapaMunicipal = new Map<string, string>();
  for (const h of municipal || []) {
    if (h?.codigo) mapaMunicipal.set(h.codigo.trim().toUpperCase(), h.descricao || "");
  }

  const ei = ehEducacaoInfantil(ano);
  const g = ei ? grupoEI(ano) : null;
  const n = ei ? 0 : anoNumero(ano);
  const comps = componentesEF(disciplinas);
  const campos = camposEI(disciplinas);

  // Etapa sem conferência oficial aqui (Ensino Médio, EJA, ano não informado):
  // devolve como veio, só sem repetidos.
  if (!ei && !n) {
    for (const h of lista) {
      const cod = (h?.codigo || "").trim();
      if (!cod || vistos.has(cod.toUpperCase())) continue;
      vistos.add(cod.toUpperCase());
      out.push({ codigo: cod, descricao: textoOficial(cod) ?? h.descricao ?? "" });
    }
    return { habilidades: out, removidas };
  }

  for (const h of lista) {
    const original = (h?.codigo || "").trim();
    const cod = original.toUpperCase();
    if (!cod || vistos.has(cod)) continue;

    const ef = BNCC_EF[cod];
    const eiItem = BNCC_EI[cod];

    // Código próprio da rede (que não é código da BNCC): fica com o texto da rede.
    // Código da BNCC segue a conferência oficial abaixo, mesmo com currículo
    // municipal, para que código e texto nunca fiquem trocados.
    if (!ef && !eiItem && mapaMunicipal.has(cod)) {
      vistos.add(cod);
      out.push({ codigo: original, descricao: mapaMunicipal.get(cod) || h.descricao || "" });
      continue;
    }
    if (!ef && !eiItem) {
      removidas.push({ codigo: cod, motivo: "código não existe na BNCC" + (municipal?.length ? " nem no currículo da rede" : "") });
      continue;
    }
    if (ef) {
      const [texto, ini, fim, comp] = ef;
      if (ei) { removidas.push({ codigo: cod, motivo: "habilidade do Fundamental num plano da Educação Infantil" }); continue; }
      if (n && (n < ini || n > fim)) { removidas.push({ codigo: cod, motivo: `habilidade de outro ano (${ini}º a ${fim}º)` }); continue; }
      if (comps.length && !comps.includes(comp)) { removidas.push({ codigo: cod, motivo: "habilidade de outro componente" }); continue; }
      vistos.add(cod);
      out.push({ codigo: cod, descricao: texto });
      continue;
    }
    const [texto, grupo, campo] = eiItem!;
    if (!ei && n) { removidas.push({ codigo: cod, motivo: "objetivo da Educação Infantil num plano do Fundamental" }); continue; }
    if (g && grupo !== g) { removidas.push({ codigo: cod, motivo: "objetivo de outro grupo etário" }); continue; }
    if (campos.length && !campos.includes(campo)) { removidas.push({ codigo: cod, motivo: "objetivo de outro campo de experiência" }); continue; }
    vistos.add(cod);
    out.push({ codigo: cod, descricao: texto });
  }
  return { habilidades: out, removidas };
}
