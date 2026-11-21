// Sanitizador de texto para saídas da Sofia (pareceres e relatórios).
// Garante que o texto gerado siga as regras de pontuação e escrita do prompt,
// mesmo quando o modelo "escapa" e devolve markdown, travessões, asteriscos,
// bullets ou outros símbolos tipográficos proibidos.

// Regra geral: só tira MARCAÇÃO (Markdown, HTML, travessão de separação).
// Nunca mexe em contas, comparações, porcentagens, datas, frações e códigos:
// "7 > 5", "8 - 3 = 5", "(< 50%)", "1/2", "27/05/2026", "EF02LP01 / EF02MA01"
// e "LP / MA" chegam à professora como a IA escreveu.

const SUBSTITUICOES_DIRETAS: Array<[RegExp, string]> = [
  // Markdown de ênfase: **texto**, __texto__, *texto*, _texto_
  [/\*\*\*(\S(?:.*?\S)?)\*\*\*/g, "$1"],
  [/\*\*(\S(?:.*?\S)?)\*\*/g, "$1"],
  [/__(\S(?:.*?\S)?)__/g, "$1"],
  [/(^|[\s(])\*(?![\s\d])([^*\n]+?)\*(?=[\s.,;:!?)]|$)/g, "$1$2"],
  [/(^|[\s(])_(?!\s)([^_\n]+?)_(?=[\s.,;:!?)]|$)/g, "$1$2"],
  // Cabeçalhos markdown no início da linha
  [/^\s{0,3}#{1,6}\s+/gm, ""],
  // Citações ("> texto" no início da linha, mas não "> 5")
  [/^\s{0,3}>\s?(?!\s*\d)/gm, ""],
  // Code spans `texto`
  [/`([^`\n]+?)`/g, "$1"],
  // Tags HTML (<b>, </p>, <br/>)
  [/<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s[^<>]*)?\/?>/g, ""],
  // Bullets com -, *, • no começo da linha viram parágrafo (não "-3" nem "- 3")
  [/^[ \t]*[-*•][ \t]+(?!\d)/gm, ""],
];

/** Lista numerada de verdade: duas ou mais linhas seguidas começando com "1. ", "2. "… */
function semListaNumerada(s: string): string {
  return s.replace(/(?:^[ \t]*\d{1,2}[.)][ \t]+\S.*(?:\n|$)){2,}/gm, (bloco) =>
    bloco.replace(/^[ \t]*\d{1,2}[.)][ \t]+/gm, ""),
  );
}

const DIGITO_ANTES = /\d\s*$/;
const DIGITO_DEPOIS = /^\s*[\d(]/;

/** Troca `re` por `rep` só quando NÃO está entre números (conta, intervalo). */
function foraDeConta(s: string, re: RegExp, rep: string): string {
  return s.replace(re, (m: string, ...args: unknown[]) => {
    const off = args[args.length - 2] as number;
    const str = args[args.length - 1] as string;
    const antes = str.slice(Math.max(0, off - 3), off);
    const depois = str.slice(off + m.length, off + m.length + 3);
    if (DIGITO_ANTES.test(antes) && DIGITO_DEPOIS.test(depois)) return m;
    return rep;
  });
}

function limparSimbolos(s: string): string {
  let out = s;
  // Travessão (— e –) usado como separador → vírgula. Preserva intervalos e
  // contas entre números ("5 – 6 anos", "8 – 3") e palavras coladas.
  out = foraDeConta(out, /[ \t]+[—–][ \t]*|[ \t]*[—–][ \t]+/g, ", ");
  // Hífen entre espaços usado como separador → vírgula. "8 - 3 = 5" fica.
  out = foraDeConta(out, /[ \t]+-[ \t]+/g, ", ");
  // Aspas tipográficas e angulares → aspas retas
  out = out.replace(/[«»“”„]/g, '"').replace(/[‘’‚‛]/g, "'");
  // Contrabarra solta entre tokens → espaço (preserva quando colada).
  out = out.replace(/\s+\\\s*/g, " ").replace(/\s*\\\s+/g, " ");
  // Asterisco de multiplicação entre números vira ×; o resto sai.
  out = out.replace(/(\d)[ \t]*\*[ \t]*(?=\d)/g, "$1 × ");
  out = out.replace(/\*/g, "");
  // < e > ficam quando comparam números ("7 > 5", "(< 50%)", "x < 3").
  out = out.replace(/[<>]/g, (m: string, off: number, str: string) => {
    const antes = str.slice(Math.max(0, off - 3), off);
    const depois = str.slice(off + 1, off + 5);
    if (/^\s*=?\s*[\d(-]/.test(depois) || /\d\s*$/.test(antes)) return m;
    return "";
  });
  // Pipes de tabela e chaves saem. "#" só sai quando não é número ("nº #3").
  out = out.replace(/[{}|]/g, "").replace(/#(?!\d)/g, "");
  // [texto] → texto (colchetes de marcação)
  out = out.replace(/\[([^\]]*)\]/g, "$1");
  // Underscores soltos viram espaço. Preserva "PEI_2024" ou "ano_1".
  out = out.replace(/(?<=\s)_+(?=\s)/g, " ");
  return out;
}

function limparTexto(s: string): string {
  let out = s.replace(/\r\n?/g, "\n");
  for (const [re, rep] of SUBSTITUICOES_DIRETAS) out = out.replace(re, rep);
  out = semListaNumerada(out);
  out = limparSimbolos(out);
  // Normaliza espaços e pontuação
  out = out
    .replace(/[ \t]+/g, " ")
    .replace(/(?:\s*,\s*){2,}/g, ", ")
    .replace(/,\s*([.;:!?])/g, "$1")
    .replace(/ +([.,;:!?])(?!\d)/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return out;
}

export function sanitizarTextoSofia(valor: unknown): unknown {
  if (typeof valor === "string") return limparTexto(valor);
  if (Array.isArray(valor)) return valor.map((v) => sanitizarTextoSofia(v));
  if (valor && typeof valor === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      out[k] = sanitizarTextoSofia(v);
    }
    return out;
  }
  return valor;
}
