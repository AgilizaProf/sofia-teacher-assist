// Compara o que a criança leu com o cartão e sugere o nível de leitura.
// Tudo aqui é conta simples, sem IA: a IA só transcreve o áudio.
import type { Cartao, Marca, NivelLeitura, TipoCartao } from "./tipos";
import { METAS_PADRAO } from "./tipos";

/** Minúsculas, sem acento e sem pontuação: "Pássaro," → "passaro". */
export function normalizar(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

export function palavrasDe(texto: string): string[] {
  return (texto || "")
    .split(/[\s—–]+/)
    .map((p) => p.trim())
    .filter((p) => normalizar(p).length > 0);
}

/** O que a criança tem para ler, item por item (sílaba ou palavra). */
export function alvosDoCartao(c: Pick<Cartao, "tipo" | "itens" | "texto">): string[] {
  if (c.tipo === "texto") return palavrasDe(c.texto || "");
  if (c.tipo === "frases") return c.itens.flatMap((f) => palavrasDe(f));
  return c.itens.slice();
}

export type ItemAlinhado = { alvo: string; marca: Marca; dito?: string };

/**
 * Alinha os alvos com o que foi dito (distância de edição por palavra).
 * - "ok": leu certo; "troca": disse outra coisa no lugar; "pulou": não leu,
 *   mas continuou depois; "nao": não chegou até ali.
 */
export function alinhar(alvos: string[], ditoBruto: string[]): ItemAlinhado[] {
  const a = alvos.map(normalizar);
  const dito = ditoBruto.filter((d) => normalizar(d).length > 0);
  const b = dito.map(normalizar);
  const n = a.length;
  const m = b.length;
  if (n === 0) return [];
  if (m === 0) return alvos.map((alvo) => ({ alvo, marca: "nao" as Marca }));

  // dp[i][j] = menor custo para alinhar a[0..i) com b[0..j)
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) dp[i][0] = i;
  for (let j = 1; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const igual = a[i - 1] === b[j - 1];
      dp[i][j] = Math.min(
        dp[i - 1][j - 1] + (igual ? 0 : 1),
        dp[i - 1][j] + 1, // pulou o alvo
        dp[i][j - 1] + 1, // disse algo a mais (repetição, "é...", autocorreção)
      );
    }
  }
  const out: ItemAlinhado[] = new Array(n);
  let i = n;
  let j = m;
  while (i > 0) {
    if (j > 0 && a[i - 1] === b[j - 1] && dp[i][j] === dp[i - 1][j - 1]) {
      out[i - 1] = { alvo: alvos[i - 1], marca: "ok" };
      i--;
      j--;
    } else if (j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      out[i - 1] = { alvo: alvos[i - 1], marca: "troca", dito: dito[j - 1] };
      i--;
      j--;
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      j--; // palavra a mais: ignora
    } else {
      out[i - 1] = { alvo: alvos[i - 1], marca: "pulou" };
      i--;
    }
  }
  // Tudo depois do último item lido conta como "não chegou", não como "pulou".
  let ultimo = -1;
  for (let k = n - 1; k >= 0; k--) {
    if (out[k].marca === "ok" || out[k].marca === "troca") {
      ultimo = k;
      break;
    }
  }
  for (let k = ultimo + 1; k < n; k++) out[k] = { alvo: alvos[k], marca: "nao" };
  return out;
}

export type ResumoLeitura = {
  total: number;
  lidas: number;
  corretas: number;
  precisao: number;
  pcpm: number;
};

export function resumir(marcas: Marca[], segundos: number): ResumoLeitura {
  const total = marcas.length;
  let ultimo = -1;
  marcas.forEach((m, k) => {
    if (m === "ok" || m === "troca") ultimo = k;
  });
  const lidas = ultimo + 1;
  const corretas = marcas.filter((m) => m === "ok").length;
  const precisao = lidas > 0 ? corretas / lidas : 0;
  const seg = Math.max(5, segundos || 60);
  const pcpm = Math.round((corretas / seg) * 60);
  return { total, lidas, corretas, precisao, pcpm };
}

/** "3º ano B" → "3". Sem ano reconhecido → "". */
export function anoDe(texto: string | null | undefined): string {
  const m = /([1-9])\s*(?:º|°|o|ª)?\s*ano/i.exec(texto || "");
  return m ? m[1] : "";
}

export function metaFluencia(ano: string, metas?: Record<string, number>): number {
  const t = { ...METAS_PADRAO, ...(metas || {}) };
  return Number(t[ano]) || Number(t["2"]) || 60;
}

/**
 * Nível sugerido a partir de UMA leitura. A professora confirma ou corrige.
 * A regra olha quanto do cartão a criança leu certo e, nos textos, o ritmo.
 */
export function sugerirNivel(
  tipo: TipoCartao,
  r: ResumoLeitura,
  meta: number,
): { nivel: NivelLeitura; porque: string } {
  const doCartao = r.total > 0 ? r.corretas / r.total : 0;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  if (tipo === "silabas") {
    if (doCartao < 0.3)
      return { nivel: 1, porque: `Leu certo ${pct(doCartao)} das sílabas do cartão.` };
    return {
      nivel: 2,
      porque:
        doCartao >= 0.8
          ? `Leu certo ${pct(doCartao)} das sílabas. Vale tentar um cartão de palavras.`
          : `Leu certo ${pct(doCartao)} das sílabas do cartão.`,
    };
  }
  if (tipo === "palavras") {
    if (r.corretas === 0) return { nivel: 1, porque: "Não leu nenhuma palavra do cartão." };
    if (doCartao < 0.5)
      return { nivel: 2, porque: `Leu certo ${pct(doCartao)} das palavras do cartão.` };
    return {
      nivel: 3,
      porque:
        doCartao >= 0.85
          ? `Leu certo ${pct(doCartao)} das palavras. Vale tentar um cartão de frases.`
          : `Leu certo ${pct(doCartao)} das palavras do cartão.`,
    };
  }
  if (tipo === "frases") {
    if (doCartao < 0.3)
      return { nivel: 2, porque: `Leu certo só ${pct(doCartao)} das palavras das frases.` };
    if (doCartao < 0.7)
      return { nivel: 3, porque: `Leu certo ${pct(doCartao)} das palavras das frases.` };
    return {
      nivel: 4,
      porque:
        doCartao >= 0.9
          ? `Leu certo ${pct(doCartao)} das frases. Vale tentar um texto curto.`
          : `Leu certo ${pct(doCartao)} das palavras das frases.`,
    };
  }
  // texto
  if (r.lidas < 5 || r.precisao < 0.5)
    return { nivel: 3, porque: "Leu poucas palavras do texto. Vale voltar aos cartões de frases." };
  if (r.precisao < 0.8)
    return {
      nivel: 4,
      porque: `Leu ${r.pcpm} palavras certas por minuto, com ${pct(r.precisao)} de acerto.`,
    };
  if (r.precisao >= 0.95 && r.pcpm >= meta)
    return {
      nivel: 6,
      porque: `Leu ${r.pcpm} palavras certas por minuto (meta do ano: ${meta}), com ${pct(r.precisao)} de acerto.`,
    };
  return {
    nivel: 5,
    porque: `Leu ${r.pcpm} palavras certas por minuto (meta do ano: ${meta}), com ${pct(r.precisao)} de acerto.`,
  };
}

/** Qual nível de cartão combina com o nível de leitura da criança. */
export function nivelCartaoPara(nivel: NivelLeitura | null | undefined): 1 | 2 | 3 | 4 | 5 | 6 {
  switch (nivel) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 3:
      return 4;
    case 4:
      return 5;
    case 5:
    case 6:
      return 6;
    default:
      return 2;
  }
}
