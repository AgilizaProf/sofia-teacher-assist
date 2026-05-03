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