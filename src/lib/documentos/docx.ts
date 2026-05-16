import {
  AlignmentType, BorderStyle, Document, HeadingLevel, PageOrientation,
  Packer, Paragraph, TabStopPosition, TabStopType, TextRun,
} from "docx";
import type { DocumentoPlanejamento, DiaPlanejamento, ObjetivoItem } from "./types";
import { formatarDataBR } from "./builders";
import { formatarFraseLegal } from "./leis";

const ARIAL = "Arial";
const FRAUNCES = "Fraunces";

function run(text: string, opts: { bold?: boolean; size?: number; font?: string } = {}) {
  return new TextRun({
    text,
    bold: opts.bold,
    size: opts.size ?? 24, // 12pt = 24 half-points
    font: opts.font ?? ARIAL,
  });
}

function paragraph(children: TextRun[], opts: { align?: (typeof AlignmentType)[keyof typeof AlignmentType]; spacingAfter?: number; pageBreakBefore?: boolean; borderTop?: boolean } = {}) {
  return new Paragraph({
    children,
    alignment: opts.align ?? AlignmentType.JUSTIFIED,
    spacing: { after: opts.spacingAfter ?? 80 },
    pageBreakBefore: opts.pageBreakBefore,
    border: opts.borderTop
      ? { top: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 6 } }
      : undefined,
  });
}

function objetivoItens(itens: ObjetivoItem[]): Paragraph[] {
  return itens.map((it) =>
    new Paragraph({
      children: [
        run(`• ${it.texto}`),
        ...(it.bncc
          ? [new TextRun({ text: `\t${it.bncc}`, size: 24, font: ARIAL })]
          : []),
      ],
      tabStops: it.bncc
        ? [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX, leader: "dot" }]
        : undefined,
      spacing: { after: 40 },
    }),
  );
}

function bulletList(items: string[]): Paragraph[] {
  return items.map((t) =>
    new Paragraph({
      children: [run(`• ${t}`)],
      spacing: { after: 40 },
    }),
  );
}

function diaCompleto(d: DiaPlanejamento): Paragraph[] {
  const out: Paragraph[] = [];
  out.push(paragraph(
    [run(`${formatarDataBR(d.data)} — ${d.diaSemana}`, { bold: true })],
    { align: AlignmentType.LEFT, borderTop: true, pageBreakBefore: d.novaSemana, spacingAfter: 120 },
  ));
  out.push(paragraph([run("Atividades:", { bold: true })], { align: AlignmentType.LEFT, spacingAfter: 40 }));
  out.push(paragraph([run(d.atividades || "—")]));
  out.push(paragraph([run("Objetivos:", { bold: true })], { align: AlignmentType.LEFT, spacingAfter: 40 }));
  if (d.objetivos.length === 0) out.push(paragraph([run("—")]));
  else out.push(...objetivoItens(d.objetivos));
  out.push(paragraph([run("Materiais e Recursos Utilizados:", { bold: true })], { align: AlignmentType.LEFT, spacingAfter: 40 }));
  if (d.materiais.length === 0) out.push(paragraph([run("—")]));
  else out.push(...bulletList(d.materiais));
  return out;
}

function diaSimplificado(d: DiaPlanejamento): Paragraph[] {
  const out: Paragraph[] = [];
  out.push(paragraph(
    [run(`${formatarDataBR(d.data)} — ${d.diaSemana}`, { bold: true })],
    { align: AlignmentType.LEFT, borderTop: true, pageBreakBefore: d.novaSemana, spacingAfter: 120 },
  ));
  out.push(paragraph([run("Atividades:", { bold: true })], { align: AlignmentType.LEFT, spacingAfter: 40 }));
  const itens = (d.atividadesItens && d.atividadesItens.length ? d.atividadesItens : d.objetivos);
  if (itens.length === 0) out.push(paragraph([run("—")]));
  else out.push(...objetivoItens(itens));
  if (d.materiais.length > 0) {
    out.push(paragraph([run("Materiais e Recursos:", { bold: true })], { align: AlignmentType.LEFT, spacingAfter: 40 }));
    out.push(...bulletList(d.materiais));
  }
  return out;
}

export async function exportarDocx(doc: DocumentoPlanejamento): Promise<void> {
  const inicio = formatarDataBR(doc.dataInicio);
  const fim = formatarDataBR(doc.dataFim);

  const corpo: Paragraph[] = [];
  corpo.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    heading: HeadingLevel.TITLE,
    children: [new TextRun({ text: "PLANEJAMENTO", bold: true, size: 56, font: FRAUNCES })],
    spacing: { after: 120 },
  }));
  corpo.push(paragraph([run(`${inicio} a ${fim}`)], { align: AlignmentType.CENTER, spacingAfter: 200 }));
  corpo.push(paragraph([run("Nome da Escola: ", { bold: true }), run(doc.escola || "—")], { align: AlignmentType.LEFT, spacingAfter: 60 }));
  corpo.push(paragraph([run("Turma: ", { bold: true }), run(doc.turmaNome || "—")], { align: AlignmentType.LEFT, spacingAfter: 60 }));
  corpo.push(paragraph([run("Nome do(a) Professor(a): ", { bold: true }), run(doc.professor || "—")], { align: AlignmentType.LEFT, spacingAfter: 200 }));

  for (const d of doc.dias) {
    corpo.push(...(doc.modo === "completo" ? diaCompleto(d) : diaSimplificado(d)));
  }

  corpo.push(paragraph([run("Assinatura do(a) Professor(a):", { bold: true })], { align: AlignmentType.LEFT, spacingAfter: 400 }));
  corpo.push(paragraph([run("_____________________________________")], { align: AlignmentType.LEFT, spacingAfter: 40 }));
  corpo.push(paragraph([run("Nome completo / Data")], { align: AlignmentType.LEFT, spacingAfter: 240 }));
  corpo.push(paragraph([run("Assinatura da Coordenação Pedagógica:", { bold: true })], { align: AlignmentType.LEFT, spacingAfter: 400 }));
  corpo.push(paragraph([run("_____________________________________")], { align: AlignmentType.LEFT, spacingAfter: 40 }));
  corpo.push(paragraph([run("Nome completo / Data")], { align: AlignmentType.LEFT, spacingAfter: 360 }));

  corpo.push(paragraph(
    [new TextRun({ text: formatarFraseLegal(doc.leis), size: 20, font: ARIAL, color: "555555", italics: true })],
    { align: AlignmentType.CENTER, spacingAfter: 0 },
  ));

  const cmToTwips = (cm: number) => Math.round((cm / 2.54) * 1440);
  const margin = cmToTwips(2);
  const border = { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 24 };

  const document = new Document({
    creator: "AgilizaProf",
    styles: {
      default: { document: { run: { font: ARIAL, size: 24 } } },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: margin, bottom: margin, left: margin, right: margin },
          size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT },
          borders: {
            pageBorderTop: border, pageBorderBottom: border,
            pageBorderLeft: border, pageBorderRight: border,
          },
        },
      },
      children: corpo,
    }],
  });

  const blob = await Packer.toBlob(document);
  const url = URL.createObjectURL(blob);
  const a = document_anchor(url, `planejamento-${doc.dataInicio}-a-${doc.dataFim}.docx`);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function document_anchor(href: string, download: string): HTMLAnchorElement {
  const a = window.document.createElement("a");
  a.href = href;
  a.download = download;
  return a;
}