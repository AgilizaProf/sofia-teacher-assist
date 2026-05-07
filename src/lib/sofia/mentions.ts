// ─────────────────────────────────────────────────────────────────────────────
// Helpers de detecção de menções (extraídos de autoReminders para teste).
//
// Sofia usa estes utilitários para descobrir se uma entrada do diário cita
// um aluno cadastrado. Características:
//   • Normaliza acentos (NFD) e caixa.
//   • Respeita fronteira de palavra (não casa "Ana" dentro de "banana").
//   • Tenta nome completo e cada parte com 3+ chars (primeiro/último nome).
// ─────────────────────────────────────────────────────────────────────────────

/** Lower-case + remoção de diacríticos. */
export function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Escapa metacaracteres de regex. */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Retorna true se `text` cita `fullName` (ou qualquer parte ≥ 3 chars dele).
 * Compara com fronteira de palavra usando classe [a-z0-9] em texto normalizado.
 */
export function mentionsName(text: string, fullName: string): boolean {
  if (!text || !fullName) return false;
  const t = norm(text);
  const candidates = [fullName, ...fullName.split(/\s+/)].filter((n) => n.length >= 3);
  for (const c of candidates) {
    const re = new RegExp(`(^|[^a-z0-9])${escapeRe(norm(c))}([^a-z0-9]|$)`);
    if (re.test(t)) return true;
  }
  return false;
}
