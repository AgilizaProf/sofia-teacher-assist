import { CID_OPTIONS } from "@/lib/cidsBR";

/**
 * Builds the standard "diagnósticos / CIDs" context block that must be
 * prepended to any Sofia prompt about a specific aluno PCD, so the model
 * considers ALL diagnoses (and possible comorbidities), not only the first.
 *
 * Aceita:
 *  - `cidsArray`: lista dedicada de códigos CID vinda da coluna `cids`.
 *  - `legacyCidString`: fallback no formato "CID F84.0, F71" salvo no
 *    campo `cid` antigo (compat).
 *
 * Retorna string vazia quando não há nenhum CID conhecido — nesse caso o
 * chamador NÃO deve inventar um diagnóstico.
 */
export function buildCidsPromptBlock(
  cidsArray: string[] | null | undefined,
  legacyCidString?: string | null,
): string {
  const fromArray = Array.isArray(cidsArray)
    ? cidsArray.map((c) => c.trim()).filter(Boolean)
    : [];
  let codes: string[] = fromArray;
  if (codes.length === 0 && legacyCidString) {
    const cleaned = legacyCidString.replace(/^\s*CID\s*/i, "").trim();
    if (cleaned && cleaned.toLowerCase() !== "não informado" && cleaned !== "—") {
      codes = cleaned.split(/[,;]/).map((c) => c.trim()).filter(Boolean);
    }
  }
  if (codes.length === 0) return "";

  const described = codes.map((code) => {
    const found = CID_OPTIONS.find((o) => o.cid === code);
    const desc = found ? found.label.split(" — ")[0] : "";
    return desc ? `${code} - ${desc}` : code;
  });

  return (
    `O(a) aluno(a) possui os seguintes diagnósticos (CIDs): ${described.join(", ")}. ` +
    `Considere todos os diagnósticos e possíveis comorbidades em todas as respostas.`
  );
}

/** Mesmo bloco já formatado como linha de contexto da Sofia. */
export function formatCidsContextLine(
  cidsArray: string[] | null | undefined,
  legacyCidString?: string | null,
): string | null {
  const block = buildCidsPromptBlock(cidsArray, legacyCidString);
  return block || null;
}