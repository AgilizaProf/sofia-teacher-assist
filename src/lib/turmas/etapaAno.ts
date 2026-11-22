// Descobre a etapa e o ano a partir do que a professora escreveu na turma
// ("3º ano", "Pré 2", "PRÉ II · Escola Teste", "6º B", "EJA I"...).
// Usado para já preencher etapa e ano quando ela escolhe uma turma.

export type EtapaKey = "infantil" | "fund1" | "fund2" | "medio" | "eja";

function norm(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

export function etapaAnoDaTurma(...textos: Array<string | null | undefined>): { etapa: EtapaKey; ano: string } | null {
  const t = norm(textos.filter(Boolean).join(" "));
  if (!t) return null;
  if (/\beja\b/.test(t)) {
    const m = t.match(/eja\s*(iii|ii|i|3|2|1)\b/);
    const n = m ? ({ i: "I", "1": "I", ii: "II", "2": "II", iii: "III", "3": "III" } as Record<string, string>)[m[1]] : "I";
    return { etapa: "eja", ano: `EJA ${n}` };
  }
  if (/creche|berc|bebe|maternal/.test(t)) return { etapa: "infantil", ano: "Creche" };
  if (/\bpre\b|pre-?escola|pre\s*(i|ii|1|2)\b|infantil|jardim/.test(t)) {
    const ii = /pre\s*-?\s*(ii|2)\b|5 anos|jardim\s*(ii|2)/.test(t);
    return { etapa: "infantil", ano: ii ? "Pré II" : "Pré I" };
  }
  if (/serie|medio|\bem\b/.test(t)) {
    const m = t.match(/([123])\s*(a|ª|o|º)?\s*serie/);
    return { etapa: "medio", ano: `${m ? m[1] : "1"}ª série` };
  }
  const m = t.match(/\b([1-9])\s*(o|º|°)?\s*(ano)?\b/);
  if (m) {
    const n = parseInt(m[1], 10);
    return { etapa: n <= 5 ? "fund1" : "fund2", ano: `${n}º` };
  }
  return null;
}
