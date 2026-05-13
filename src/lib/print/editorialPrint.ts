/**
 * Gerador de PDFs pedagógicos — layout editorial AgilizaProf.
 * Estilo alinhado ao template oficial:
 *   • Margens A4: 2,2cm topo / 2cm dir / 2,4cm base / 3cm esq
 *   • Faixa azul de cabeçalho 0,6cm (AGILIZAPROF · NOME DO DOC)
 *   • Filete dourado no rodapé + base legal + nº de página
 *   • Capa: eyebrow azul, título Fraunces 28pt preto, filete dourado
 *     3,5cm, subtítulo Fraunces itálico cinza, intro Arial 11pt
 *   • Campos: label bege (borda superior 2px azul) + valor branco,
 *     fechado com linha #DDD na base
 *   • Texto longo IA: caixa branca borda #DDD, padding 15px,
 *     Arial 12pt, line-height 1.6, justificado
 *   • Assinaturas em grid 2×2 com linha cinza
 *
 * Uso:
 *   import {
 *     printEditorial, editorialCover, editorialSection,
 *     editorialField, editorialFieldsGrid, editorialLongField,
 *     editorialHint, editorialSignatures,
 *   } from "@/lib/print/editorialPrint";
 */

export type EditorialDocType =
  | "parecer"
  | "pei"
  | "planejamento"
  | "plano-adaptado"
  | "relatorio"
  | "anamnese";

export interface EditorialPrintOptions {
  docType?: EditorialDocType;
  docLabel?: string;
  legalBase?: string;
  extraCss?: string;
  /** Aceito por compatibilidade com chamadas legadas; não é usado no layout editorial
   *  (a assinatura faz parte do corpo do documento). */
  professorNome?: string;
  /** Compat: assinatura digital legada já vem no corpo. */
  incluirAssinatura?: boolean;
}

const DOC_LABEL: Record<EditorialDocType, string> = {
  parecer: "RELATÓRIO PEDAGÓGICO",
  relatorio: "RELATÓRIO PEDAGÓGICO",
  pei: "PLANO EDUCACIONAL INDIVIDUALIZADO",
  planejamento: "PLANEJAMENTO PEDAGÓGICO",
  "plano-adaptado": "PLANO ADAPTADO",
  anamnese: "ANAMNESE PEDAGÓGICA",
};

const LEGAL_BASE: Record<EditorialDocType, string> = {
  parecer:
    "Fundamentação legal: LDB – Lei nº 9.394/96 (Art. 24, V) | BNCC – Resolução CNE/CP nº 2/2017",
  relatorio:
    "Fundamentação legal: LDB – Lei nº 9.394/96 (Art. 24, V) | BNCC – Resolução CNE/CP nº 2/2017",
  planejamento:
    "Fundamentação legal: LDB – Lei nº 9.394/96 | BNCC – Resolução CNE/CP nº 2/2017",
  pei: "Fundamentação legal: Lei nº 14.254/2021 — Lei do PEI",
  "plano-adaptado":
    "Fundamentação legal: Lei Brasileira de Inclusão — Lei nº 13.146/2015",
  anamnese: "Fundamentação legal: LGPD — Lei nº 13.709/2018",
};

function escHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function escCss(s: string): string {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildCss(legal: string): string {
  return `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&display=swap');

:root{
  --ink:#111111;
  --accent:#1F3A5F;
  --soft:#F5F1EA;
  --divider:#C9B98A;
  --gray:#6B6B6B;
  --border:#DDDDDD;
  --font-title:'Fraunces', Georgia, 'Times New Roman', serif;
  --font-body: Arial, Helvetica, sans-serif;
  --header-h:0.6cm;
}

*{ box-sizing:border-box; }
html,body{ margin:0; padding:0; }
body{
  font-family:var(--font-body);
  color:var(--ink);
  background:#e5e5e5;
  font-size:11pt;
  line-height:1.5;
}

/* ─── Página A4 simulada ─── */
.page-a4{
  width:210mm;
  min-height:297mm;
  background:#fff;
  padding:2.2cm 2cm 2.4cm 3cm;
  margin:2rem auto;
  box-shadow:0 4px 12px rgba(0,0,0,.1);
  position:relative;
}

/* ─── Cabeçalho fixo (faixa azul 0,6cm) ─── */
.page-header{
  position:absolute;
  top:0; left:0; right:0;
  width:100%; height:var(--header-h);
  background:#1F3A5F;
  color:#fff;
  display:flex; align-items:center; justify-content:space-between;
  padding:0 2cm 0 3cm;
  z-index:10;
}
.page-header .brand{
  font-family:var(--font-title); font-weight:700;
  font-size:9pt; letter-spacing:.5px;
}
.page-header .doc{
  font-family:var(--font-body); font-size:8pt;
  letter-spacing:.08em; text-transform:uppercase;
}

/* ─── Rodapé ─── */
.page-footer{
  position:absolute;
  bottom:1.8cm; left:3cm; right:2cm;
  border-top:1.5px solid var(--divider);
  padding-top:.3cm;
  text-align:center;
  z-index:10;
}
.page-footer .title{
  font-family:var(--font-title); font-weight:700;
  font-size:9pt; color:var(--ink); margin-bottom:4px;
}
.page-footer .legal{
  font-size:7.5pt; font-style:italic; color:var(--gray);
}
.page-footer .pagenum{
  position:absolute; right:0; bottom:0;
  font-size:7.5pt; color:var(--gray);
}

/* ─── Capa ─── */
.eyebrow{
  font-family:var(--font-body);
  font-size:9pt; font-weight:700;
  color:var(--accent);
  text-align:center; letter-spacing:.5px;
  margin-bottom:.5rem;
}
h1.title{
  font-family:var(--font-title);
  font-size:28pt; font-weight:700;
  color:var(--ink);
  text-align:center;
  line-height:1.1;
  margin:0 0 .5rem 0;
}
.gold-divider{
  width:3.5cm; height:1.5px;
  background:var(--divider);
  margin:.5rem auto 1rem auto;
  border:0;
}
.subtitle{
  font-family:var(--font-title); font-style:italic;
  font-size:11pt; color:var(--gray);
  text-align:center; margin:0 0 1.5rem 0;
}
p.intro-text{
  font-size:11pt; line-height:1.5; text-align:justify;
  margin:0 0 2rem 0;
}

/* ─── Seções ─── */
h2.section-title{
  font-family:var(--font-title); font-weight:700;
  font-size:14pt; color:var(--accent);
  margin:1.5rem 0 .8rem 0;
}
p.hint{
  font-size:10pt; font-style:italic; color:var(--gray);
  margin:0 0 .8rem 0;
}

/* ─── Campos curtos ─── */
.grid-2{
  display:grid; grid-template-columns:1fr 1fr; gap:10px;
  margin-bottom:1rem;
}
.field-box{
  border-bottom:1px solid var(--border);
  display:flex; flex-direction:column;
  background:#fff;
}
.field-box.full-width{ margin-bottom:10px; }
.field-label{
  background:var(--soft);
  border-top:2px solid var(--accent);
  color:var(--accent);
  font-size:10pt; font-weight:700;
  padding:6px 10px;
  text-transform:uppercase;
  font-family:var(--font-body);
  letter-spacing:.04em;
}
.field-value{
  background:#fff;
  padding:8px 10px 12px 10px;
  font-size:11pt; color:var(--ink);
  line-height:1.3;
}

/* ─── Texto longo (IA) ─── */
.text-block{
  border:1px solid var(--border);
  padding:15px;
  font-size:12pt; line-height:1.6;
  text-align:justify;
  min-height:80px;
  margin:0 0 .5rem 0;
  background:#fff;
  color:var(--ink);
}
.text-block p{ margin:0 0 .6rem 0; }
.text-block p:last-child{ margin:0; }

/* ─── Assinaturas ─── */
.signatures-grid{
  display:grid; grid-template-columns:1fr 1fr;
  gap:2rem 1rem;
  margin:3rem 0 2rem 0;
}
.signature-box{ text-align:center; }
.signature-line{
  width:80%; height:1px;
  background:var(--gray);
  margin:0 auto .5rem auto;
}
.signature-name{ font-size:10pt; color:var(--gray); }

/* ─── Compatibilidade com marcação legada (standardPrint) ───
   permite que bodies já existentes (PEI, Parecer, Inclusão)
   sejam renderizados com o visual editorial sem reescrita. */

/* Capa legada: <section class="doc-cover"> */
.doc-cover{ text-align:center; margin:0 0 1.5rem 0; }
.doc-cover .overline{
  font-family:var(--font-body); font-size:9pt; font-weight:700;
  color:var(--accent); letter-spacing:.5px;
  text-transform:uppercase; margin-bottom:.5rem;
}
.doc-cover h1{
  font-family:var(--font-title); font-weight:700;
  font-size:28pt; color:var(--ink);
  text-align:center; line-height:1.1; margin:0 0 .5rem 0;
  letter-spacing:0;
}
.doc-cover .gold-rule{
  width:3.5cm; height:1.5px; background:var(--divider);
  margin:.5rem auto 1rem auto; border:0;
}
.doc-cover .subtitle{
  font-family:var(--font-title); font-style:italic;
  font-size:11pt; color:var(--gray);
  text-align:center; margin:0 0 1.5rem 0;
}

/* Títulos de seção genéricos h2/h3 (quando não usam .section-title) */
h2{
  font-family:var(--font-title); font-weight:700;
  font-size:14pt; color:var(--accent);
  margin:1.5rem 0 .8rem 0;
}
h3{
  font-family:var(--font-title); font-weight:700;
  font-size:12pt; color:var(--accent);
  margin:1rem 0 .5rem 0;
}

/* Field-box legada (label em cima, conteúdo embaixo) */
.field-box > .label{
  display:block;
  background:var(--soft);
  border-top:2px solid var(--accent);
  color:var(--accent);
  font-family:var(--font-body); font-weight:700;
  font-size:10pt; letter-spacing:.04em;
  text-transform:uppercase;
  padding:6px 10px;
}
.field-box > .content{
  background:#fff;
  padding:8px 10px 12px 10px;
  font-size:11pt; color:var(--ink); line-height:1.3;
}

/* Faixa de seção bege legada */
.section-band{
  background:var(--soft);
  border-left:3pt solid var(--accent);
  padding:6pt 12pt;
  margin:14pt 0 8pt 0;
  font-family:var(--font-title); font-weight:700;
  color:var(--accent); letter-spacing:.04em;
}

/* Bloco genérico legado (.doc-block / .card / .pei-block) */
.doc-block,.card,.pei-block{
  background:#fff;
  border:1px solid var(--border);
  padding:12pt 14pt;
  margin:8pt 0;
}

/* Filete dourado utilitário */
.gold-divider,.gold-rule{ border:0; border-top:1px solid var(--divider); margin:14pt 0; }

/* Listas ordenadas com numeração azul */
ol{ list-style:none; counter-reset:section; padding-left:0; }
ol > li{
  counter-increment:section; position:relative;
  padding-left:1.6em; margin:4pt 0;
}
ol > li::before{
  content: counter(section) ".";
  position:absolute; left:0; top:0;
  color:var(--accent); font-weight:700;
}

/* Tabelas */
table{ width:100%; border-collapse:collapse; margin:8pt 0; }
th,td{
  border-bottom:1px solid var(--border);
  padding:6pt 8pt; vertical-align:top; text-align:left;
  font-size:11pt;
}
th{
  font-family:var(--font-title); font-weight:700;
  color:var(--accent); border-bottom:1px solid var(--divider);
}

/* Assinatura digital legada */
.digital-sig{
  margin-top:26pt; padding:12pt 14pt;
  border:1px solid var(--border); background:var(--soft);
}
.digital-sig .label{
  font-family:var(--font-title); font-weight:700;
  color:var(--accent); font-size:10pt;
  letter-spacing:.08em; text-transform:uppercase; margin-bottom:8pt;
}
.digital-sig .row{ display:flex; justify-content:space-between; gap:16pt; flex-wrap:wrap; font-size:11pt; }
.digital-sig .line{ margin-top:14pt; border-top:1px solid var(--accent); padding-top:4pt; font-size:10pt; color:var(--accent); text-align:center; }
.digital-sig .hint{ margin-top:6pt; font-size:9pt; color:var(--gray); font-style:italic; text-align:center; }

/* Esconde rodapé/cabeçalho legado do standardPrint que possa vir no body */
.print-header,.page-band,.screen-foot{ display:none !important; }

/* ─── Compat: marcação legada do Relatórios (h1, .meta, .kpis, ul.rub, .sig, .foot) ─── */
h1{
  font-family:var(--font-title); font-weight:700;
  font-size:20pt; color:var(--ink);
  margin:0 0 .25rem 0; line-height:1.2;
}
.meta{
  color:var(--gray); font-size:10.5pt;
  margin:0 0 14pt 0;
}
.kpis{
  display:flex; gap:10pt; margin:10pt 0 14pt;
}
.kpi{
  flex:1; border:1px solid var(--border);
  background:var(--soft);
  border-top:2px solid var(--accent);
  padding:8pt 10pt;
}
.kpi small{
  display:block;
  font-family:var(--font-body); font-size:9pt; font-weight:700;
  color:var(--accent); letter-spacing:.06em; text-transform:uppercase;
  margin-bottom:2pt;
}
.kpi b{
  display:block;
  font-family:var(--font-title); font-weight:700;
  font-size:14pt; color:var(--ink);
}
ul.rub{ list-style:none; padding:0; margin:0; }
ul.rub li{
  display:flex; justify-content:space-between; gap:14pt;
  padding:5pt 0; border-bottom:1px dashed var(--border);
  font-size:11pt;
}
ul.rub li b{
  color:var(--accent); font-weight:700; white-space:nowrap;
}
.sig{
  margin-top:36pt;
  display:grid; grid-template-columns:1fr 1fr 1fr; gap:20pt;
}
.sig > div{
  border-top:1px solid var(--gray);
  padding-top:6pt;
  font-size:10pt; color:var(--gray);
  text-align:center;
}
.foot{
  margin-top:24pt; padding-top:8pt;
  border-top:1px solid var(--divider);
  font-size:9pt; color:var(--gray);
  text-align:center; font-style:italic;
}

/* Quebras */
.field-box,.text-block,.signatures-grid,.signature-box,
h1,h2,h3,h4,p{ page-break-inside:avoid; break-inside:avoid; }
h1,h2,h3,h4,.section-title{ page-break-after:avoid; break-after:avoid; }

/* ─── Impressão ─── */
@media print{
  @page{
    size:A4;
    margin:0;
    @bottom-right{
      content: counter(page);
      font-family: Arial,Helvetica,sans-serif;
      font-size:7.5pt; color:#6B6B6B;
    }
    @bottom-left{
      content:"${escCss(legal)}";
      font-family: Arial,Helvetica,sans-serif;
      font-style:italic; font-size:7.5pt; color:#6B6B6B;
    }
  }
  body{ background:transparent; padding:0; display:block; }
  .page-a4{
    box-shadow:none; margin:0;
    page-break-after:always;
  }
  *{
    -webkit-print-color-adjust:exact !important;
    print-color-adjust:exact !important;
    color-adjust:exact !important;
  }
  .toolbar,button,.no-print{ display:none !important; }
}
`;
}

function buildHeader(label: string): string {
  return `<div class="page-header" role="banner">
  <div class="brand">AGILIZAPROF</div>
  <div class="doc">${escHtml(label)}</div>
</div>`;
}

function buildFooter(legal: string): string {
  return `<div class="page-footer">
  <div class="title">Documento gerado pela plataforma AgilizaProf</div>
  <div class="legal">${escHtml(legal)}</div>
  <div class="pagenum"></div>
</div>`;
}

/* ───────── Helpers de conteúdo ───────── */

export function editorialCover(opts: {
  title: string;
  subtitle?: string;
  intro?: string;
  overline?: string;
}): string {
  const overline = opts.overline ?? "DOCUMENTO PEDAGÓGICO • AGILIZAPROF";
  return `<div class="eyebrow">${escHtml(overline)}</div>
<h1 class="title">${escHtml(opts.title)}</h1>
<hr class="gold-divider" aria-hidden="true"/>
${opts.subtitle ? `<p class="subtitle">${escHtml(opts.subtitle)}</p>` : ""}
${opts.intro ? `<p class="intro-text">${escHtml(opts.intro)}</p>` : ""}`;
}

export function editorialSection(title: string, hint?: string): string {
  return `<h2 class="section-title">${escHtml(title)}</h2>${
    hint ? `<p class="hint">${escHtml(hint)}</p>` : ""
  }`;
}

export function editorialField(label: string, value: string, opts: { full?: boolean } = {}): string {
  return `<div class="field-box${opts.full ? " full-width" : ""}">
  <div class="field-label">${escHtml(label)}</div>
  <div class="field-value">${escHtml(value || "—")}</div>
</div>`;
}

/** Linha com 2 campos lado a lado. */
export function editorialFieldsGrid(fields: Array<{ label: string; value: string }>): string {
  const cells = fields.map((f) => editorialField(f.label, f.value)).join("");
  return `<div class="grid-2">${cells}</div>`;
}

/** Caixa de texto longo (saída da IA). `value` aceita string ou HTML. */
export function editorialLongField(value: string, opts: { html?: boolean } = {}): string {
  const inner = opts.html
    ? value
    : String(value || "—")
        .split(/\n{2,}/)
        .map((p) => `<p>${escHtml(p).replace(/\n/g, "<br/>")}</p>`)
        .join("");
  return `<div class="text-block">${inner}</div>`;
}

export function editorialHint(text: string): string {
  return `<p class="hint">${escHtml(text)}</p>`;
}

export function editorialSignatures(names: string[]): string {
  const cells = names
    .map(
      (n) => `<div class="signature-box">
    <div class="signature-line" aria-hidden="true"></div>
    <div class="signature-name">${escHtml(n)}</div>
  </div>`,
    )
    .join("");
  return `<section>
  <h2 class="section-title">Assinaturas</h2>
  <div class="signatures-grid">${cells}</div>
</section>`;
}

/** Embrulha o HTML do documento já como página A4 com cabeçalho/rodapé. */
export function wrapEditorialPrintHtml(
  title: string,
  bodyHtml: string,
  opts: EditorialPrintOptions = {},
): string {
  const docType: EditorialDocType = opts.docType ?? "parecer";
  const label = opts.docLabel ?? DOC_LABEL[docType] ?? "DOCUMENTO PEDAGÓGICO";
  const legal = opts.legalBase ?? LEGAL_BASE[docType] ?? "Documento pedagógico AgilizaProf";

  const css = buildCss(legal);
  const header = buildHeader(label);
  const footer = buildFooter(legal);

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${escHtml(title)}</title>
<style>${css}\n${opts.extraCss ?? ""}</style>
</head>
<body>
<main class="page-a4">
${header}
${bodyHtml}
${footer}
</main>
</body>
</html>`;
}

/** Atalho: abre nova aba com o HTML editorial e dispara a impressão. */
export function printEditorial(
  title: string,
  bodyHtml: string,
  opts: EditorialPrintOptions = {},
): void {
  const html = wrapEditorialPrintHtml(title, bodyHtml, opts);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}