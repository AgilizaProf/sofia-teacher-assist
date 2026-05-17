import {
  AlignmentType, BorderStyle, Document, HeadingLevel, PageOrientation,
  Packer, Paragraph, TextRun,
} from "docx";
import type { RelatorioDocumento, RelatorioBnccItem, RelatorioAreaSimples } from "./relatorioTypes";
import { tituloRelatorio, nomeArquivo } from "./relatorioTypes";
import { formatarDataBR } from "./relatorioPeriodo";
import { formatarFraseLegalRelatorio } from "./relatorioLeis";

const ARIAL = "Arial";
const FRAUNCES = "Fraunces";

function run(text: string, opts: { bold?: boolean; size?: number; font?: string; color?: string; italics?: boolean } = {}) {
  return new TextRun({
    text,
    bold: opts.bold,
    italics: opts.italics,
    color: opts.color,
    size: opts.size ?? 24,
    font: opts.font ?? ARIAL,
  });
}

function p(
  children: TextRun[],
  opts: { align?: (typeof AlignmentType)[keyof typeof AlignmentType]; spacingAfter?: number; pageBreakBefore?: boolean; borderTop?: boolean } = {},
) {
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

function metaLine(label: string, value: string) {
  return p([run(`${label}: `, { bold: true }), run(value || "—")], { align: AlignmentType.LEFT, spacingAfter: 40 });
}

function secaoTitulo(text: string) {
  return p([run(text, { bold: true })], { align: AlignmentType.LEFT, spacingAfter: 40, borderTop: true });
}

function texto(text: string) {
  return p([run(text || "—")]);
}

function bnccItens(itens: RelatorioBnccItem[], simples = false): Paragraph[] {
  if (!itens.length) return [texto("—")];
  return itens.map((it) =>
    new Paragraph({
      children: [
        run(`• ${it.codigo}`, { bold: true }),
        ...(it.descricao && !simples ? [run(` — ${it.descricao}`)] : []),
      ],
      spacing: { after: 40 },
    }),
  );
}

function areaItens(itens: RelatorioAreaSimples[]): Paragraph[] {
  if (!itens.length) return [texto("—")];
  return itens.map((a) => new Paragraph({
    children: [run(`• ${a.nome}: `), run(a.status, { bold: true })],
    spacing: { after: 40 },
  }));
}

function buildSection(doc: RelatorioDocumento, opts: { pageBreakBefore?: boolean } = {}): Paragraph[] {
  const isPcd = doc.tipo === "pcd";
  const labelCampos = doc.tipo === "ei" ? "Campos de Experiência" : "Componentes Curriculares";
  const corpo: Paragraph[] = [];

  corpo.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    heading: HeadingLevel.TITLE,
    children: [new TextRun({ text: tituloRelatorio(doc), bold: true, size: 56, font: FRAUNCES })],
    spacing: { after: 120 },
    pageBreakBefore: opts.pageBreakBefore,
  }));
  corpo.push(p(
    [run(`${doc.periodo} — ${formatarDataBR(doc.dataInicio)} a ${formatarDataBR(doc.dataFim)}`)],
    { align: AlignmentType.CENTER, spacingAfter: 200 },
  ));

  corpo.push(metaLine("Nome da Escola", doc.escola));
  corpo.push(metaLine("Turma", doc.turmaNome));
  corpo.push(metaLine("Nome do(a) Professor(a)", doc.professor));
  corpo.push(metaLine("Nome do(a) Aluno(a)", doc.alunoNome));
  if (doc.dataNascimento) corpo.push(metaLine("Data de Nascimento", doc.dataNascimento));
  corpo.push(metaLine("Ano de Referência", doc.anoReferencia || ""));
  if (isPcd) {
    corpo.push(metaLine("Diagnóstico(s) / CID(s)", doc.diagnostico || (doc.cids ?? []).join(", ")));
    corpo.push(metaLine("Ano de Referência Pedagógico", doc.anoReferenciaPedagogico || ""));
  }

  if (doc.modo === "completo") {
    corpo.push(secaoTitulo("Desenvolvimento Global:"));
    corpo.push(texto(doc.desenvolvimentoGlobal));

    corpo.push(secaoTitulo(`${labelCampos}:`));
    for (const c of doc.campos) {
      corpo.push(p(
        [run(`${c.nome}: `, { bold: true }), run(c.descricao || "—")],
        { spacingAfter: 60 },
      ));
    }

    corpo.push(secaoTitulo("Habilidades BNCC Trabalhadas:"));
    corpo.push(...bnccItens(doc.bncc));

    corpo.push(secaoTitulo("Observações do(a) Professor(a):"));
    corpo.push(texto(doc.observacoes));

    corpo.push(secaoTitulo("Avanços e Conquistas:"));
    corpo.push(texto(doc.avancos));

    corpo.push(secaoTitulo("Próximos Passos:"));
    corpo.push(texto(doc.proximosPassos));

    if (isPcd) {
      corpo.push(secaoTitulo("Adaptações Realizadas:"));
      corpo.push(texto(doc.adaptacoes || ""));
      corpo.push(secaoTitulo("Evolução em Relação ao PEI:"));
      corpo.push(texto(doc.evolucaoPei || ""));
    }

    if (doc.apoioTeorico) {
      corpo.push(p([run("Apoio Teórico:", { bold: true, size: 22 })], { align: AlignmentType.LEFT, spacingAfter: 40 }));
      corpo.push(p([new TextRun({ text: doc.apoioTeorico, size: 20, italics: true, color: "666666", font: ARIAL })]));
    }
  } else {
    corpo.push(secaoTitulo("Avaliação por Área:"));
    corpo.push(...areaItens(doc.areas ?? []));
    corpo.push(secaoTitulo("Habilidades BNCC:"));
    corpo.push(...bnccItens(doc.bncc, true));
    corpo.push(secaoTitulo("Observações:"));
    corpo.push(texto(doc.observacoes));
  }

  corpo.push(p([run("Assinatura do(a) Professor(a):", { bold: true })], { align: AlignmentType.LEFT, spacingAfter: 400 }));
  corpo.push(p([run("_____________________________________")], { align: AlignmentType.LEFT, spacingAfter: 40 }));
  corpo.push(p([run("Nome completo / Data")], { align: AlignmentType.LEFT, spacingAfter: 240 }));
  corpo.push(p([run("Assinatura da Coordenação Pedagógica:", { bold: true })], { align: AlignmentType.LEFT, spacingAfter: 400 }));
  corpo.push(p([run("_____________________________________")], { align: AlignmentType.LEFT, spacingAfter: 40 }));
  corpo.push(p([run("Nome completo / Data")], { align: AlignmentType.LEFT, spacingAfter: 360 }));
  if (isPcd) {
    corpo.push(p([run("Ciente do(a) Responsável:", { bold: true })], { align: AlignmentType.LEFT, spacingAfter: 400 }));
    corpo.push(p([run("_____________________________________")], { align: AlignmentType.LEFT, spacingAfter: 40 }));
    corpo.push(p([run("Nome completo / Data")], { align: AlignmentType.LEFT, spacingAfter: 360 }));
  }

  corpo.push(p(
    [new TextRun({ text: formatarFraseLegalRelatorio(doc.leis), size: 20, font: ARIAL, color: "666666" })],
    { align: AlignmentType.CENTER, spacingAfter: 0, borderTop: true },
  ));

  return corpo;
}

function pageProps() {
  const cmToTwips = (cm: number) => Math.round((cm / 2.54) * 1440);
  const margin = cmToTwips(2);
  const border = { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 24 };
  return {
    margin: { top: margin, bottom: margin, left: margin, right: margin },
    size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT },
    borders: {
      pageBorderTop: border, pageBorderBottom: border,
      pageBorderLeft: border, pageBorderRight: border,
    },
  };
}

function baixar(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement("a");
  a.href = url; a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportarRelatorioDocx(doc: RelatorioDocumento): Promise<void> {
  const corpo = buildSection(doc);
  const document = new Document({
    creator: "AgilizaProf",
    styles: { default: { document: { run: { font: ARIAL, size: 24 } } } },
    sections: [{ properties: { page: pageProps() }, children: corpo }],
  });
  const blob = await Packer.toBlob(document);
  baixar(blob, nomeArquivo(doc, "docx"));
}

/** Exporta um arquivo .docx único contendo vários relatórios (quebra de página entre alunos). */
export async function exportarRelatoriosDocxLote(docs: RelatorioDocumento[]): Promise<void> {
  if (docs.length === 0) return;
  const children: Paragraph[] = [];
  docs.forEach((d, i) => children.push(...buildSection(d, { pageBreakBefore: i > 0 })));
  const document = new Document({
    creator: "AgilizaProf",
    styles: { default: { document: { run: { font: ARIAL, size: 24 } } } },
    sections: [{ properties: { page: pageProps() }, children }],
  });
  const blob = await Packer.toBlob(document);
  baixar(blob, `relatorios-lote-${docs.length}.docx`);
}

/** Gera blob individual de um relatório (para empacotar em .zip). */
export async function gerarBlobRelatorioDocx(doc: RelatorioDocumento): Promise<Blob> {
  const corpo = buildSection(doc);
  const document = new Document({
    creator: "AgilizaProf",
    styles: { default: { document: { run: { font: ARIAL, size: 24 } } } },
    sections: [{ properties: { page: pageProps() }, children: corpo }],
  });
  return Packer.toBlob(document);
}

/** Empacota vários relatórios em .zip com um .docx por aluno. */
export async function exportarRelatoriosZip(docs: RelatorioDocumento[]): Promise<void> {
  if (docs.length === 0) return;
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const d of docs) {
    const blob = await gerarBlobRelatorioDocx(d);
    zip.file(nomeArquivo(d, "docx"), blob);
  }
  const out = await zip.generateAsync({ type: "blob" });
  baixar(out, `relatorios-${docs.length}-alunos.zip`);
}