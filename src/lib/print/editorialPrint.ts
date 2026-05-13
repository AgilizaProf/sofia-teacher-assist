/**
 * Gerador de PDFs pedagógicos — layout editorial AgilizaProf.
 *
 * Uso (igual ao standardPrint):
 *   const html = wrapEditorialPrintHtml("Relatório", bodyHtml, {
 *     docType: "parecer",
 *     professorNome: "Maria Silva",
 *   });
 *   const w = window.open("", "_blank"); w!.document.write(html);
 *   w!.document.close(); w!.focus(); w!.print();
 *
 * Helpers para montar o corpo:
 *   editorialCover({ title, subtitle, intro })
 *   editorialSectionTitle("Identificação do educando")
 *   editorialField("Nome", "João da Silva")          // campo curto
 *   editorialLongField("Parecer", "Texto longo...")  // campo longo (texto IA)
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
  docLabel?: string;       // sobrescreve o rótulo do cabeçalho
  professorNome?: string;
  legalBase?: string;      // sobrescreve a base legal do rodapé
  incluirAssinatura?: boolean;
  extraCss?: string;
}

const DOC_LABEL: Record<EditorialDocType, string> = {
  parecer: "RELATÓRIO PEDAGÓGICO",
  pei: "PLANO EDUCACIONAL INDIVIDUALIZADO",
  planejamento: "PLANEJAMENTO PEDAGÓGICO",
  "plano-adaptado": "PLANO ADAPTADO",
  relatorio: "RELATÓRIO PEDAGÓGICO",
  anamnese: "ANAMNESE PEDAGÓGICA",
};

const LEGAL_BASE: Record<EditorialDocType, string> = {
  parecer: "Em conformidade com a BNCC — Base Nacional Comum Curricular",
  relatorio: "Em conformidade com a BNCC — Base Nacional Comum Curricular",
  planejamento: "Em conformidade com a BNCC — Base Nacional Comum Curricular",
  pei: "Em conformidade com a Lei nº 14.254/2021 — Lei do PEI",
  "plano-adaptado":
    "Em conformidade com a Lei Brasileira de Inclusão — Lei nº 13.146/2015",
  anamnese: "Em conformidade com a LGPD — Lei nº 13.709/2018",
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
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap');

:root{
  --ink:#111111;
  --blue:#1F3A5F;
  --beige:#F5F1EA;
  --gold:#C9B98A;
  --muted:#6B6B6B;
  --rule:#DDDDDD;
  --header-h:0.6cm;
}

@page{
  size:A4;
  margin: calc(2.2cm + var(--header-h) + 0.4cm) 2cm 2.4cm 3cm;
  @bottom-center{
    content:"Documento gerado pela plataforma AgilizaProf";
    font-family:'Fraunces',Georgia,serif;
    font-weight:700;
    font-size:9pt; color:var(--blue);
  }
  @bottom-left{
    content:"${escCss(legal)}";
    font-family:Arial,Helvetica,sans-serif;
    font-style:italic; font-size:8.5pt; color:#6B6B6B;
  }
  @bottom-right{
    content: counter(page);
    font-family:Arial,Helvetica,sans-serif;
    font-size:9pt; color:#6B6B6B;
  }
}

/* Cabeçalho fixo (faixa azul 0,6cm) — repete em toda página impressa */
html,body,.ed-header,.ed-field>.label,.ed-cover{
  -webkit-print-color-adjust:exact !important;
  print-color-adjust:exact !important;
  color-adjust:exact !important;
}

.ed-header{
  position:fixed;
  top:0; left:0; right:0;
  height:var(--header-h);
  background:#1F3A5F !important;
  color:#fff;
  display:flex; align-items:center; justify-content:space-between;
  padding:0 2cm 0 3cm;
  font-size:8.5pt; letter-spacing:.18em;
  box-sizing:border-box;
  z-index:9998;
}
.ed-header .brand{ font-family:'Fraunces',Georgia,serif; font-weight:700; }
.ed-header .kind{ font-family:Arial,Helvetica,sans-serif; font-weight:700; letter-spacing:.14em; }

/* Filete dourado acima do rodapé impresso */
@media print{
  body::after{
    content:""; position:fixed;
    left:3cm; right:2cm; bottom:1.6cm;
    border-top:0.6pt solid #C9B98A;
  }
  body::before{
    /* folga visual abaixo da faixa do cabeçalho */
    content:""; display:block; height:0.4cm;
  }
}

@media screen{
  body{
    padding: calc(var(--header-h) + 22mm) 20mm 24mm 30mm;
    max-width:21cm; margin:0 auto; box-sizing:border-box;
  }
}

html,body{
  font-family:Arial,Helvetica,sans-serif;
  font-size:12pt; line-height:1.5; color:#111111;
  margin:0; padding:0; background:#fff;
}

/* Corpo */
p,li,td,th,dd,dt{
  font-family:Arial,Helvetica,sans-serif;
  line-height:1.5; color:#111111;
  text-align:justify; text-justify:inter-word; hyphens:auto;
}

/* Títulos: Fraunces Bold, azul */
h1,h2,h3,h4,h5,h6{
  font-family:'Fraunces',Georgia,'Times New Roman',serif;
  color:#1F3A5F; font-weight:700; letter-spacing:-.01em;
}

/* Capa */
.ed-cover{ text-align:center; margin: 4pt 0 22pt 0; }
.ed-cover .overline{
  font-family:Arial,Helvetica,sans-serif;
  font-size:9pt; letter-spacing:.32em; color:#6B6B6B;
  text-transform:uppercase; font-weight:700; margin-bottom:18pt;
}
.ed-cover h1{
  font-size:32pt; line-height:1.05; margin:0;
  letter-spacing:.02em; text-align:center;
}
.ed-cover .gold-rule{
  width:96px; height:0; margin:14pt auto 12pt auto;
  border-top:1.2pt solid #C9B98A;
}
.ed-cover .subtitle{
  font-family:'Fraunces',Georgia,serif; font-weight:400;
  font-size:13pt; color:#6B6B6B; margin:0;
}
.ed-cover .intro{
  margin:18pt auto 0 auto; max-width:14cm;
  font-family:Arial,Helvetica,sans-serif; font-size:11pt;
  line-height:1.55; color:#111111; text-align:justify;
}

/* Seções */
.ed-section-title{
  font-family:'Fraunces',Georgia,serif; font-weight:700;
  color:#1F3A5F; font-size:16pt;
  margin:24pt 0 10pt 0; line-height:1.2;
}
.ed-section-title::after{
  content:""; display:block; width:42px; margin-top:6pt;
  border-top:1pt solid #C9B98A;
}

/* Campo curto: label bege + conteúdo branco + linha inferior #DDD */
.ed-field{
  margin:8pt 0;
  border-bottom:1px solid #DDDDDD;
  display:grid;
  grid-template-columns: 5.4cm 1fr;
  align-items:stretch;
  background:#fff;
}
.ed-field>.label{
  background:#F5F1EA;
  font-family:Arial,Helvetica,sans-serif; font-weight:700;
  color:#1F3A5F; font-size:10pt;
  letter-spacing:.06em; text-transform:uppercase;
  padding:8pt 12pt; display:flex; align-items:center;
}
.ed-field>.content{
  background:#fff; padding:8pt 12pt;
  font-family:Arial,Helvetica,sans-serif; font-size:12pt;
  color:#111111; min-height:18pt;
}

/* Campo longo (texto da IA): caixa branca, borda fina, padding 10px */
.ed-long{
  border:1px solid #DDDDDD;
  background:#fff;
  padding:10px;
  margin:10pt 0 14pt 0;
}
.ed-long .label{
  display:block;
  font-family:Arial,Helvetica,sans-serif; font-weight:700;
  color:#1F3A5F; font-size:10pt;
  letter-spacing:.06em; text-transform:uppercase;
  margin:0 0 6pt 0;
}
.ed-long .content,
.ed-long p{
  font-family:Arial,Helvetica,sans-serif; font-size:12pt;
  line-height:1.5; color:#111111;
  text-align:justify; text-justify:inter-word; hyphens:auto;
  margin:0 0 6pt 0;
}
.ed-long .content :last-child,
.ed-long p:last-child{ margin-bottom:0; }

/* Tabelas discretas */
table{ width:100%; border-collapse:collapse; margin:8pt 0; }
th,td{
  border-bottom:1px solid #DDDDDD; padding:6pt 8pt;
  vertical-align:top; text-align:left;
}
th{
  font-family:'Fraunces',Georgia,serif; font-weight:700;
  color:#1F3A5F; border-bottom:1px solid #C9B98A;
}

/* Quebras */
.ed-field,.ed-long,.ed-cover,table,tr,h1,h2,h3,h4,p{
  page-break-inside:avoid; break-inside:avoid;
}
h1,h2,h3,h4,.ed-section-title{ page-break-after:avoid; break-after:avoid; }

/* Rodapé "na tela" (não imprime) */
.ed-screen-foot{
  margin-top:32pt; padding-top:10pt;
  border-top:1px solid #C9B98A;
  display:grid; grid-template-columns:1fr; gap:4pt;
  text-align:center;
}
.ed-screen-foot .brand{
  font-family:'Fraunces',Georgia,serif; font-weight:700; color:#1F3A5F; font-size:10pt;
}
.ed-screen-foot .legal{
  font-family:Arial,Helvetica,sans-serif; font-style:italic; color:#6B6B6B; font-size:9pt;
}
@media print{ .ed-screen-foot{ display:none !important; } }

/* Assinatura digital */
.ed-sig{
  margin-top:26pt; padding:12pt 14pt;
  border:1px solid #DDDDDD; background:#F5F1EA;
  page-break-inside:avoid; break-inside:avoid;
}
.ed-sig .label{
  font-family:'Fraunces',Georgia,serif; font-weight:700;
  color:#1F3A5F; font-size:10pt; letter-spacing:.08em;
  text-transform:uppercase; margin-bottom:8pt;
}
.ed-sig .row{ display:flex; justify-content:space-between; gap:16pt; flex-wrap:wrap; font-size:11pt; }
.ed-sig .line{ margin-top:14pt; border-top:1px solid #1F3A5F; padding-top:4pt; font-size:10pt; color:#1F3A5F; text-align:center; }
.ed-sig .hint{ margin-top:6pt; font-size:9pt; color:#6B6B6B; font-style:italic; text-align:center; }

@media print{ .toolbar,button,.no-print{ display:none !important; } }
`;
}

function buildHeader(label: string): string {
  return `<div class="ed-header" role="banner">
  <div class="brand">AGILIZAPROF</div>
  <div class="kind">${escHtml(label)}</div>
</div>`;
}

function buildSignature(professorNome: string): string {
  const data = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  const hora = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit",
  });
  return `<div class="ed-sig">
  <div class="label">Assinatura digital</div>
  <div class="row">
    <div><b>Professor(a):</b> ${escHtml(professorNome || "—")}</div>
    <div><b>Emissão:</b> ${escHtml(data)} às ${escHtml(hora)}</div>
  </div>
  <div class="line">${escHtml(professorNome || "Assinatura do(a) professor(a)")}</div>
  <div class="hint">Assinado eletronicamente por meio do AgilizaProf.</div>
</div>`;
}

function buildScreenFoot(legal: string): string {
  return `<div class="ed-screen-foot">
  <div class="brand">Documento gerado pela plataforma AgilizaProf</div>
  <div class="legal">${escHtml(legal)}</div>
</div>`;
}

/* ────────── helpers de conteúdo ────────── */

export function editorialCover(opts: {
  title: string;
  subtitle?: string;
  intro?: string;
  overline?: string;
}): string {
  const overline = opts.overline ?? "Documento pedagógico • AgilizaProf";
  return `<section class="ed-cover">
  <div class="overline">${escHtml(overline)}</div>
  <h1>${escHtml(opts.title)}</h1>
  <div class="gold-rule" aria-hidden="true"></div>
  ${opts.subtitle ? `<p class="subtitle">${escHtml(opts.subtitle)}</p>` : ""}
  ${opts.intro ? `<p class="intro">${escHtml(opts.intro)}</p>` : ""}
</section>`;
}

export function editorialSectionTitle(text: string): string {
  return `<h2 class="ed-section-title">${escHtml(text)}</h2>`;
}

export function editorialField(label: string, value: string): string {
  return `<div class="ed-field">
  <div class="label">${escHtml(label)}</div>
  <div class="content">${escHtml(value || "—")}</div>
</div>`;
}

/** Campo longo. `value` pode ser texto (será envolvido em <p>) ou HTML pronto. */
export function editorialLongField(
  label: string,
  value: string,
  opts: { html?: boolean } = {},
): string {
  const inner = opts.html
    ? value
    : String(value || "—")
        .split(/\n{2,}/)
        .map((p) => `<p>${escHtml(p).replace(/\n/g, "<br/>")}</p>`)
        .join("");
  return `<section class="ed-long">
  <div class="label">${escHtml(label)}</div>
  <div class="content">${inner}</div>
</section>`;
}

/** Embrulha o corpo HTML do documento com o layout editorial. */
export function wrapEditorialPrintHtml(
  title: string,
  bodyHtml: string,
  opts: EditorialPrintOptions = {},
): string {
  const docType: EditorialDocType = opts.docType ?? "parecer";
  const label = opts.docLabel ?? DOC_LABEL[docType] ?? "DOCUMENTO PEDAGÓGICO";
  const legal = opts.legalBase ?? LEGAL_BASE[docType] ?? "Documento pedagógico AgilizaProf";
  const professor = (opts.professorNome ?? "").trim();
  const incluirAssinatura = opts.incluirAssinatura !== false;

  const css = buildCss(legal);
  const header = buildHeader(label);
  const sig = incluirAssinatura ? buildSignature(professor) : "";
  const screenFoot = buildScreenFoot(legal);

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escHtml(title)}</title><style>${css}\n${opts.extraCss ?? ""}</style></head><body>${header}${bodyHtml}${sig}${screenFoot}</body></html>`;
}

/** Atalho: abre o HTML editorial em nova aba e dispara a impressão. */
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
  setTimeout(() => w.print(), 250);
}