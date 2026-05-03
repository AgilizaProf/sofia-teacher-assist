// Utilitários de data/hora padronizados para Brasil (America/Sao_Paulo, pt-BR).

export const BR_TIMEZONE = "America/Sao_Paulo";
export const BR_LOCALE = "pt-BR";

/** Retorna um Date "deslocado" para o fuso de Brasília (útil para getHours, getDay etc.). */
export function brNow(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  // America/Sao_Paulo é UTC-3 (sem horário de verão atualmente).
  return new Date(utc + -3 * 60 * 60_000);
}

/** Hora atual em Brasília (0–23). */
export const brHour = () => brNow().getHours();

/** Formata data no padrão brasileiro (dd/mm/aaaa por padrão). */
export function formatBR(
  date: Date | string | number,
  opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" }
): string {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(BR_LOCALE, { timeZone: BR_TIMEZONE, ...opts }).format(d);
}

/** Hora no padrão BR (HH:mm), fuso de Brasília. */
export const formatBRTime = (date: Date | string | number = new Date()) =>
  formatBR(date, { hour: "2-digit", minute: "2-digit", hour12: false });

/** Data + hora completa BR. */
export const formatBRDateTime = (date: Date | string | number = new Date()) =>
  formatBR(date, {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });

/** Data atual em Brasília no formato YYYY-MM-DD (calendário nacional BR). */
export function brDateKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BR_TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const y = parts.find(p => p.type === "year")?.value;
  const m = parts.find(p => p.type === "month")?.value;
  const d = parts.find(p => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

/** Diferença em dias entre duas datas YYYY-MM-DD (b - a). */
export function diffDaysBR(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00Z`).getTime();
  const db = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((db - da) / 86_400_000);
}

const STREAK_KEY = "sofia.streak.v1";

/** Atualiza e retorna o streak de dias consecutivos de acesso (fuso BR). */
export function updateLoginStreak(): number {
  if (typeof window === "undefined") return 0;
  const today = brDateKey();
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    const prev = raw ? (JSON.parse(raw) as { date: string; count: number }) : null;
    let count = 1;
    if (prev) {
      if (prev.date === today) count = prev.count;
      else {
        const diff = diffDaysBR(prev.date, today);
        count = diff === 1 ? prev.count + 1 : 1;
      }
    }
    localStorage.setItem(STREAK_KEY, JSON.stringify({ date: today, count }));
    return count;
  } catch {
    return 1;
  }
}