// Helpers for class "grade" values used in the dashboard turma form.
// Educação Infantil values are stored as slugs (e.g. "bercario-1") so
// they survive serialization; numeric values continue to mean Ensino
// Fundamental ("1".."9").

export const EI_GRADE_LABELS: Record<string, string> = {
  "bercario-1": "Berçário I",
  "bercario-2": "Berçário II",
  "maternal-1": "Maternal I",
  "maternal-2": "Maternal II",
  "pre-1": "Pré I",
  "pre-2": "Pré II",
};

export function isEducacaoInfantilGrade(raw?: string | null): boolean {
  if (!raw) return false;
  return Object.prototype.hasOwnProperty.call(EI_GRADE_LABELS, raw.trim());
}

/** Pretty label for a turma.grade value. */
export function formatTurmaGrade(raw?: string | null): string {
  const t = (raw || "").trim();
  if (!t) return "";
  if (EI_GRADE_LABELS[t]) return `${EI_GRADE_LABELS[t]} (EI)`;
  if (/^\d+$/.test(t)) {
    const n = parseInt(t, 10);
    if (n >= 1 && n <= 9) return `${n}º ano EF`;
  }
  return t;
}