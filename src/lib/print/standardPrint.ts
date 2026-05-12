/**
 * Padrão de formatação único para todos os documentos
 * salvos ou impressos pelo app (Parecer descritivo, PEI,
 * Planejamento de aula, Plano adaptado para aluno PCD).
 *
 * Regras:
 *  • Fonte Arial, tamanho 12
 *  • Espaçamento entre linhas 1,5
 *  • Margens de 2cm em todos os lados
 *  • Borda 1px sólida envolvendo todo o conteúdo (em todas as páginas)
 *  • Blocos (.doc-block / section / table / .kpi / ul / .sig) não
 *    podem ser quebrados entre páginas
 *  • Rodapé fixo em todas as páginas com nome do(a) professor(a),
 *    texto de conformidade do tipo de documento e numeração
 *    "Página X de Y"
 *  • Bloco de assinatura digital ao final do documento, com data
 *    de emissão automática
 */

export type DocType = "parecer" | "pei" | "planejamento" | "plano-adaptado";

export interface StandardPrintOptions {
  extraCss?: string;
  professorNome?: string;
  docType?: DocType;
  incluirAssinatura?: boolean;
}

const COMPLIANCE_BY_TYPE: Record<DocType, string> = {
  parecer:
    "Documento elaborado com suporte do AgilizaProf | Em conformidade com a BNCC (Base Nacional Comum Curricular)",
  planejamento:
    "Documento elaborado com suporte do AgilizaProf | Em conformidade com a BNCC (Base Nacional Comum Curricular)",
  pei:
    "Documento elaborado com suporte do AgilizaProf | Em conformidade com a Lei nº 14.254/2021 — Lei do PEI",
  "plano-adaptado":
    "Documento elaborado com suporte do AgilizaProf | Em conformidade com a Lei Brasileira de Inclusão — Lei nº 13.146/2015",
};

/** Rótulo da faixa de cabeçalho impressa, por tipo de documento. */
const DOC_TYPE_LABEL: Record<DocType, string> = {
  parecer: "RELATÓRIO PEDAGÓGICO",
  pei: "PLANO EDUCACIONAL INDIVIDUALIZADO",
  planejamento: "PLANEJAMENTO PEDAGÓGICO",
  "plano-adaptado": "PLANO ADAPTADO",
};

/** Fallback seguro caso o tipo não seja reconhecido (ex.: dado vindo do banco). */
const DEFAULT_DOC_TYPE: DocType = "parecer";
const FALLBACK_DOC_LABEL = "DOCUMENTO PEDAGÓGICO";
const FALLBACK_COMPLIANCE =
  "Documento elaborado com suporte do AgilizaProf";

function isDocType(value: unknown): value is DocType {
  return (
    value === "parecer" ||
    value === "pei" ||
    value === "planejamento" ||
    value === "plano-adaptado"
  );
}

function resolveDocType(value: unknown): DocType {
  return isDocType(value) ? value : DEFAULT_DOC_TYPE;
}

function getDocLabel(docType: DocType): string {
  return DOC_TYPE_LABEL[docType] ?? FALLBACK_DOC_LABEL;
}

function getCompliance(docType: DocType): string {
  return COMPLIANCE_BY_TYPE[docType] ?? FALLBACK_COMPLIANCE;
}

function escCss(s: string): string {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function buildPrintCss(
  professorNome: string,
  compliance: string,
  docType: DocType,
): string {
  const isPlanejamento = docType === "planejamento";
  // Rodapé via @page margin boxes (usado na impressão real do navegador)
  const footerLeft = "Documento gerado pela plataforma AgilizaProf";
  // headerRight é renderizado pelo .print-header (HTML), não pelo CSS.
  void docType;
  return `
/* Fontes — Fraunces para títulos, Arial para corpo */
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap');

/* Paleta sóbria e elegante */
:root {
  --ink: #111111;            /* preto suave */
  --accent: #1F3A5F;         /* azul profundo editorial */
  --band: #F5F1EA;           /* bege claro p/ faixas de seção */
  --gold: #C9B98A;           /* filete dourado discreto */
  --rule: #e5e7eb;
  --muted: #1F3A5F;
  /* Altura da faixa azul + folga acima do conteúdo (compensa A4 e Letter) */
  --print-header-h: 1.4cm;
  --print-header-gap: 0.7cm;
}

@page {
  size: A4;
  /* Margem superior = altura da faixa + folga; vale para A4 e Letter */
  margin: calc(var(--print-header-h) + var(--print-header-gap)) 2cm 2.8cm 2cm;
  @bottom-left {
    content: "${escCss(footerLeft)}";
    font-family: 'Fraunces', Georgia, serif;
    font-size: 9pt; color: #1F3A5F;
  }
  @bottom-center {
    content: "${escCss(compliance)}";
    font-family: Arial, Helvetica, sans-serif;
    font-style: italic; font-size: 8.5pt; color: #1F3A5F;
  }
  @bottom-right {
    content: counter(page) " / " counter(pages);
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9pt; color: #1F3A5F;
  }
}
@page :first {
  margin-top: calc(var(--print-header-h) + var(--print-header-gap));
}
/* Suporte a impressão em Carta/Letter sem cortar conteúdo */
@media print and (min-width: 8in) {
  @page { size: Letter; }
}

/* Garante impressão das cores de fundo (faixa azul) em todos os navegadores */
html, body, .print-header, .page-band, .field-box > .label, .section-band, .digital-sig {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  color-adjust: exact !important;
}

/* Faixa de cabeçalho fixa — azul sólida com texto branco, repete em toda página impressa */
.print-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: var(--print-header-h);
  background: #1F3A5F !important;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1cm;
  z-index: 9998;
  font-size: 9pt;
  letter-spacing: .14em;
  box-sizing: border-box;
}
.print-header .brand {
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 700;
  color: #ffffff;
}
.print-header .doc-kind {
  font-family: Arial, Helvetica, sans-serif;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: .12em;
}
@media screen {
  body { padding-top: calc(var(--print-header-h) + var(--print-header-gap)); }
}

/* Em alguns engines (Chrome) o position:fixed permanece dentro da área de
   conteúdo da página impressa. Garantimos folga inicial para que o conteúdo
   nunca seja cortado pela faixa, mesmo em A4 ou Letter. */
@media print {
  body::before {
    content: "";
    display: block;
    height: var(--print-header-h);
    margin-bottom: var(--print-header-gap);
  }
}

html, body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 12pt;
  line-height: 1.5;
  color: #111111;
  margin: 0;
  padding: 0;
  background: #fff;
}

/* Corpo: Arial 12, espaçamento 1,5, justificado */
p, li, td, th, dd, dt, .doc-body, .doc-block, .kpi, .card, .pei-block, section, article {
  font-family: Arial, Helvetica, sans-serif;
  line-height: 1.5;
  color: #111111;
  text-align: justify;
  text-justify: inter-word;
  hyphens: auto;
}

/* Títulos: Fraunces Bold, azul profundo */
h1, h2, h3, h4, h5, h6,
.doc-title, .section-title {
  font-family: 'Fraunces', Georgia, 'Times New Roman', serif !important;
  font-weight: 700;
  color: #1F3A5F; /* azul profundo editorial */
  letter-spacing: -0.01em;
  text-align: left;
}
h1, .doc-title {
  font-size: 22pt;
  margin: 0 0 12pt 0;
  line-height: 1.15;
}
h2, .section-title {
  font-size: 17pt;
  margin: 22pt 0 10pt 0;
  padding-bottom: 0;
  border-bottom: none;
  line-height: 1.2;
}
h3 { font-size: 13pt; margin: 14pt 0 6pt 0; line-height: 1.25; }
h4 { font-size: 11.5pt; margin: 10pt 0 4pt 0; line-height: 1.25; text-transform: none; }

/* Primeiro título de seção logo após a capa não precisa de margem extra acima */
.doc-cover + h2,
.doc-cover + .section-title { margin-top: 8pt; }

/* Subtítulo italicizado abaixo dos títulos de seção (descrição da seção) */
h2 + p > em:only-child,
.section-title + p > em:only-child,
.section-hint {
  display: block;
  font-family: Arial, Helvetica, sans-serif;
  font-style: italic;
  color: #1F3A5F;
  font-size: 10.5pt;
  margin: -4pt 0 8pt 0;
}

/* Capa estilizada */
.doc-cover {
  text-align: center;
  padding: 18pt 0 22pt 0;
  margin-bottom: 22pt;
  border-bottom: 1px solid #e5e7eb;
}
.doc-cover .overline {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 9pt; letter-spacing: .22em; color: #1F3A5F;
  text-transform: uppercase; margin-bottom: 10pt; font-weight: 700;
}
.doc-cover h1 {
  text-align: center;
  color: #1F3A5F;
  font-size: 32pt;
  margin: 0;
}
.doc-cover .gold-rule {
  width: 110px; height: 0; margin: 10pt auto 10pt auto;
  border-top: 1.2pt solid #C9B98A;
}
.doc-cover .subtitle {
  font-family: 'Fraunces', Georgia, serif;
  font-style: italic;
  font-size: 13pt; color: #1F3A5F; margin-top: 4pt;
}

/* (Cabeçalho legado .page-band substituído pelo .print-header fixo) */
.page-band { display: none !important; }

/* Áreas/blocos de conteúdo — sem linhas de preenchimento */
.doc-block, .card, .pei-block {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 12pt 14pt;
  margin: 8pt 0;
}

/* Caixa rotulada: faixa bege com borda azul, pronta p/ receber texto da IA */
.field-box {
  margin: 10pt 0;
  border-top: 1px solid #1F3A5F;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
  overflow: hidden;
}
.field-box > .label {
  display: block;
  background: #F5F1EA;
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 700;
  color: #1F3A5F;
  font-size: 10pt;
  letter-spacing: .08em;
  text-transform: uppercase;
  padding: 5pt 10pt;
}
.field-box > .content {
  padding: 10pt 12pt;
  min-height: 36pt;
  color: #111111;
}

/* Faixa de seção bege para destacar grupos */
.section-band {
  background: #F5F1EA;
  border-left: 3pt solid #1F3A5F;
  padding: 6pt 12pt;
  margin: 14pt 0 8pt 0;
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 700;
  color: #1F3A5F;
  letter-spacing: .04em;
}

/* Filete dourado utilitário */
.gold-divider {
  border: 0; border-top: 1px solid #C9B98A; margin: 14pt 0;
}

/* Substitui linhas pontilhadas por blocos brancos com borda fina */
.fill-line, .dotted-line, .underline-fill {
  display: block;
  border: 1px solid #e5e7eb !important;
  border-radius: 3px;
  background: #ffffff;
  min-height: 28pt;
  padding: 8pt 10pt;
  text-decoration: none !important;
}

/* Tabelas elegantes */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 8pt 0;
}
th, td {
  border-bottom: 1px solid #e5e7eb;
  padding: 6pt 8pt;
  vertical-align: top;
  text-align: left;
}
th {
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 700;
  color: #1F3A5F;
  border-bottom: 1px solid #C9B98A;
}

${
  isPlanejamento
    ? `
/* Borda dupla editorial só no Planejamento: traço azul + filete dourado interno */
@media print {
  html::before {
    content: "";
    position: fixed;
    top: 8mm; right: 8mm; bottom: 8mm; left: 8mm;
    border: 1.5pt solid #1F3A5F;
    outline: 1pt solid #C9B98A;
    outline-offset: -3mm;
    pointer-events: none;
    z-index: 9999;
  }
}
@media screen {
  body {
    border: 1.5pt solid #1F3A5F;
    outline: 1pt solid #C9B98A;
    outline-offset: -8px;
    padding: 14mm;
    box-sizing: border-box;
    min-height: 100vh;
  }
}
`
    : `
@media screen {
  body { padding: 14mm; box-sizing: border-box; min-height: 100vh; }
}
`
}

/* Rodapé "na tela" — filete dourado, AgilizaProf em Fraunces, base legal em itálico cinza */
.screen-foot {
  margin-top: 28px;
  padding-top: 10px;
  border-top: 1px solid #C9B98A;
  display: grid;
  grid-template-columns: 1fr 2fr auto;
  gap: 12px;
  align-items: start;
  font-size: 9.5pt;
}
.screen-foot .brand {
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 700;
  color: #1F3A5F;
}
.screen-foot .legal {
  font-style: italic;
  color: #1F3A5F;
  text-align: center;
  word-wrap: break-word;
}
.screen-foot .page {
  color: #1F3A5F;
  text-align: right;
  white-space: nowrap;
}
@media print {
  .screen-foot { display: none !important; }
}

/* Quebras */
section, article, table, tr, .doc-block, .kpi, .kpis, ul, ol, li, .sig, h1, h2, h3, h4, p, .card, .pei-block {
  page-break-inside: avoid;
  break-inside: avoid;
}
h1, h2, h3, h4 { page-break-after: avoid; break-after: avoid; }

@media print {
  .toolbar, button, .no-print { display: none !important; }
}

/* Bloco de assinatura digital */
.digital-sig {
  margin-top: 28px; padding: 14px 16px;
  border: 1px solid #e5e7eb; border-radius: 4px;
  background: #F5F1EA;
  page-break-inside: avoid; break-inside: avoid;
}
.digital-sig .label {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 10pt; color: #1F3A5F; text-transform: uppercase;
  letter-spacing: .08em; margin-bottom: 8px; font-weight: 700;
}
.digital-sig .row {
  display: flex; justify-content: space-between; gap: 16px;
  font-size: 11pt; flex-wrap: wrap;
}
.digital-sig .line {
  margin-top: 14px; border-top: 1px solid #1F3A5F;
  padding-top: 4px; font-size: 10pt; color: #1F3A5F; text-align: center;
}
.digital-sig .hint { margin-top: 8px; font-size: 9pt; color: #1F3A5F; font-style: italic; }
`;
}

/** CSS padrão (sem personalização) – mantido para compatibilidade. */
export const STANDARD_PRINT_CSS = buildPrintCss("", COMPLIANCE_BY_TYPE.parecer, "parecer");

function buildSignatureBlock(professorNome: string): string {
  const data = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  const hora = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit",
  });
  return `
<div class="digital-sig">
  <div class="label">Assinatura digital</div>
  <div class="row">
    <div><b>Professor(a):</b> ${escHtml(professorNome || "—")}</div>
    <div><b>Data de emissão:</b> ${escHtml(data)} às ${escHtml(hora)}</div>
  </div>
  <div class="line">${escHtml(professorNome || "Assinatura do(a) professor(a)")}</div>
  <div class="hint">Assinado eletronicamente por meio do AgilizaProf.</div>
</div>`;
}

function buildScreenFooter(_professorNome: string, compliance: string): string {
  return `
<div class="screen-foot">
  <div class="brand">Documento gerado pela plataforma AgilizaProf</div>
  <div class="legal">${escHtml(compliance)}</div>
  <div class="page">Página 1 de 1</div>
</div>`;
}

function buildPrintHeader(docType: DocType): string {
  return `
<div class="print-header" role="banner">
  <div class="brand">AGILIZAPROF</div>
  <div class="doc-kind">${escHtml(getDocLabel(docType))}</div>
</div>`;
}

/**
 * Embrulha o conteúdo HTML do documento com o CSS padrão.
 * Aceita string (extraCss legado) ou objeto de opções.
 */
export function wrapStandardPrintHtml(
  title: string,
  bodyHtml: string,
  optsOrCss: string | StandardPrintOptions = "",
): string {
  const opts: StandardPrintOptions =
    typeof optsOrCss === "string" ? { extraCss: optsOrCss } : optsOrCss;
  const docType: DocType = resolveDocType(opts.docType);
  const professor = (opts.professorNome ?? "").trim();
  const compliance = getCompliance(docType);
  const incluirAssinatura = opts.incluirAssinatura !== false;

  const css = buildPrintCss(professor, compliance, docType);
  const header = buildPrintHeader(docType);
  const sig = incluirAssinatura ? buildSignatureBlock(professor) : "";
  const screenFoot = buildScreenFooter(professor, compliance);

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escHtml(title)}</title><style>${css}\n${opts.extraCss ?? ""}</style></head><body>${header}${bodyHtml}${sig}${screenFoot}</body></html>`;
}