// Deriva o nível de ensino a partir do texto livre do campo `ano` da turma
// (ex.: "Pré II", "3º ano", "5º ano EF", "8º ano", "1º EM", "2ª série EM")
// ou de campos de perfil como `etapa_ensino` / `nivel_ensino`.
//
// Retorna um dos rótulos canônicos usados nas instruções da Sofia, ou null
// quando não for possível inferir com segurança.

export type NivelEnsino =
  | "Educação Infantil"
  | "Ensino Fundamental - Anos Iniciais"
  | "Ensino Fundamental - Anos Finais"
  | "Ensino Fundamental"
  | "Ensino Médio";

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function inferirNivelEnsino(input?: string | null): NivelEnsino | null {
  if (!input) return null;
  const s = norm(input);
  if (!s) return null;

  // Sinais explícitos
  if (/(^|\b)(em|ensino medio|medio|2o\s*grau|nivel medio)(\b|$)/.test(s)) return "Ensino Médio";
  if (/(infantil|bercario|berc[áa]rio|maternal|pre[- ]?escola|jardim|pre\s*i+|creche|0\s*a\s*5)/.test(s)) {
    return "Educação Infantil";
  }
  if (/(fundamental|ef\b|1o\s*grau|nivel fundamental)/.test(s)) {
    // tenta diferenciar iniciais x finais
    const m = s.match(/(\d{1,2})\s*(?:o|a|º|ª)?\s*(?:ano|serie)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 5) return "Ensino Fundamental - Anos Iniciais";
      if (n >= 6 && n <= 9) return "Ensino Fundamental - Anos Finais";
    }
    return "Ensino Fundamental";
  }

  // Apenas "Xº ano" sem rótulo
  const m = s.match(/(\d{1,2})\s*(?:o|a|º|ª)?\s*(?:ano|serie)/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 5) return "Ensino Fundamental - Anos Iniciais";
    if (n >= 6 && n <= 9) return "Ensino Fundamental - Anos Finais";
    if (n >= 1 && n <= 3 && /em|medio/.test(s)) return "Ensino Médio";
  }

  return null;
}