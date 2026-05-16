// Helpers para o bloco [OPÇÕES]...[/OPÇÕES] que a Sofia anexa no fim das
// respostas quando faz uma pergunta com respostas previsíveis. O bloco é
// invisível ao usuário; apenas serve para o app renderizar botões de
// resposta rápida (chips) abaixo da mensagem.

const OPCOES_REGEX = /\[\s*OP[ÇC][ÕO]ES\s*\][\s\S]*?\[\s*\/\s*OP[ÇC][ÕO]ES\s*\]/i;
// Marcador parcial que aparece durante o streaming, antes do bloco fechar.
const OPCOES_PARTIAL_REGEX = /\[\s*OP[ÇC][ÕO]ES\s*\][\s\S]*$/i;

export function parseQuickOptions(raw: string): { clean: string; options: string[] } {
  if (!raw) return { clean: "", options: [] };
  const match = raw.match(OPCOES_REGEX);
  if (!match) {
    // Durante o streaming pode haver um bloco "[OPÇÕES]" ainda aberto.
    // Escondemos do display, mas sem extrair opções (parciais).
    const clean = raw.replace(OPCOES_PARTIAL_REGEX, "").trimEnd();
    return { clean, options: [] };
  }
  const block = match[0];
  const inner = block
    .replace(/^\[\s*OP[ÇC][ÕO]ES\s*\]/i, "")
    .replace(/\[\s*\/\s*OP[ÇC][ÕO]ES\s*\]$/i, "");
  const options = inner
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("-") || l.startsWith("•") || l.startsWith("*"))
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
  const clean = raw.replace(OPCOES_REGEX, "").trimEnd();
  return { clean, options };
}

export function isFreeTextOption(opt: string): boolean {
  return /outro\s*\(.*digitar.*\)/i.test(opt);
}