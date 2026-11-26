// Leis citadas nos documentos da Inclusão, de acordo com o aluno.
//
// A LBI vale para todo estudante com deficiência. Cada diagnóstico soma a lei
// específica: TEA → Lei 12.764/2012; TDAH, dislexia e outros transtornos de
// aprendizagem → Lei 14.254/2021. A Lei 14.254/2021 não trata de TEA e não é
// "a lei do PEI", por isso não aparece mais como base de todo PEI.

type AlunoLei = { cid?: string | null; diag?: string | null; diagnostico?: string | null } | null | undefined;

function textoDiag(a: AlunoLei): { cid: string; diag: string } {
  return {
    cid: (a?.cid || "").toUpperCase(),
    diag: `${a?.diag || ""} ${a?.diagnostico || ""}`.toLowerCase(),
  };
}

export function leisInclusao(a: AlunoLei): string[] {
  const { cid, diag } = textoDiag(a);
  const out = ["LBI (Lei 13.146/2015)"];
  if (/F84/.test(cid) || /\btea\b|autis/.test(diag)) out.push("Lei 12.764/2012 (TEA)");
  if (/F90|F81/.test(cid) || /tdah|dislex|discalc|disgraf|transtorno de aprendizagem/.test(diag)) {
    out.push("Lei 14.254/2021 (TDAH, dislexia e outros transtornos de aprendizagem)");
  }
  return out;
}

/** Selo curto para cabeçalhos: "LBI · Lei 12.764/2012". */
export function leisCurtoInclusao(a: AlunoLei): string {
  return leisInclusao(a)
    .map((l) => l.replace(/^LBI \(Lei 13\.146\/2015\)$/, "LBI").replace(/\s*\(.*\)$/, ""))
    .join(" · ");
}

/** Frase do rodapé dos documentos. */
export function fraseLegalInclusao(a: AlunoLei): string {
  const leis = [...leisInclusao(a), "BNCC"];
  const inicio = leis.slice(0, -1).join(", ");
  return `Documento elaborado com base na ${inicio} e na ${leis[leis.length - 1]}. Revise e entregue conforme as orientações da sua rede.`;
}
