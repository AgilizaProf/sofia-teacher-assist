// Arquivo de calendário (.ics) com os compromissos da Agenda e um lembrete em
// cada um. Ao abrir o arquivo no celular (iPhone, Android) ou no Google Agenda /
// Outlook, os eventos entram no calendário do aparelho e o lembrete toca lá,
// mesmo com o AgilizaProf fechado.

export type EventoIcs = { id: string; date: string; title: string; time?: string; notes?: string };

function escapar(t: string): string {
  return t.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

/** Quebra linhas longas (regra do formato: até 75 caracteres por linha). */
function dobrar(linha: string): string {
  const partes: string[] = [];
  let resto = linha;
  while (resto.length > 74) {
    partes.push(resto.slice(0, 74));
    resto = " " + resto.slice(74);
  }
  partes.push(resto);
  return partes.join("\r\n");
}

function soData(iso: string): string {
  return iso.replace(/-/g, "");
}

function diaSeguinte(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const x = new Date(Date.UTC(a, m - 1, d + 1));
  return x.toISOString().slice(0, 10).replace(/-/g, "");
}

function carimbo(agora: Date): string {
  return agora.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function gerarIcs(eventos: EventoIcs[], agora = new Date()): string {
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AgilizaProf//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:AgilizaProf",
  ];
  for (const e of eventos) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date) || !e.title?.trim()) continue;
    const hora = /^(\d{1,2}):(\d{2})/.exec(e.time ?? "");
    linhas.push("BEGIN:VEVENT", `UID:${e.id}@agilizaprof`, `DTSTAMP:${carimbo(agora)}`);
    if (hora) {
      const hh = hora[1].padStart(2, "0");
      const inicio = `${soData(e.date)}T${hh}${hora[2]}00`;
      const fimH = String(Math.min(23, Number(hh) + 1)).padStart(2, "0");
      linhas.push(`DTSTART:${inicio}`, `DTEND:${soData(e.date)}T${fimH}${hora[2]}00`);
    } else {
      linhas.push(`DTSTART;VALUE=DATE:${soData(e.date)}`, `DTEND;VALUE=DATE:${diaSeguinte(e.date)}`);
    }
    linhas.push(dobrar(`SUMMARY:${escapar(e.title.trim())}`));
    if (e.notes?.trim()) linhas.push(dobrar(`DESCRIPTION:${escapar(e.notes.trim())}`));
    // Com hora: 30 minutos antes. Dia inteiro: às 18h da véspera.
    linhas.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      dobrar(`DESCRIPTION:${escapar(e.title.trim())}`),
      `TRIGGER:${hora ? "-PT30M" : "-PT6H"}`,
      "END:VALARM",
      "END:VEVENT",
    );
  }
  linhas.push("END:VCALENDAR");
  return linhas.join("\r\n") + "\r\n";
}

export function baixarIcs(eventos: EventoIcs[], nome = "agenda-agilizaprof.ics"): void {
  const blob = new Blob([gerarIcs(eventos)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
