// Sanitizador de texto para saídas da Sofia (pareceres e relatórios).
// Garante que o texto gerado siga as regras de pontuação e escrita do prompt,
// mesmo quando o modelo "escapa" e devolve markdown, travessões, asteriscos,
// bullets ou outros símbolos tipográficos proibidos.

const SUBSTITUICOES_DIRETAS: Array<[RegExp, string]> = [
  // Markdown de ênfase: **texto**, __texto__, *texto*, _texto_
  [/\*\*\*(.+?)\*\*\*/g, "$1"],
  [/\*\*(.+?)\*\*/g, "$1"],
  [/__(.+?)__/g, "$1"],
  [/(^|[\s(])\*(?!\s)([^*\n]+?)\*(?=[\s.,;:!?)]|$)/g, "$1$2"],
  [/(^|[\s(])_(?!\s)([^_\n]+?)_(?=[\s.,;:!?)]|$)/g, "$1$2"],
  // Cabeçalhos markdown no início da linha
  [/^\s{0,3}#{1,6}\s+/gm, ""],
  // Citações
  [/^\s{0,3}>\s?/gm, ""],
  // Code spans `texto`
  [/`([^`\n]+?)`/g, "$1"],
  // Bullets com -, *, • no começo da linha viram parágrafo
  [/^[ \t]*[-*•]\s+/gm, ""],
  // Listas numeradas "1. " no começo da linha
  [/^[ \t]*\d+\.\s+/gm, ""],
];

const SIMBOLOS_PROIBIDOS: Array<[RegExp, string]> = [
  // Travessão (— e –) usado como separador → vírgula
  [/\s*[—–]\s*/g, ", "],
  // Hífen entre espaços usado como separador → vírgula
  [/\s+-\s+/g, ", "],
  // Aspas tipográficas e angulares → aspas simples
  [/[«»“”„]/g, '"'],
  [/[‘’‚‛]/g, "'"],
  // Barras / e \ entre palavras → " ou "
  [/\s*\/\s*/g, " ou "],
  [/\s*\\\s*/g, " "],
  // Sinais de maior/menor, colchetes, chaves, pipes, arroba, sustenido,
  // asteriscos remanescentes, underscores soltos.
  [/[<>{}|@#*]/g, ""],
  [/\[([^\]]*)\]/g, "$1"],
  [/(?<=\s)_+(?=\s)/g, ""],
  [/_+/g, " "],
];

function limparTexto(s: string): string {
  let out = s;
  for (const [re, rep] of SUBSTITUICOES_DIRETAS) out = out.replace(re, rep);
  for (const [re, rep] of SIMBOLOS_PROIBIDOS) out = out.replace(re, rep);
  // Normaliza espaços e pontuação
  out = out
    .replace(/[ \t]+/g, " ")
    .replace(/ ?, ?,/g, ",")
    .replace(/ +([.,;:!?])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
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