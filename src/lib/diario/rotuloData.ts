import { BR_TIMEZONE, brDateKey } from "@/lib/datetime";

// Data de um registro do diário, sempre no horário de Brasília e calculada
// na hora de mostrar. Antes o texto "Hoje · 10:42" era gravado e continuava
// dizendo "Hoje" nos dias seguintes.

/** Momento do registro: campo criadoEm, ou o número no id "e-<milissegundos>". */
export function momentoDoRegistro(e: { id?: string; criadoEm?: string }): Date | null {
  if (e.criadoEm) {
    const d = new Date(e.criadoEm);
    if (!isNaN(d.getTime())) return d;
  }
  const m = /^e-(\d{12,14})$/.exec(e.id || "");
  if (m) {
    const d = new Date(Number(m[1]));
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

export function rotuloDataRegistro(
  e: { id?: string; criadoEm?: string; date?: string },
  agora: Date = new Date(),
): string {
  const d = momentoDoRegistro(e);
  if (!d) return e.date || "";
  const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: BR_TIMEZONE, hour: "2-digit", minute: "2-digit" }).format(d);
  const dia = brDateKey(d);
  const hoje = brDateKey(agora);
  const ontem = brDateKey(new Date(agora.getTime() - 24 * 60 * 60 * 1000));
  const editado = /\(editado\)/.test(e.date || "") ? " (editado)" : "";
  if (dia === hoje) return `Hoje · ${hora}${editado}`;
  if (dia === ontem) return `Ontem · ${hora}${editado}`;
  const dm = new Intl.DateTimeFormat("pt-BR", { timeZone: BR_TIMEZONE, day: "2-digit", month: "2-digit" }).format(d);
  return `${dm} · ${hora}${editado}`;
}
