/**
 * Opções de "Ano de Referência Pedagógico" para a Anamnese de alunos PCD.
 *
 * O ano de referência indica o nível pedagógico em que o aluno se encontra
 * — pode ser diferente do ano em que está oficialmente matriculado.
 * Toda a geração de conteúdo pela Sofia (atividades, adaptações,
 * planejamentos, pareceres, relatórios e PEI) deve respeitar este valor.
 */
export type AnoReferenciaGroup = {
  emoji: string;
  label: string;
  options: string[];
};

export const ANO_REFERENCIA_GROUPS: AnoReferenciaGroup[] = [
  {
    emoji: "🧸",
    label: "Educação Infantil",
    options: [
      "Berçário I (0-1 ano)",
      "Berçário II (1-2 anos)",
      "Maternal I (2-3 anos)",
      "Maternal II (3-4 anos)",
      "Pré I / Jardim I (4-5 anos)",
      "Pré II / Jardim II (5-6 anos)",
    ],
  },
  {
    emoji: "📚",
    label: "Ensino Fundamental — Anos Iniciais",
    options: ["1º ano", "2º ano", "3º ano", "4º ano", "5º ano"],
  },
  {
    emoji: "📖",
    label: "Ensino Fundamental — Anos Finais",
    options: ["6º ano", "7º ano", "8º ano", "9º ano"],
  },
  {
    emoji: "🎓",
    label: "Ensino Médio",
    options: ["1ª série", "2ª série", "3ª série"],
  },
];

export const ANO_REFERENCIA_OPTIONS: string[] = ANO_REFERENCIA_GROUPS.flatMap(
  (g) => g.options,
);

/** Normaliza para comparação tolerante a maiúsculas/acentos/espaços. */
function norm(v: string | null | undefined): string {
  return (v || "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Retorna true se o ano de referência informado diverge do ano de matrícula.
 * Comparação tolerante: "2º ano" == "2 ano EF" == "2º ano — Ensino Fundamental".
 */
export function isAnoReferenciaDivergente(
  anoMatricula: string | null | undefined,
  anoReferencia: string | null | undefined,
): boolean {
  const ref = norm(anoReferencia);
  if (!ref) return false;
  const mat = norm(anoMatricula);
  if (!mat) return false;
  if (ref === mat) return false;
  // Comparação por número do ano + nível (EF/EM/EI), ignorando texto extra.
  const refKey = ref.replace(/[^a-z0-9]/g, "");
  const matKey = mat.replace(/[^a-z0-9]/g, "");
  return !(refKey && matKey && (refKey.includes(matKey) || matKey.includes(refKey)));
}

/**
 * Monta a instrução padrão a ser injetada no prompt da Sofia quando
 * existe um ano de referência diferente do ano de matrícula. Quando os
 * dois coincidem (ou só um está presente), retorna apenas a linha de
 * referência para a Sofia usar como parâmetro pedagógico.
 */
export function buildAnoReferenciaPromptBlock(
  anoMatricula: string | null | undefined,
  anoReferencia: string | null | undefined,
): string {
  const ref = (anoReferencia || "").trim();
  if (!ref) return "";
  const mat = (anoMatricula || "").trim();
  if (!mat || !isAnoReferenciaDivergente(mat, ref)) {
    return [
      `ANO DE REFERÊNCIA PEDAGÓGICO: ${ref}.`,
      "Use este ano como o parâmetro pedagógico ao gerar qualquer conteúdo:",
      "atividades, adaptações, objetivos, linguagem, complexidade e habilidades BNCC.",
    ].join(" ");
  }
  return [
    `O aluno está matriculado no ${mat} mas seu ANO DE REFERÊNCIA PEDAGÓGICO é ${ref}.`,
    "Todas as atividades, adaptações, objetivos, linguagem, complexidade e habilidades BNCC",
    `devem ser geradas de acordo com o ANO DE REFERÊNCIA (${ref}),`,
    "e nunca com o ano de matrícula. Cite habilidades BNCC do ano de referência.",
    "Nunca misture os dois anos — o ano de referência é sempre o parâmetro pedagógico.",
    `Em relatórios e pareceres, mencione naturalmente: "O aluno, embora matriculado no ${mat},`,
    `desenvolve suas atividades com base no currículo do ${ref}, conforme indicado em seu plano pedagógico."`,
  ].join(" ");
}