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
  // Travessão (— e –) usado como separador → vírgula.
  // Só substitui quando há espaço de pelo menos um lado, preservando
  // intervalos colados como "5–6 anos" e códigos como "EM15-LP01".
  [/\s+[—–]\s*/g, ", "],
  [/\s*[—–]\s+/g, ", "],
  // Hífen entre espaços usado como separador → vírgula (preserva hífen
  // de palavras compostas como "socioemocional-afetivo" e códigos).
  [/\s+-\s+/g, ", "],
  // Aspas tipográficas e angulares → aspas simples
  [/[«»“”„]/g, '"'],
  [/[‘’‚‛]/g, "'"],
  // Barra "/" entre palavras → " ou ". Preserva datas (27/05/2026),
  // frações ("3/4"), códigos ("EM15LP01/02") e siglas coladas: só
  // converte quando há espaço de pelo menos um lado.
  [/\s+\/\s*/g, " ou "],
  [/\s*\/\s+/g, " ou "],
  // Contrabarra "\" entre tokens → espaço (preserva quando colada).
  [/\s+\\\s*/g, " "],
  [/\s*\\\s+/g, " "],
  // Sinais decorativos remanescentes (asteriscos, pipes, colchetes,
  // chaves, sustenido, sinais de maior/menor). NÃO remove "@" para
  // não destruir e-mails e menções legítimas.
  [/[<>{}|#*]/g, ""],
  [/\[([^\]]*)\]/g, "$1"],
  // Underscores só viram espaço quando estão soltos (entre espaços ou
  // pontuação). Preserva identificadores como "PEI_2024" ou "ano_1".
  [/(?<=\s)_+(?=\s)/g, " "],
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