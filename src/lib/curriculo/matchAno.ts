function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[º°ª]/g, "")
    .replace(/[^a-z0-9ivx ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): Set<string> {
  const n = norm(s);
  const out = new Set<string>();
  if (!n) return out;

  if (/\bberc?ario\b/.test(n)) out.add("e:bercario");
  if (/\bmaternal\b/.test(n)) out.add("e:maternal");
  if (/\bpre\b/.test(n)) out.add("e:pre");
  if (/\bcreche\b/.test(n)) out.add("e:bercario");

  for (const m of n.matchAll(/\b(iv|iii|ii|i)\b/g)) out.add(`r:${m[1]}`);
  for (const m of n.matchAll(/\b(\d{1,2})\b/g)) {
    const v = parseInt(m[1], 10);
    if (v >= 1 && v <= 12) out.add(`a:${v}`);
  }

  if (/\bef\b|\bfundamental\b/.test(n)) out.add("etapa:ef");
  if (/\bem\b|\bmedio\b/.test(n)) out.add("etapa:em");

  return out;
}

export function matchAnoCurriculo(alvoAno: string | undefined | null, candidatoAno: string | undefined | null): boolean {
  if (!alvoAno) return true;
  const alvo = tokens(alvoAno);
  const candidato = tokens(candidatoAno || "");
  if (alvo.size === 0) return true;
  for (const token of alvo) {
    if (!candidato.has(token)) return false;
  }
  return true;
}