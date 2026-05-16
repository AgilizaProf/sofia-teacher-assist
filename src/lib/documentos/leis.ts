import { inferirNivelEnsino, type NivelEnsino } from "@/lib/sofia/nivelEnsino";
import type { DocumentoTipo } from "./types";

export function escolherLeis(args: {
  tipo: DocumentoTipo;
  /** Ano/Série da turma (texto livre como em `turma.ano`). */
  nivelTexto?: string | null;
  /** CIDs de alunos PCD presentes (opcional). */
  cidsAlunos?: string[];
}): string[] {
  const out: string[] = ["Lei 9.394/1996 (LDB)"];
  const nivel: NivelEnsino | null = inferirNivelEnsino(args.nivelTexto ?? null);
  const isEI = nivel === "Educação Infantil";
  out.push(
    isEI ? "Resolução CNE/CP 2/2017 (BNCC)" : "Resolução CNE/CP 4/2018 (BNCC)",
  );
  if (args.tipo === "pcd") {
    out.push("Lei 13.146/2015 (LBI)");
    const cids = (args.cidsAlunos ?? []).map((c) => c.toUpperCase());
    if (cids.some((c) => c.startsWith("F84"))) out.push("Lei 12.764/2012 (TEA)");
    if (cids.some((c) => c.startsWith("F90") || c.startsWith("F81"))) {
      out.push("Lei 14.254/2021 (TDAH/Dislexia)");
    }
  }
  return Array.from(new Set(out));
}

export function formatarFraseLegal(leis: string[]): string {
  if (leis.length === 0) return "Documento gerado com apoio do AgilizaProf.";
  if (leis.length === 1) {
    return `Documento gerado com apoio do AgilizaProf em consonância com a ${leis[0]}.`;
  }
  const inicio = leis.slice(0, -1).join(", ");
  const fim = leis[leis.length - 1];
  return `Documento gerado com apoio do AgilizaProf em consonância com a ${inicio} e a ${fim}.`;
}