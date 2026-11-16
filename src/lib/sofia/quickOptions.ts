// Helpers para o bloco [OPÇÕES]...[/OPÇÕES] que a Sofia anexa no fim das
// respostas quando faz uma pergunta com respostas previsíveis. O bloco é
// invisível ao usuário; apenas serve para o app renderizar botões de
// resposta rápida (chips) abaixo da mensagem.
//
// O modelo nem sempre segue o formato à risca. Aceitamos:
//   - opções com "-", "•", "*", "+", "1." ou "1)";
//   - tags e opções em negrito ("**[OPÇÕES]**", "**Infantil**");
//   - bloco dentro de crase tripla (o bloco de código vazio some);
//   - bloco sem "[/OPÇÕES]" quando a resposta já terminou (ex.: cortada).

import { semLatex } from "./mathText";

const TAG_ABRE = String.raw`(?:\*\*|__|\*|_)?\[\s*OP[ÇC][ÕO]ES\s*\](?:\*\*|__|\*|_)?`;
const TAG_FECHA = String.raw`(?:\*\*|__|\*|_)?\[\s*\/\s*OP[ÇC][ÕO]ES\s*\](?:\*\*|__|\*|_)?`;
const ABRE_RE = new RegExp(TAG_ABRE, "i");
const FECHA_RE = new RegExp(TAG_FECHA, "i");

const MAX_OPCOES = 6;

function limparOpcao(l: string): string {
  let t = l.trim();
  // Negrito/itálico em volta da opção inteira.
  for (;;) {
    const m = t.match(/^(\*\*|__|\*|_)(.+)\1$/);
    if (!m) break;
    t = m[2].trim();
  }
  return t.replace(/^["“]|["”]$/g, "").trim();
}

function extrairOpcoes(inner: string): string[] {
  const linhas = inner
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^(```|~~~)/.test(l));
  const marcador = /^(?:[-•*+]|\d{1,2}[.)])\s+(.*)$/;
  const comMarcador = linhas.map((l) => l.match(marcador)).filter(Boolean) as RegExpMatchArray[];
  const brutas = comMarcador.length > 0 ? comMarcador.map((m) => m[1]) : linhas;
  const opcoes = brutas
    .map(limparOpcao)
    .filter((o) => o && o.length <= 80 && !/^[*_\-•]+$/.test(o));
  return Array.from(new Set(opcoes)).slice(0, MAX_OPCOES);
}

/** Remove a crase tripla que sobra vazia quando o bloco veio dentro de um bloco de código. */
function semCercaVazia(antes: string, depois: string): [string, string] {
  const a = antes.match(/(?:^|\n)[ \t]*(```|~~~)[^\n]*\n?\s*$/);
  if (a) {
    const d = depois.match(/^\s*(```|~~~)[ \t]*(?:\n|$)/);
    if (d) return [antes.slice(0, a.index), depois.slice(d[0].length)];
    if (!depois.trim()) return [antes.slice(0, a.index), depois];
  }
  return [antes, depois];
}

/**
 * Separa o texto visível das opções de resposta rápida.
 * @param completa true quando a resposta já terminou (não está chegando).
 *   Aí um bloco sem "[/OPÇÕES]" vale até o fim do texto. Durante o
 *   streaming, o bloco aberto só é escondido, sem botões.
 */
export function parseQuickOptions(
  raw: string,
  completa = true,
): { clean: string; options: string[] } {
  if (!raw) return { clean: "", options: [] };
  const abre = ABRE_RE.exec(raw);
  if (!abre) return { clean: semLatex(raw.trimEnd()), options: [] };

  let antes = raw.slice(0, abre.index);
  const resto = raw.slice(abre.index + abre[0].length);
  const fecha = FECHA_RE.exec(resto);
  let inner: string;
  let depois = "";
  if (fecha) {
    inner = resto.slice(0, fecha.index);
    depois = resto.slice(fecha.index + fecha[0].length);
  } else {
    inner = resto;
  }
  [antes, depois] = semCercaVazia(antes, depois);
  const options = fecha || completa ? extrairOpcoes(inner) : [];
  // Texto depois do bloco (raro) continua visível.
  const visivel = (antes.trimEnd() + (depois.trim() ? `\n\n${depois.trim()}` : "")).trimEnd();
  // semLatex: fórmulas que a IA mande em LaTeX viram texto comum (½, 3 × 4).
  return { clean: semLatex(visivel), options };
}

export function isFreeTextOption(opt: string): boolean {
  return /outro\s*\(.*digitar.*\)/i.test(opt);
}
