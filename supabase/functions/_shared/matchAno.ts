/**
 * Casa o ano escolar selecionado (ex: "Berçário I", "Pré II", "Maternal I",
 * "1º ano", "1º Ano EF", "Educação Infantil") com o rótulo de ano de uma
 * habilidade do currículo municipal (que pode ser exatamente igual ou variar:
 * "Berçário I e II", "Pré I", "1º Ano EF", etc.).
 *
 * Estratégia: extrair tokens normalizados (etapa + sub-grupo romano + ano arábico)
 * de cada lado e exigir que TODOS os tokens do alvo apareçam no candidato.
 */
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

  // Etapas de Educação Infantil
  if (/\bberc?ario\b/.test(n)) out.add("e:bercario");
  if (/\bmaternal\b/.test(n)) out.add("e:maternal");
  if (/\bpre\b/.test(n)) out.add("e:pre");
  if (/\bcreche\b/.test(n)) out.add("e:bercario"); // creche ≈ berçário
  // Sub-grupo romano (I, II, III, IV) — pega TODOS
  for (const m of n.matchAll(/\b(iv|iii|ii|i)\b/g)) out.add("r:" + m[1]);
  // Ano arábico do EF/EM (1..9 / 1..3)
  for (const m of n.matchAll(/\b(\d{1,2})\b/g)) {
    const v = parseInt(m[1], 10);
    if (v >= 1 && v <= 12) out.add("a:" + v);
  }
  // Marcador EF/EM/fundamental/médio
  if (/\bef\b|\bfundamental\b/.test(n)) out.add("etapa:ef");
  if (/\bem\b|\bmedio\b/.test(n)) out.add("etapa:em");

  return out;
}

export function matchAnoCurriculo(alvoAno: string | undefined | null, candidatoAno: string | undefined | null): boolean {
  if (!alvoAno) return true;
  const t = tokens(alvoAno);
  const c = tokens(candidatoAno || "");
  if (t.size === 0) return true; // sem sinal — não filtra
  // Todos os tokens do alvo devem estar presentes no candidato
  for (const tok of t) if (!c.has(tok)) return false;
  return true;
}