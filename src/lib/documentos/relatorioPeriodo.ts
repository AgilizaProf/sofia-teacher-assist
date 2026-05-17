export type RelatorioPeriodoTipo =
  | "1bim" | "2bim" | "3bim" | "4bim"
  | "1tri" | "2tri" | "3tri"
  | "1sem" | "2sem"
  | "anual";

export const PERIODOS_RELATORIO: { value: RelatorioPeriodoTipo; label: string }[] = [
  { value: "1bim", label: "1º Bimestre" },
  { value: "2bim", label: "2º Bimestre" },
  { value: "3bim", label: "3º Bimestre" },
  { value: "4bim", label: "4º Bimestre" },
  { value: "1tri", label: "1º Trimestre" },
  { value: "2tri", label: "2º Trimestre" },
  { value: "3tri", label: "3º Trimestre" },
  { value: "1sem", label: "1º Semestre" },
  { value: "2sem", label: "2º Semestre" },
  { value: "anual", label: "Anual" },
];

function iso(y: number, m: number, d: number): string {
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

/** Datas padrão (ano letivo no Brasil ~ fev a dez). Editáveis no formulário. */
export function datasDoPeriodo(tipo: RelatorioPeriodoTipo, ano: number): { inicio: string; fim: string; label: string } {
  const item = PERIODOS_RELATORIO.find((p) => p.value === tipo)!;
  switch (tipo) {
    case "1bim": return { inicio: iso(ano, 2, 1),  fim: iso(ano, 4, 30),  label: item.label };
    case "2bim": return { inicio: iso(ano, 5, 1),  fim: iso(ano, 7, 15),  label: item.label };
    case "3bim": return { inicio: iso(ano, 8, 1),  fim: iso(ano, 9, 30),  label: item.label };
    case "4bim": return { inicio: iso(ano, 10, 1), fim: iso(ano, 12, 20), label: item.label };
    case "1tri": return { inicio: iso(ano, 2, 1),  fim: iso(ano, 5, 31),  label: item.label };
    case "2tri": return { inicio: iso(ano, 6, 1),  fim: iso(ano, 8, 31),  label: item.label };
    case "3tri": return { inicio: iso(ano, 9, 1),  fim: iso(ano, 12, 20), label: item.label };
    case "1sem": return { inicio: iso(ano, 2, 1),  fim: iso(ano, 7, 15),  label: item.label };
    case "2sem": return { inicio: iso(ano, 8, 1),  fim: iso(ano, 12, 20), label: item.label };
    case "anual": return { inicio: iso(ano, 2, 1), fim: iso(ano, 12, 20), label: item.label };
  }
}

export function formatarDataBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}