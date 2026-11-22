// Evidências para o parecer que já existem no app:
// - provas corrigidas no Leitor QR de Questões (acertos por habilidade BNCC);
// - diário de bordo da turma (Planejar > Diário).
// Entram no texto que a Sofia lê e ajudam a pré-preencher a rubrica.

export type ResultadoProva = {
  aluno: string;
  turma?: string;
  titulo?: string;
  acertos: number;
  total: number;
  data?: string;
  /** {EF05MA01: [acertos, questões]} */
  hab?: Record<string, [number, number]>;
};

export type EntradaDiario = {
  emoji?: string;
  title?: string;
  text?: string;
  tags?: string[];
  date?: string;
  turma?: string;
  alunoIds?: string[];
};

export type AreaProva = "lp" | "ma" | "ci" | "hu" | "ar" | "ef" | "li";

const chave = (t: unknown) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[º°ª]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const chaveTurma = (t: unknown) =>
  chave(t)
    .replace(/\b(anos?|series?|turma|ensino|fundamental|ef|do|da|de)\b/g, " ")
    .replace(/(\d)\s*o\b/g, "$1")
    .replace(/[^a-z0-9]/g, "");

/** Lê os resultados guardados por Questões (app_snapshots "simulados_dados"). */
export function lerResultados(dados: unknown): ResultadoProva[] {
  const lista = (dados as { resultados?: unknown })?.resultados;
  if (!Array.isArray(lista)) return [];
  return lista
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r) => ({
      aluno: String(r.aluno ?? ""),
      turma: typeof r.turma === "string" ? r.turma : undefined,
      titulo: typeof r.titulo === "string" ? r.titulo : undefined,
      acertos: Number(r.acertos) || 0,
      total: Number(r.total) || 0,
      data: typeof r.data === "string" ? r.data : undefined,
      hab: r.hab && typeof r.hab === "object" ? (r.hab as Record<string, [number, number]>) : undefined,
    }))
    .filter((r) => r.aluno && r.total > 0 && !/^sem nome/i.test(r.aluno));
}

/** Provas deste aluno: mesmo nome e, quando as duas têm turma, a mesma turma. */
export function provasDoAluno(todas: ResultadoProva[], nome: string, turma?: string): ResultadoProva[] {
  const n = chave(nome);
  const t = chaveTurma(turma);
  return todas.filter((r) => chave(r.aluno) === n && (!t || !r.turma || chaveTurma(r.turma) === t));
}

const AREA_DO_CODIGO: Record<string, AreaProva> = {
  LP: "lp", MA: "ma", CI: "ci", HI: "hu", GE: "hu", AR: "ar", EF: "ef", LI: "li",
};

export function areaDoCodigo(codigo: string): AreaProva | null {
  const m = /^EF\d{2}([A-Z]{2})\d{2}$/.exec(codigo);
  return m ? AREA_DO_CODIGO[m[1]] ?? null : null;
}

/** A área da rubrica (pelo nome) corresponde a qual matéria das provas. */
export function areaDaRubrica(nomeArea: string): AreaProva | null {
  const a = chave(nomeArea);
  if (/portugues|linguagem|leitura/.test(a)) return "lp";
  if (/matematic/.test(a)) return "ma";
  if (/ciencia/.test(a)) return "ci";
  if (/human|histori|geografi/.test(a)) return "hu";
  if (/\barte/.test(a)) return "ar";
  if (/educacao fisica/.test(a)) return "ef";
  if (/ingles/.test(a)) return "li";
  return null;
}

/** Acertos somados por matéria e por habilidade. */
export function somarProvas(provas: ResultadoProva[]) {
  const porArea: Partial<Record<AreaProva, { a: number; n: number }>> = {};
  const porHab: Record<string, { a: number; n: number }> = {};
  for (const p of provas)
    for (const [cod, par] of Object.entries(p.hab ?? {})) {
      const [a, n] = Array.isArray(par) ? par : [0, 0];
      if (!n) continue;
      const h = (porHab[cod] ??= { a: 0, n: 0 });
      h.a += a;
      h.n += n;
      const area = areaDoCodigo(cod);
      if (area) {
        const o = (porArea[area] ??= { a: 0, n: 0 });
        o.a += a;
        o.n += n;
      }
    }
  return { porArea, porHab };
}

/** Sugestão para a rubrica a partir do acerto (só com pelo menos 3 questões). */
export function statusPelaProva(o: { a: number; n: number } | undefined): "co" | "ed" | "na" | null {
  if (!o || o.n < 3) return null;
  const p = o.a / o.n;
  return p >= 0.7 ? "co" : p >= 0.4 ? "ed" : "na";
}

export function textoProvas(provas: ResultadoProva[]): string {
  if (!provas.length) return "";
  const { porHab } = somarProvas(provas);
  const linhas = provas
    .slice(0, 6)
    .map((p) => `  - ${p.titulo || "Prova"}${p.data ? ` (${p.data.split(/[ ,]/)[0]})` : ""}: ${p.acertos} de ${p.total} acertos`);
  const habs = Object.entries(porHab)
    .filter(([, o]) => o.n >= 2)
    .sort((x, y) => x[1].a / x[1].n - y[1].a / y[1].n)
    .slice(0, 10)
    .map(([c, o]) => `${c} ${o.a}/${o.n}`);
  return [
    "Provas corrigidas (Questões)",
    ...linhas,
    habs.length ? `  Acertos por habilidade (das mais difíceis para as mais fáceis): ${habs.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Últimos registros do diário de bordo da turma (ou que citam o aluno). */
export function textoDiario(entradas: EntradaDiario[], turma: string, nome: string, ids: string[] = []): string {
  if (!Array.isArray(entradas) || !entradas.length) return "";
  const t = chaveTurma(turma);
  const primeiro = chave(nome).split(" ")[0];
  const doAluno = (e: EntradaDiario) =>
    (e.alunoIds ?? []).some((id) => ids.includes(id)) ||
    (primeiro.length > 2 && new RegExp(`\\b${primeiro}\\b`).test(chave(`${e.title ?? ""} ${e.text ?? ""}`)));
  const escolhidas = entradas
    .filter((e) => doAluno(e) || (t && e.turma && chaveTurma(e.turma) === t))
    .filter((e) => (e.text ?? e.title ?? "").trim())
    .slice(0, 8);
  if (!escolhidas.length) return "";
  return [
    "Diário de bordo da turma (aulas recentes)",
    ...escolhidas.map(
      (e) =>
        `  - ${[e.date, e.title, (e.text ?? "").slice(0, 240), e.tags?.length ? `(${e.tags.join(", ")})` : ""]
          .filter(Boolean)
          .join(" · ")}${doAluno(e) ? " [cita o aluno]" : ""}`,
    ),
  ].join("\n");
}
