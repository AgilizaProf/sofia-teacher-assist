// Validador anticapacitista — revisa saídas da Sofia antes de exibir.

export interface ValidationIssue {
  term: string;
  suggestion: string;
  principle: string;
}

// Lista expansível de termos a evitar e suas substituições sugeridas.
const BLOCKLIST: Array<{ pattern: RegExp; suggestion: string; principle: string }> = [
  { pattern: /\bportador(a|es|as)? de\b/gi, suggestion: "pessoa com", principle: "Princípio 3" },
  { pattern: /\bsofre de\b/gi, suggestion: "tem / vive com", principle: "Princípio 3" },
  { pattern: /\bvítima de\b/gi, suggestion: "pessoa com", principle: "Princípio 3" },
  { pattern: /\baluno(s)? especial(is)?\b/gi, suggestion: "estudante com deficiência", principle: "Princípio 3" },
  { pattern: /\baluno-problema\b/gi, suggestion: "estudante que precisa de mais apoio", principle: "Princípio 3" },
  { pattern: /\bdeficientezinho(s)?\b/gi, suggestion: "estudante com deficiência", principle: "Princípio 3" },
  { pattern: /\bretardo\b/gi, suggestion: "deficiência intelectual", principle: "Princípio 3" },
  { pattern: /\batrasado(s|a|as)?\b/gi, suggestion: "em processo de desenvolvimento", principle: "Princípio 3" },
  { pattern: /\blimitado(s|a|as)? cognitivamente\b/gi, suggestion: "com deficiência intelectual", principle: "Princípio 3" },
  { pattern: /\bcriança(s)? difícil\b/gi, suggestion: "criança que precisa de mais escuta", principle: "Princípio 3" },
  { pattern: /\bfamília(s)? desestruturada(s)?\b/gi, suggestion: "família", principle: "Princípio 3" },
  { pattern: /\bincapaz(es)?\b/gi, suggestion: "ainda em construção", principle: "Princípio 3" },
  { pattern: /\bnão consegue\b/gi, suggestion: "está desenvolvendo", principle: "Princípio 3" },
  { pattern: /\bpreguiçoso(s|a|as)?\b/gi, suggestion: "precisa de novas estratégias de engajamento", principle: "Princípio 3" },
  { pattern: /\bbirrento(s|a|as)?\b/gi, suggestion: "em desregulação emocional", principle: "Princípio 3" },
];

export function validateSofiaOutput(text: string): {
  ok: boolean;
  issues: ValidationIssue[];
  sanitized: string;
} {
  const issues: ValidationIssue[] = [];
  let sanitized = text;
  for (const rule of BLOCKLIST) {
    const matches = text.match(rule.pattern);
    if (matches) {
      for (const m of matches) {
        issues.push({ term: m, suggestion: rule.suggestion, principle: rule.principle });
      }
      sanitized = sanitized.replace(rule.pattern, rule.suggestion);
    }
  }
  return { ok: issues.length === 0, issues, sanitized };
}