// Feriados nacionais brasileiros (fixos + móveis baseados na Páscoa).
// Retorna um Map "YYYY-MM-DD" -> nome do feriado para o ano informado.

function easterSunday(year: number): Date {
  // Algoritmo de Computus (Meeus/Jones/Butcher) — calendário gregoriano.
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=março, 4=abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDaysUTC(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function fmt(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function feriadosNacionaisBR(year: number): Map<string, string> {
  const easter = easterSunday(year);
  const map = new Map<string, string>();
  // Fixos
  map.set(`${year}-01-01`, "Confraternização Universal");
  map.set(`${year}-04-21`, "Tiradentes");
  map.set(`${year}-05-01`, "Dia do Trabalho");
  map.set(`${year}-09-07`, "Independência do Brasil");
  map.set(`${year}-10-12`, "Nossa Senhora Aparecida");
  map.set(`${year}-11-02`, "Finados");
  map.set(`${year}-11-15`, "Proclamação da República");
  map.set(`${year}-11-20`, "Consciência Negra");
  map.set(`${year}-12-25`, "Natal");
  // Móveis
  map.set(fmt(addDaysUTC(easter, -48)), "Carnaval (segunda)");
  map.set(fmt(addDaysUTC(easter, -47)), "Carnaval (terça)");
  map.set(fmt(addDaysUTC(easter, -2)), "Sexta-feira Santa");
  map.set(fmt(easter), "Páscoa");
  map.set(fmt(addDaysUTC(easter, 60)), "Corpus Christi");
  return map;
}

export function isFeriadoNacional(iso: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const year = parseInt(iso.slice(0, 4), 10);
  return feriadosNacionaisBR(year).get(iso) ?? null;
}
