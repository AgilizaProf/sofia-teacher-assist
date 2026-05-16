import type {
  DiaPlanejamento,
  DocumentoModo,
  DocumentoPlanejamento,
  DocumentoTipo,
  ObjetivoItem,
} from "./types";
import { escolherLeis } from "./leis";

const DIAS_PT = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado",
];

function parseISO(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, day ?? 1);
}
function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoWeek(d: Date): number {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function enumerarDiasUteis(inicio: string, fim: string): string[] {
  const out: string[] = [];
  const start = parseISO(inicio);
  const end = parseISO(fim);
  if (end < start) return out;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) out.push(toISO(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** Origem genérica de "atividades" por data (vinda da agenda/planejamento). */
export type FonteAtividade = {
  data: string;        // YYYY-MM-DD
  titulo: string;
  notas?: string;
  bncc?: string;
  materiais?: string[];
  objetivos?: ObjetivoItem[];
};

function diaVazio(dataISO: string): DiaPlanejamento {
  const d = parseISO(dataISO);
  return {
    data: dataISO,
    diaSemana: DIAS_PT[d.getDay()],
    atividades: "",
    atividadesItens: [],
    objetivos: [],
    materiais: [],
  };
}

function agruparPorData(fontes: FonteAtividade[]): Map<string, FonteAtividade[]> {
  const m = new Map<string, FonteAtividade[]>();
  for (const f of fontes) {
    const arr = m.get(f.data) ?? [];
    arr.push(f);
    m.set(f.data, arr);
  }
  return m;
}

function marcarSemanas(dias: DiaPlanejamento[]): DiaPlanejamento[] {
  let lastWeek: number | null = null;
  return dias.map((d) => {
    const w = isoWeek(parseISO(d.data));
    const nova = lastWeek !== null && w !== lastWeek;
    lastWeek = w;
    return { ...d, novaSemana: nova };
  });
}

export function buildDocumento(args: {
  tipo: DocumentoTipo;
  escola: string;
  turmaId?: string | null;
  turmaNome: string;
  nivelTexto?: string | null;
  professor: string;
  dataInicio: string;
  dataFim: string;
  modo: DocumentoModo;
  fontes?: FonteAtividade[];   // atividades já cadastradas no app
  cidsAlunos?: string[];       // para PCD
}): DocumentoPlanejamento {
  const datas = enumerarDiasUteis(args.dataInicio, args.dataFim);
  const fontesPorData = agruparPorData(args.fontes ?? []);

  const dias = datas.map<DiaPlanejamento>((iso) => {
    const base = diaVazio(iso);
    const fs = fontesPorData.get(iso) ?? [];
    if (fs.length === 0) return base;
    const atividades = fs
      .map((f) => (f.notas ? `${f.titulo} — ${f.notas}` : f.titulo))
      .join("\n");
    const objetivos: ObjetivoItem[] = fs.flatMap((f) => {
      if (f.objetivos && f.objetivos.length) return f.objetivos;
      if (f.bncc) return [{ texto: f.titulo, bncc: f.bncc }];
      return [];
    });
    const materiais = Array.from(
      new Set(fs.flatMap((f) => f.materiais ?? [])),
    );
    const atividadesItens: ObjetivoItem[] = fs.map((f) => ({
      texto: f.titulo,
      bncc: f.bncc,
    }));
    return { ...base, atividades, atividadesItens, objetivos, materiais };
  });

  const leis = escolherLeis({
    tipo: args.tipo,
    nivelTexto: args.nivelTexto,
    cidsAlunos: args.cidsAlunos,
  });

  return {
    tipo: args.tipo,
    escola: args.escola,
    turmaId: args.turmaId ?? null,
    turmaNome: args.turmaNome,
    nivelTexto: args.nivelTexto ?? null,
    professor: args.professor,
    dataInicio: args.dataInicio,
    dataFim: args.dataFim,
    modo: args.modo,
    dias: marcarSemanas(dias),
    leis,
  };
}

export function formatarDataBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}