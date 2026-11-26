// Parte Word da anamnese, carregada só quando a professora baixa o .docx.
import {
  AlignmentType, BorderStyle, Document, PageOrientation,
  Packer, Paragraph, TextRun,
} from "docx";
import {
  type AnamneseData,
  SECOES_ORDEM,
  IDENT_ORDEM,
  fmtDateBR,
  valOrDash,
  leisAplicaveis,
} from "./anamnesePrint";

/* ───────────────────── Word (.docx) ───────────────────── */

const ARIAL = "Arial";
const FRAUNCES = "Sora";

function run(text: string, opts: { bold?: boolean; size?: number; font?: string; italics?: boolean; color?: string } = {}) {
  return new TextRun({
    text,
    bold: opts.bold,
    italics: opts.italics,
    size: opts.size ?? 24, // 12pt = 24 half-points
    font: opts.font ?? ARIAL,
    color: opts.color,
  });
}

function p(children: TextRun[], opts: { align?: (typeof AlignmentType)[keyof typeof AlignmentType]; spacingAfter?: number; borderTop?: boolean; keepNext?: boolean; keepLines?: boolean } = {}): Paragraph {
  return new Paragraph({
    children,
    alignment: opts.align ?? AlignmentType.JUSTIFIED,
    spacing: { after: opts.spacingAfter ?? 80 },
    keepNext: opts.keepNext,
    keepLines: opts.keepLines,
    border: opts.borderTop
      ? { top: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 6 } }
      : undefined,
  });
}

function identRowDocx(label: string, value: string): Paragraph {
  return p(
    [run(`${label}: `, { bold: true }), run(value)],
    { align: AlignmentType.LEFT, spacingAfter: 40 },
  );
}

function secaoDocx(titulo: string, conteudo: string): Paragraph[] {
  const out: Paragraph[] = [];
  out.push(p(
    [run(titulo, { bold: true })],
    { align: AlignmentType.LEFT, borderTop: true, spacingAfter: 80, keepNext: true },
  ));
  const linhas = valOrDash(conteudo).split(/\n+/);
  for (const linha of linhas) {
    out.push(p([run(linha)], { spacingAfter: 60 }));
  }
  return out;
}

function assinaturaDocx(titulo: string, legenda: string): Paragraph[] {
  return [
    p([run(titulo, { bold: true })], { align: AlignmentType.LEFT, spacingAfter: 240, keepNext: true, keepLines: true }),
    new Paragraph({
      children: [run("_________________________________________________")],
      alignment: AlignmentType.LEFT,
      spacing: { after: 40 },
      keepNext: true,
      keepLines: true,
    }),
    p([run(legenda, { size: 22 })], { align: AlignmentType.LEFT, spacingAfter: 240, keepLines: true }),
  ];
}

export async function exportAnamneseDocx(data: AnamneseData): Promise<Blob> {
  const { identificacao, secoes } = data;

  const children: Paragraph[] = [];

  // Título (Fraunces 28pt = 56 half-points)
  children.push(p(
    [run("ANAMNESE ESCOLAR", { bold: true, size: 56, font: FRAUNCES })],
    { align: AlignmentType.CENTER, spacingAfter: 80 },
  ));
  children.push(p(
    [run("Registro de História de Vida e Desenvolvimento do(a) Aluno(a)")],
    { align: AlignmentType.CENTER, spacingAfter: 80 },
  ));
  children.push(p(
    [run(`Data de preenchimento: ${fmtDateBR(identificacao.dataPreenchimento)}`)],
    { align: AlignmentType.CENTER, spacingAfter: 80 },
  ));
  children.push(p(
    [run(
      "⚠️ Documento confidencial — uso exclusivo da equipe pedagógica. Informações protegidas pela Lei 13.709/2018 (LGPD).",
      { size: 20, italics: true, color: "333333" },
    )],
    { align: AlignmentType.CENTER, spacingAfter: 120 },
  ));

  // Linha separadora
  children.push(new Paragraph({
    children: [run("")],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 6 } },
    spacing: { after: 160 },
  }));

  // Identificação
  for (const [k, label] of IDENT_ORDEM) {
    const raw = identificacao[k];
    const value = (k === "dataNascimento" || k === "dataPreenchimento")
      ? fmtDateBR(raw as string | undefined)
      : valOrDash(raw);
    children.push(identRowDocx(label, value));
  }

  // Seções
  if (data.secoesCustom && data.secoesCustom.length > 0) {
    for (const sec of data.secoesCustom) {
      children.push(...secaoDocx(sec.titulo.toUpperCase(), valOrDash(sec.conteudo)));
    }
  } else {
    for (const [k, titulo] of SECOES_ORDEM) {
      children.push(...secaoDocx(titulo, valOrDash((secoes ?? {})[k])));
    }
  }

  // Declaração + assinaturas (mantidas juntas o quanto possível)
  children.push(p(
    [
      run("Declaração do(a) Responsável: ", { bold: true }),
      run("Declaro que as informações prestadas nesta anamnese são verdadeiras e autorizo seu uso para fins pedagógicos e de acompanhamento escolar do(a) aluno(a)."),
    ],
    { borderTop: true, spacingAfter: 200, keepNext: true, keepLines: true },
  ));
  children.push(...assinaturaDocx(
    "Assinatura do(a) Responsável Legal:",
    "Nome completo / Data / Parentesco",
  ));
  children.push(...assinaturaDocx(
    "Assinatura do(a) Professor(a) ou Especialista Responsável pelo Preenchimento:",
    "Nome completo / Data",
  ));
  children.push(...assinaturaDocx(
    "Assinatura da Coordenação Pedagógica:",
    "Nome completo / Data",
  ));

  // Rodapé legal
  const leis = leisAplicaveis(identificacao.diagnosticoCid || "").join(" · ");
  children.push(p(
    [run(
      `Documento gerado com apoio do AgilizaProf. As informações contidas nesta anamnese são confidenciais e destinadas exclusivamente ao uso pedagógico, em conformidade com: ${leis}.`,
      { size: 20, color: "666666" },
    )],
    { align: AlignmentType.CENTER, borderTop: true, spacingAfter: 0 },
  ));

  const doc = new Document({
    creator: "AgilizaProf",
    title: `Anamnese — ${identificacao.nomeAluno || ""}`,
    styles: {
      default: { document: { run: { font: ARIAL, size: 24 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT }, // A4
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }, // 2cm = 1134 DXA
          borders: {
            pageBorderTop: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 16 },
            pageBorderRight: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 16 },
            pageBorderBottom: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 16 },
            pageBorderLeft: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 16 },
          },
        },
      },
      children,
    }],
  });

  return Packer.toBlob(doc);
}

