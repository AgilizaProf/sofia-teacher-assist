// ─────────────────────────────────────────────────────────────────────────────
// Fixtures de entradas reais do diário usadas em testes de detecção de menções.
//
// Cada item simula uma anotação típica feita pela professora no app Sofia.
// Inclui variações de acentuação, fronteira de palavra, pontuação, nomes
// compostos e armadilhas (substrings que NÃO devem casar).
// ─────────────────────────────────────────────────────────────────────────────

export interface DiaryEntryFixture {
  /** Identificador estável para usar como dedupKey nos testes. */
  id: string;
  /** Texto livre como digitado pela professora. */
  text: string;
  /** Nomes de alunos cadastrados que DEVEM ser detectados nesta entrada. */
  expectedMatches: string[];
  /** Nomes que NÃO devem casar (armadilhas: substrings, acentos, etc.). */
  expectedNonMatches: string[];
}

export const diaryEntryFixtures: DiaryEntryFixture[] = [
  {
    id: "diario-001",
    text: "Hoje a Ana chegou bem disposta e participou da roda de leitura.",
    expectedMatches: ["Ana", "Ana Beatriz Souza"],
    expectedNonMatches: ["Mariana", "Joana"],
  },
  {
    id: "diario-002",
    text: "João não quis participar da atividade em grupo, ficou retraído.",
    expectedMatches: ["João Pedro", "Joao Pedro Lima"],
    expectedNonMatches: ["Joaquim", "Joana"],
  },
  {
    id: "diario-003",
    text: "Combinei com a mãe da Inês um retorno na próxima semana.",
    expectedMatches: ["Inês Carvalho", "Ines Carvalho"],
    expectedNonMatches: ["Agnes"],
  },
  {
    id: "diario-004",
    text: "A turma comeu banana no lanche e adorou a fruta.",
    expectedMatches: [],
    // "Ana" está dentro de "banana" — não pode casar.
    expectedNonMatches: ["Ana", "Ana Souza"],
  },
  {
    id: "diario-005",
    text: "Conversei com a Ana-Lucia sobre o reforço de matemática.",
    expectedMatches: ["Ana-Lucia", "Ana-Lucia Pereira"],
    // Sem hífen no texto não deve casar o nome composto exato.
    expectedNonMatches: ["Mariana"],
  },
  {
    id: "diario-006",
    text: "(Maria) trouxe a tarefa pronta — parabenizei na frente da turma!",
    expectedMatches: ["Maria", "Maria Eduarda"],
    expectedNonMatches: ["Mariana", "Mário"],
  },
  {
    id: "diario-007",
    text: "O Souza ajudou os colegas no exercício de frações hoje.",
    // Casamento por sobrenome quando o nome completo está cadastrado.
    expectedMatches: ["Pedro Souza"],
    expectedNonMatches: ["Sousa Lima"],
  },
  {
    id: "diario-008",
    text: "Cesária leu em voz alta com muita confiança.",
    expectedMatches: ["Cesaria Mendes", "Cesária Mendes"],
    expectedNonMatches: ["Cesar"],
  },
  {
    id: "diario-009",
    text: "Falei com d'Ávila sobre o comportamento durante o recreio.",
    expectedMatches: ["D'Avila", "D'Ávila Ramos"],
    expectedNonMatches: ["Davi"],
  },
  {
    id: "diario-010",
    text: "Reunião geral com pais marcada para sexta — sem alunos citados.",
    expectedMatches: [],
    expectedNonMatches: ["Ana", "João", "Maria", "Pedro Souza"],
  },
];