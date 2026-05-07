// ─────────────────────────────────────────────────────────────────────────────
// Sanitização compartilhada dos filtros do M6 (?tag, ?turma, ?aluno).
//
// Usada por:
//   • src/routes/planejamento.tsx — validateSearch dos search params da URL.
//   • src/pages/Planejamento.tsx  — restauração do estado persistido em
//     localStorage (também é entrada não-confiável: pode ter sido editado
//     manualmente pelo usuário ou estar corrompido).
//
// Regras:
//   • Strings apenas; outros tipos viram undefined.
//   • Trim, colapsa espaços, remove caracteres de controle.
//   • Tamanho máximo (FILTER_MAX_LEN) — evita URLs gigantes / DoS.
//   • Whitelist de caracteres: letras (com acentos via \p{L}), dígitos,
//     espaço e pontuação leve (-,'.·). Bloqueia <, >, {, }, $, \, /, etc.
//     que poderiam ser tentativas de XSS, regex injection ou homoglyph.
// ─────────────────────────────────────────────────────────────────────────────

export const FILTER_MAX_LEN = 80;
export const FILTER_ALLOWED_RE = /^[\p{L}\p{N}\s\-.,'·]+$/u;

export function sanitizeFilter(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  if (cleaned.length > FILTER_MAX_LEN) return undefined;
  if (!FILTER_ALLOWED_RE.test(cleaned)) return undefined;
  return cleaned;
}

export interface M6FilterState {
  tag?: string;
  turma?: string;
  aluno?: string;
}

/** Sanitiza um objeto inteiro de filtros (URL ou storage). */
export function sanitizeM6Filters(raw: unknown): M6FilterState {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  return {
    tag: sanitizeFilter(r.tag),
    turma: sanitizeFilter(r.turma),
    aluno: sanitizeFilter(r.aluno),
  };
}