// PEI feito na tela PEI/PDI (tabela pei_pdi), em texto curto para o parecer.
// Antes o parecer só lia o PEI da ficha de Inclusão; quem fazia o PEI pela tela
// PEI/PDI via o parecer sair como se o aluno não tivesse PEI.

export type LinhaPeiPdi = {
  aluno_client_id: string;
  aluno_nome: string;
  bimestre?: string | null;
  objetivos_longo?: unknown;
  objetivos_curto?: unknown;
  estrategias?: unknown;
  avaliacao?: unknown;
};

function lista(v: unknown, campo: string): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>)[campo] : x))
    .filter((x): x is string => typeof x === "string" && x.trim() !== "")
    .map((x) => x.trim());
}

export function resumoPeiPdi(p: LinhaPeiPdi): string {
  const est = (p.estrategias ?? {}) as Record<string, unknown>;
  const estrategias = ["comunicacao", "organizacao", "materiais", "interacao"].flatMap((k) =>
    Array.isArray(est[k]) ? (est[k] as unknown[]).filter((x): x is string => typeof x === "string") : [],
  );
  const aval = (p.avaliacao ?? {}) as Record<string, unknown>;
  return [
    p.bimestre ? `PEI/PDI (${p.bimestre})` : "PEI/PDI",
    lista(p.objetivos_longo, "objetivo").length ? `Objetivos de longo prazo: ${lista(p.objetivos_longo, "objetivo").join("; ")}` : "",
    lista(p.objetivos_curto, "objetivo").length ? `Objetivos de curto prazo: ${lista(p.objetivos_curto, "objetivo").join("; ")}` : "",
    estrategias.length ? `Estratégias: ${estrategias.slice(0, 12).join("; ")}` : "",
    typeof aval.como_avaliar === "string" && aval.como_avaliar.trim() ? `Como avaliar: ${aval.como_avaliar.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 2500);
}

/** O PEI/PDI mais recente de cada aluno, por id e por nome (as linhas vêm do mais novo ao mais antigo). */
export function peiPdiPorAluno(linhas: LinhaPeiPdi[]) {
  const porId = new Map<string, LinhaPeiPdi>();
  const porNome = new Map<string, LinhaPeiPdi>();
  for (const l of linhas) {
    if (l.aluno_client_id && !porId.has(l.aluno_client_id)) porId.set(l.aluno_client_id, l);
    const n = (l.aluno_nome || "").trim().toLowerCase();
    if (n && !porNome.has(n)) porNome.set(n, l);
  }
  return (id: string, nome: string): LinhaPeiPdi | undefined =>
    porId.get(id) ?? porNome.get((nome || "").trim().toLowerCase());
}
