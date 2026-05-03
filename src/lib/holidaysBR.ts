// Feriados nacionais brasileiros (fixos + móveis baseados na Páscoa).

function easterSunday(year: number): Date {
  // Algoritmo de Meeus/Jones/Butcher
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
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export type HolidayBR = { date: string; name: string }; // date: YYYY-MM-DD

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function holidaysForYearBR(year: number): HolidayBR[] {
  const easter = easterSunday(year);
  return [
    { date: `${year}-01-01`, name: "Confraternização Universal" },
    { date: fmt(addDays(easter, -48)), name: "Carnaval (segunda)" },
    { date: fmt(addDays(easter, -47)), name: "Carnaval (terça)" },
    { date: fmt(addDays(easter, -2)), name: "Sexta-feira Santa" },
    { date: fmt(easter), name: "Páscoa" },
    { date: `${year}-04-21`, name: "Tiradentes" },
    { date: `${year}-05-01`, name: "Dia do Trabalho" },
    { date: fmt(addDays(easter, 60)), name: "Corpus Christi" },
    { date: `${year}-09-07`, name: "Independência do Brasil" },
    { date: `${year}-10-12`, name: "Nossa Senhora Aparecida" },
    { date: `${year}-11-02`, name: "Finados" },
    { date: `${year}-11-15`, name: "Proclamação da República" },
    { date: `${year}-11-20`, name: "Consciência Negra" },
    { date: `${year}-12-25`, name: "Natal" },
  ];
}

export function holidayMap(year: number): Map<string, string> {
  const m = new Map<string, string>();
  for (const h of holidaysForYearBR(year)) m.set(h.date, h.name);
  return m;
}