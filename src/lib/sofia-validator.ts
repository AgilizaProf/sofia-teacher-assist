// Validador anticapacitista — revisa saídas da Sofia antes de exibir.
//
// Regras de ouro deste arquivo:
// 1. Só troca automaticamente expressões cuja substituição é SEMPRE segura
//    gramaticalmente ("portador de TEA" → "com TEA"). Trocas que dependem do
//    contexto ("não consegue", "atrasado", "incapaz") corrompiam frases
//    ("o ônibus está em processo de desenvolvimento", "ele está desenvolvendo
//    ler"), então agora só são orientadas no prompt, nunca reescritas aqui.
// 2. Preserva maiúscula inicial ao substituir.
// 3. Os avisos de BNCC/transparência (P2/P6) são métricas internas: voltam
//    em `quality`, mas NÃO entram em `issues` (que aparecem para a professora).

export interface ValidationIssue {
  term: string;
  suggestion: string;
  principle: string;
}

type Rule = { pattern: RegExp; suggestion: string; principle: string };

// Substituições automáticas — apenas as que funcionam em qualquer frase.
const AUTO_REPLACE: Rule[] = [
  // "ele é portador de TEA" → "ele tem TEA" (antes das regras genéricas)
  { pattern: /(?<!\p{L})é portadora? de\b/giu, suggestion: "tem", principle: "Princípio 3" },
  { pattern: /\bsão portadora?s? de\b/gi, suggestion: "têm", principle: "Princípio 3" },
  // "aluno portador de TEA" → "aluno com TEA"; "portadores de deficiência" → "pessoas com deficiência"
  { pattern: /\bpessoas? portadora?s? de\b/gi, suggestion: "pessoa com", principle: "Princípio 3" },
  { pattern: /\bportadores de\b/gi, suggestion: "pessoas com", principle: "Princípio 3" },
  { pattern: /\bportadoras de\b/gi, suggestion: "pessoas com", principle: "Princípio 3" },
  { pattern: /\bportador de\b/gi, suggestion: "com", principle: "Princípio 3" },
  { pattern: /\bportadora de\b/gi, suggestion: "com", principle: "Princípio 3" },
  { pattern: /\bsofre de\b/gi, suggestion: "tem", principle: "Princípio 3" },
  { pattern: /\bsofrem de\b/gi, suggestion: "têm", principle: "Princípio 3" },
  {
    pattern: /\balunos especiais\b/gi,
    suggestion: "estudantes com deficiência",
    principle: "Princípio 3",
  },
  {
    pattern: /\baluno especial\b/gi,
    suggestion: "estudante com deficiência",
    principle: "Princípio 3",
  },
  {
    pattern: /\baluna especial\b/gi,
    suggestion: "estudante com deficiência",
    principle: "Princípio 3",
  },
  {
    pattern: /\balunas especiais\b/gi,
    suggestion: "estudantes com deficiência",
    principle: "Princípio 3",
  },
  {
    pattern: /\balunos?-problema\b/gi,
    suggestion: "estudante que precisa de mais apoio",
    principle: "Princípio 3",
  },
  {
    pattern: /\bdeficientezinhos?\b/gi,
    suggestion: "estudante com deficiência",
    principle: "Princípio 3",
  },
  {
    pattern: /\bretardo mental\b/gi,
    suggestion: "deficiência intelectual",
    principle: "Princípio 3",
  },
  {
    pattern: /\bretardado mental\b/gi,
    suggestion: "pessoa com deficiência intelectual",
    principle: "Princípio 3",
  },
  {
    pattern: /\blimitad[oa]s? cognitivamente\b/gi,
    suggestion: "com deficiência intelectual",
    principle: "Princípio 3",
  },
  { pattern: /\bfamílias desestruturadas\b/gi, suggestion: "famílias", principle: "Princípio 3" },
  { pattern: /\bfamília desestruturada\b/gi, suggestion: "família", principle: "Princípio 3" },
];

// Palavras que indicam conteúdo pedagógico formal
const PEDAGOGICAL_KEYWORDS =
  /\b(plano de aula|atividade|objetivo|desenvolvimento|fechamento|habilidade|avaliação|estratégia|parecer|relatório|adaptação|BNCC|competência|aprendizagem)\b/i;

// Detecta códigos BNCC válidos (EF01MA01, EI03EO04, EM13LP01, EF15LP01, EF69LP01 etc.)
const BNCC_CODE =
  /\b(EF\d{2}[A-Z]{2}\d{2}|EI\d{2}[A-Z]{2}\d{2}|EM\d{2}[A-Z]{3}\d{3}|EM\d{2}[A-Z]{2}\d{2})\b/;

// Detecta bloco de transparência (Princípio 6)
const TRANSPARENCY_BLOCK = /fontes|habilidades bncc|apoio te[oó]rico|base legal/i;

function isPedagogicalDocument(text: string): boolean {
  const wordCount = text.trim().split(/\s+/).length;
  return wordCount > 120 && PEDAGOGICAL_KEYWORDS.test(text);
}

function keepCase(original: string, replacement: string): string {
  if (!original) return replacement;
  const first = original[0];
  if (first === first.toUpperCase() && first !== first.toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/** Aplica as trocas fora de blocos de código e de links (URLs não podem mudar). */
function replaceOutsideCode(text: string, rule: Rule, onMatch: (m: string) => void): string {
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]*`|https?:\/\/\S+)/g);
  return parts
    .map((part, idx) => {
      if (idx % 2 === 1) return part; // trecho protegido
      return part.replace(rule.pattern, (m) => {
        onMatch(m);
        return keepCase(m, rule.suggestion);
      });
    })
    .join("");
}

export function validateSofiaOutput(text: string): {
  ok: boolean;
  /** Ajustes de linguagem feitos automaticamente (mostrados à professora). */
  issues: ValidationIssue[];
  /** Avisos internos de qualidade (BNCC/transparência), só para telemetria. */
  quality: ValidationIssue[];
  sanitized: string;
} {
  const issues: ValidationIssue[] = [];
  const quality: ValidationIssue[] = [];
  let sanitized = text || "";

  // P3 — linguagem não-capacitista
  for (const rule of AUTO_REPLACE) {
    sanitized = replaceOutsideCode(sanitized, rule, (m) => {
      issues.push({ term: m, suggestion: rule.suggestion, principle: rule.principle });
    });
  }

  // P2 — alinhamento BNCC (só em conteúdo pedagógico formal)
  if (isPedagogicalDocument(sanitized) && !BNCC_CODE.test(sanitized)) {
    quality.push({
      term: "Habilidade BNCC ausente",
      suggestion: "Inclua ao menos um código BNCC (ex.: EF03LP12) alinhado ao ano e disciplina",
      principle: "Princípio 2",
    });
  }

  // P6 — transparência (só em documentos formais extensos)
  if (isPedagogicalDocument(sanitized) && !TRANSPARENCY_BLOCK.test(sanitized)) {
    quality.push({
      term: "Bloco de transparência ausente",
      suggestion: "Adicione ao final: Fontes, Habilidades BNCC, Apoio teórico e Base legal",
      principle: "Princípio 6",
    });
  }

  return { ok: issues.length === 0 && quality.length === 0, issues, quality, sanitized };
}
