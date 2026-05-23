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

// Palavras que indicam conteúdo pedagógico formal
const PEDAGOGICAL_KEYWORDS = /\b(plano de aula|atividade|objetivo|desenvolvimento|fechamento|habilidade|avaliação|estratégia|parecer|relatório|adaptação|BNCC|competência|aprendizagem)\b/i;

// Detecta códigos BNCC válidos (EF01MA01, EI03EO04, EM13LP01, etc.)
const BNCC_CODE = /\b(EF\d{2}[A-Z]{2}\d{2}|EI\d{2}[A-Z]{2}\d{2}|EM\d{2}[A-Z]{2}\d{2})\b/;

// Detecta bloco de transparência (Princípio 6)
const TRANSPARENCY_BLOCK = /fontes|habilidades bncc|apoio te[oó]rico|base legal/i;

function isPedagogicalDocument(text: string): boolean {
  const wordCount = text.trim().split(/\s+/).length;
  return wordCount > 120 && PEDAGOGICAL_KEYWORDS.test(text);
}

export function validateSofiaOutput(text: string): {
  ok: boolean;
  issues: ValidationIssue[];
  sanitized: string;
} {
  const issues: ValidationIssue[] = [];
  let sanitized = text;

  // P3 — linguagem não-capacitista
  for (const rule of BLOCKLIST) {
    const matches = text.match(rule.pattern);
    if (matches) {
      for (const m of matches) {
        issues.push({ term: m, suggestion: rule.suggestion, principle: rule.principle });
      }
      sanitized = sanitized.replace(rule.pattern, rule.suggestion);
    }
  }

  // P2 — alinhamento BNCC (só em conteúdo pedagógico formal)
  if (isPedagogicalDocument(text) && !BNCC_CODE.test(text)) {
    issues.push({
      term: "Habilidade BNCC ausente",
      suggestion: "Inclua ao menos um código BNCC (ex.: EF03LP12) alinhado ao ano e disciplina",
      principle: "Princípio 2",
    });
  }

  // P6 — transparência (só em documentos formais extensos)
  if (isPedagogicalDocument(text) && !TRANSPARENCY_BLOCK.test(text)) {
    issues.push({
      term: "Bloco de transparência ausente",
      suggestion: "Adicione ao final: Fontes, Habilidades BNCC, Apoio teórico e Base legal",
      principle: "Princípio 6",
    });
  }

  return { ok: issues.length === 0, issues, sanitized };
}
