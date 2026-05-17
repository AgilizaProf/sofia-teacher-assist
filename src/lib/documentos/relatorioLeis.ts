import { inferirNivelEnsino } from "@/lib/sofia/nivelEnsino";
import type { RelatorioTipo } from "./relatorioTypes";

export function escolherLeisRelatorio(args: {
  tipo: RelatorioTipo;
  nivelTexto?: string | null;
  cidsAluno?: string[];
  frequentaAee?: boolean;
}): string[] {
  const out: string[] = ["Lei 9.394/1996 (LDB)"];
  const nivel = inferirNivelEnsino(args.nivelTexto ?? null);
  const isEI = nivel === "Educação Infantil" || args.tipo === "ei";
  out.push(isEI ? "Resolução CNE/CP 2/2017 (BNCC)" : "Resolução CNE/CP 4/2018 (BNCC)");

  if (args.tipo === "pcd") {
    out.push("Lei 13.146/2015 (LBI)");
    const cids = (args.cidsAluno ?? []).map((c) => c.toUpperCase());
    if (cids.some((c) => c.startsWith("F84"))) out.push("Lei 12.764/2012 (TEA)");
    if (cids.some((c) => c.startsWith("F90") || c.startsWith("F81"))) {
      out.push("Lei 14.254/2021 (TDAH/Dislexia)");
    }
    if (args.frequentaAee) out.push("Decreto 7.611/2011 (AEE)");
  }
  return Array.from(new Set(out));
}

export function formatarFraseLegalRelatorio(leis: string[]): string {
  if (leis.length === 0) return "Documento gerado com apoio do AgilizaProf.";
  if (leis.length === 1) {
    return `Documento gerado com apoio do AgilizaProf em consonância com a ${leis[0]}.`;
  }
  const inicio = leis.slice(0, -1).join(", ");
  const fim = leis[leis.length - 1];
  return `Documento gerado com apoio do AgilizaProf em consonância com a ${inicio} e a ${fim}.`;
}