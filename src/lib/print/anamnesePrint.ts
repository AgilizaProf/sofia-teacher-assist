/**
 * Anamnese Escolar — gerador de documento (HTML/print/PDF e Word .docx)
 * no mesmo padrão visual usado em Relatório, Planejamento e PEI:
 *   • A4, margens 2cm, borda 1px solid #000 em todo o documento
 *   • Título "ANAMNESE ESCOLAR" em Fraunces 28px bold, centralizado
 *   • Arial 12 no corpo, justificado
 *   • Identificação com labels em negrito
 *   • Seções em CAIXA ALTA separadas por linha horizontal
 *   • Bloco de assinaturas (Responsável, Professor(a), Coordenação)
 *   • Rodapé com fundamentação legal (Arial 10, #666666)
 *
 * Este módulo é puramente de apresentação — recebe os dados já cadastrados
 * e produz o documento final. Não altera lógica/dados de outras features.
 */

import {
  AlignmentType, BorderStyle, Document, PageOrientation,
  Packer, Paragraph, TextRun,
} from "docx";

/* ───────────────────────── Tipos ───────────────────────── */

export interface AnamneseIdentificacao {
  nomeAluno?: string;
  dataNascimento?: string;
  idade?: string | number;
  sexo?: string;
  naturalidade?: string;
  diagnosticoCid?: string;
  responsavelNome?: string;
  parentesco?: string;
  contato?: string;
  endereco?: string;
  escola?: string;
  turma?: string;
  anoMatricula?: string | number;
  anoReferencia?: string | number;
  professorNome?: string;
  dataPreenchimento?: string;
  preenchidoPor?: string;
}

export interface AnamneseSecoes {
  historiaGestacional?: string;
  desenvolvimentoPrimeiraInfancia?: string;
  historicoSaude?: string;
  historicoEscolarAnterior?: string;
  contextoFamiliarSocial?: string;
  rotinaComportamento?: string;
  comunicacaoLinguagem?: string;
  habilidadesInteresses?: string;
  atendimentosTerapias?: string;
  observacoesGerais?: string;
}

export interface AnamneseData {
  identificacao: AnamneseIdentificacao;
  secoes: AnamneseSecoes;
}

const SECOES_ORDEM: Array<[keyof AnamneseSecoes, string]> = [
  ["historiaGestacional", "HISTÓRIA GESTACIONAL E NASCIMENTO"],
  ["desenvolvimentoPrimeiraInfancia", "DESENVOLVIMENTO NA PRIMEIRA INFÂNCIA"],
  ["historicoSaude", "HISTÓRICO DE SAÚDE"],
  ["historicoEscolarAnterior", "HISTÓRICO ESCOLAR ANTERIOR"],
  ["contextoFamiliarSocial", "CONTEXTO FAMILIAR E SOCIAL"],
  ["rotinaComportamento", "ROTINA E COMPORTAMENTO"],
  ["comunicacaoLinguagem", "COMUNICAÇÃO E LINGUAGEM"],
  ["habilidadesInteresses", "HABILIDADES E INTERESSES"],
  ["atendimentosTerapias", "ATENDIMENTOS E TERAPIAS"],
  ["observacoesGerais", "OBSERVAÇÕES GERAIS"],
];

const IDENT_ORDEM: Array<[keyof AnamneseIdentificacao, string]> = [
  ["nomeAluno", "Nome do(a) Aluno(a)"],
  ["dataNascimento", "Data de Nascimento"],
  ["idade", "Idade"],
  ["sexo", "Sexo"],
  ["naturalidade", "Naturalidade"],
  ["diagnosticoCid", "Diagnóstico(s)/CID(s)"],
  ["responsavelNome", "Nome do(a) Responsável"],
  ["parentesco", "Parentesco"],
  ["contato", "Contato"],
  ["endereco", "Endereço"],
  ["escola", "Escola"],
  ["turma", "Turma"],
  ["anoMatricula", "Ano de Matrícula"],
  ["anoReferencia", "Ano de Referência Pedagógico"],
  ["professorNome", "Nome do(a) Professor(a)"],
  ["dataPreenchimento", "Data de Preenchimento"],
  ["preenchidoPor", "Preenchido por"],
];

/* ───────────────────── Utilidades ───────────────────── */

function escHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtDateBR(v: string | undefined | null): string {
  const s = (v ?? "").toString().trim();
  if (!s) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

function valOrDash(v: unknown): string {
  const s = String(v ?? "").trim();
  return s || "—";
}

function leisAplicaveis(cid: string): string[] {
  const base = [
    "Lei 9.394/1996 (LDB)",
    "Lei 13.146/2015 (LBI)",
    "Lei 13.709/2018 (LGPD)",
    "ECA — Lei 8.069/1990",
  ];
  const c = (cid || "").toUpperCase();
  if (/F84/.test(c)) base.push("Lei 12.764/2012 (TEA)");
  if (/F90|F81/.test(c)) base.push("Lei 14.254/2021 (TDAH/Dislexia)");
  return base;
}

/* ───────────────────── HTML / Print / PDF ───────────────────── */

function buildIdentificacaoHtml(id: AnamneseIdentificacao): string {
  return IDENT_ORDEM
    .map(([k, label]) => {
      const raw = id[k];
      const value = (k === "dataNascimento" || k === "dataPreenchimento")
        ? fmtDateBR(raw as string | undefined)
        : valOrDash(raw);
      return `<div class="ident-row"><b>${escHtml(label)}:</b> ${escHtml(value)}</div>`;
    })
    .join("\n");
}

function buildCorpoHtml(secoes: AnamneseSecoes): string {
  return SECOES_ORDEM
    .map(([k, titulo]) => {
      const conteudo = valOrDash(secoes[k]);
      const paragrafos = conteudo
        .split(/\n+/)
        .map((line) => `<p>${escHtml(line)}</p>`)
        .join("");
      return `<section class="doc-secao"><h2>${escHtml(titulo)}</h2>${paragrafos}</section>`;
    })
    .join("\n");
}

function buildAssinaturasHtml(): string {
  return `<section class="doc-assinaturas">
    <p class="declaracao"><b>Declaração do(a) Responsável:</b> Declaro que as informações prestadas nesta anamnese são verdadeiras e autorizo seu uso para fins pedagógicos e de acompanhamento escolar do(a) aluno(a).</p>
    <div class="assinatura">
      <div class="titulo">Assinatura do(a) Responsável Legal:</div>
      <div class="linha"></div>
      <div class="legenda">Nome completo / Data / Parentesco</div>
    </div>
    <div class="assinatura">
      <div class="titulo">Assinatura do(a) Professor(a) ou Especialista Responsável pelo Preenchimento:</div>
      <div class="linha"></div>
      <div class="legenda">Nome completo / Data</div>
    </div>
    <div class="assinatura">
      <div class="titulo">Assinatura da Coordenação Pedagógica:</div>
      <div class="linha"></div>
      <div class="legenda">Nome completo / Data</div>
    </div>
  </section>`;
}

function buildRodapeHtml(cid: string): string {
  const leis = leisAplicaveis(cid).join(" · ");
  return `<hr class="rodape-sep"/>
    <p class="rodape">Documento gerado com apoio do AgilizaProf. As informações contidas nesta anamnese são confidenciais e destinadas exclusivamente ao uso pedagógico, em conformidade com: ${escHtml(leis)}.</p>`;
}

export function buildAnamnesePrintHtml(data: AnamneseData): string {
  const { identificacao, secoes } = data;
  const titulo = "ANAMNESE ESCOLAR";
  const subtitulo = "Registro de História de Vida e Desenvolvimento do(a) Aluno(a)";
  const dataPreench = `Data de preenchimento: ${fmtDateBR(identificacao.dataPreenchimento)}`;

  const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700&display=swap');

*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:#e5e5e5;}
body{font-family:Arial,Helvetica,sans-serif;color:#000;font-size:12pt;line-height:1.45;}

.toolbar{position:fixed;top:12px;right:12px;z-index:99;}
.toolbar button{font:13px/1 Arial,Helvetica,sans-serif;padding:8px 14px;border:1px solid #888;background:#fff;border-radius:6px;cursor:pointer;}

.documento{
  width:21cm;min-height:29.7cm;background:#fff;
  border:1px solid #000;padding:2cm;margin:24px auto;
  text-align:justify;box-shadow:0 4px 18px rgba(0,0,0,.12);
}

.documento h1.title{
  font-family:'Fraunces',Georgia,'Times New Roman',serif;
  font-weight:700;font-size:28px;text-align:center;
  margin:0 0 6px;color:#000;
}
.documento .subtitle{text-align:center;font-size:12pt;margin:0 0 6px;}
.documento .data-preench{text-align:center;font-size:12pt;margin:0 0 8px;}
.documento .confidencial{
  text-align:center;font-size:10pt;font-style:italic;
  margin:0 0 10px;color:#333;
}
.documento .sep{border:0;border-top:1px solid #000;margin:8px 0 14px;}

.documento .doc-ident{text-align:left;margin:0 0 16px;}
.documento .ident-row{margin:2px 0;text-align:left;}
.documento .ident-row b{font-weight:700;}

.documento .doc-secao{margin:6px 0;text-align:justify;}
.documento .doc-secao h2{
  font-family:Arial,Helvetica,sans-serif;
  font-size:12pt;font-weight:700;text-transform:uppercase;
  margin:0 0 6px;color:#000;text-align:left;
}
.documento .doc-secao p{margin:0 0 6px;text-align:justify;}
.documento .doc-secao + .doc-secao{border-top:1px solid #000;padding-top:8px;margin-top:10px;}

.documento .doc-assinaturas{margin-top:28px;text-align:left;page-break-inside:avoid;break-inside:avoid;}
.documento .doc-assinaturas .declaracao{margin:0 0 16px;text-align:justify;}
.documento .doc-assinaturas .assinatura{margin:18px 0;page-break-inside:avoid;break-inside:avoid;}
.documento .doc-assinaturas .titulo{font-weight:700;margin-bottom:18px;}
.documento .doc-assinaturas .linha{border-bottom:1px solid #000;height:1px;margin:0 0 4px;}
.documento .doc-assinaturas .legenda{font-size:11pt;}

.documento .rodape-sep{border:0;border-top:1px solid #000;margin:24px 0 12px;}
.documento .rodape{
  font-family:Arial,Helvetica,sans-serif;
  font-size:10pt;color:#666666;text-align:center;margin:0;
}

@media print{
  @page{size:A4;margin:2cm;}
  body{background:#fff;}
  .toolbar{display:none !important;}
  .documento{
    width:auto;min-height:0;margin:0;padding:0;
    border:1px solid #000;box-shadow:none;
  }
  *{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
}
`;

  const ident = buildIdentificacaoHtml(identificacao);
  const corpo = buildCorpoHtml(secoes);
  const assinaturas = buildAssinaturasHtml();
  const rodape = buildRodapeHtml(identificacao.diagnosticoCid || "");

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Anamnese · ${escHtml(identificacao.nomeAluno || "")}</title>
<style>${css}</style>
</head>
<body>
<div class="toolbar"><button onclick="window.print()">Imprimir / Salvar PDF</button></div>
<article class="documento">
  <h1 class="title">${escHtml(titulo)}</h1>
  <div class="subtitle">${escHtml(subtitulo)}</div>
  <div class="data-preench">${escHtml(dataPreench)}</div>
  <div class="confidencial">⚠️ Documento confidencial — uso exclusivo da equipe pedagógica. Informações protegidas pela Lei 13.709/2018 (LGPD).</div>
  <hr class="sep"/>
  <div class="doc-ident">
    ${ident}
  </div>
  ${corpo}
  ${assinaturas}
  ${rodape}
</article>
</body>
</html>`;
}

export function printAnamneseDocument(data: AnamneseData): void {
  const html = buildAnamnesePrintHtml(data);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
}

/* ───────────────────── Word (.docx) ───────────────────── */

const ARIAL = "Arial";
const FRAUNCES = "Fraunces";

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
  for (const [k, titulo] of SECOES_ORDEM) {
    children.push(...secaoDocx(titulo, valOrDash(secoes[k])));
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

export async function downloadAnamneseDocx(data: AnamneseData, filename?: string): Promise<void> {
  const blob = await exportAnamneseDocx(data);
  const name = filename
    ?? `anamnese-${(data.identificacao.nomeAluno || "aluno").replace(/\s+/g, "_").toLowerCase()}.docx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}