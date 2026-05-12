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
  return `
/* Fontes — Fraunces para títulos, Arial para corpo */
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap');

@page {
  size: A4;
  margin: 2.2cm 2cm 2.8cm 2cm;
  @bottom-left {
    content: "${escCss(footerLeft)}";
    font-family: 'Fraunces', Georgia, serif;
    font-size: 9pt; color: #1f2a44;
  }
  @bottom-center {
    content: "${escCss(compliance)}";
    font-family: Arial, Helvetica, sans-serif;
    font-style: italic; font-size: 8.5pt; color: #6b7280;
  }
  @bottom-right {
    content: counter(page) " / " counter(pages);
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9pt; color: #6b7280;
  }
}

html, body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 12pt;
  line-height: 1.5;
  color: #000;
  margin: 0;
  padding: 0;
  background: #fff;
}

/* Corpo: Arial 12, espaçamento 1,5, justificado */
p, li, td, th, dd, dt, .doc-body, .doc-block, .kpi, .card, .pei-block, section, article {
  font-family: Arial, Helvetica, sans-serif;
  line-height: 1.5;
  color: #000;
  text-align: justify;
  text-justify: inter-word;
  hyphens: auto;
}

/* Títulos: Fraunces Bold, azul profundo */
h1, h2, h3, h4, h5, h6,
.doc-title, .section-title {
  font-family: 'Fraunces', Georgia, 'Times New Roman', serif !important;
  font-weight: 700;
  color: #14315c; /* azul profundo */
  letter-spacing: -0.01em;
  text-align: left;
}
h1, .doc-title {
  font-size: 24pt;
  margin: 0 0 14pt 0;
}
h2, .section-title {
  font-size: 16pt;
  margin: 18pt 0 8pt 0;
  padding-bottom: 4pt;
  border-bottom: 1px solid #d4af37; /* divisória dourada sutil */
}
h3 { font-size: 13pt; margin: 14pt 0 6pt 0; }
h4 { font-size: 12pt; margin: 12pt 0 4pt 0; }

/* Capa / cabeçalho do documento */
.doc-cover {
  text-align: center;
  padding: 8pt 0 18pt 0;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 18pt;
}
.doc-cover h1 {
  text-align: center;
  color: #14315c;
}
.doc-cover .subtitle {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11pt; color: #475569; margin-top: 4pt;
}

/* Áreas/blocos de conteúdo — sem linhas de preenchimento, apenas blocos suaves */
.doc-block, .card, .pei-block {
  background: #fafaf7;
  border: 1px solid #ececec;
  border-radius: 4px;
  padding: 10pt 14pt;
  margin: 8pt 0;
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
  color: #14315c;
  border-bottom: 1px solid #d4af37;
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
    border: 1.5pt solid #14315c;
    outline: 1pt solid #d4af37;
    outline-offset: -3mm;
    pointer-events: none;
    z-index: 9999;
  }
}
@media screen {
  body {
    border: 1.5pt solid #14315c;
    outline: 1pt solid #d4af37;
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
  border-top: 1px solid #d4af37;
  display: grid;
  grid-template-columns: 1fr 2fr auto;
  gap: 12px;
  align-items: start;
  font-size: 9.5pt;
}
.screen-foot .brand {
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 700;
  color: #14315c;
}
.screen-foot .legal {
  font-style: italic;
  color: #6b7280;
  text-align: center;
  word-wrap: break-word;
}
.screen-foot .page {
  color: #6b7280;
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
  background: #fafaf7;
  page-break-inside: avoid; break-inside: avoid;
}
.digital-sig .label {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 10pt; color: #14315c; text-transform: uppercase;
  letter-spacing: .08em; margin-bottom: 8px; font-weight: 700;
}
.digital-sig .row {
  display: flex; justify-content: space-between; gap: 16px;
  font-size: 11pt; flex-wrap: wrap;
}
.digital-sig .line {
  margin-top: 14px; border-top: 1px solid #14315c;
  padding-top: 4px; font-size: 10pt; color: #475569; text-align: center;
}
.digital-sig .hint { margin-top: 8px; font-size: 9pt; color: #6b7280; font-style: italic; }
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
  const docType: DocType = opts.docType ?? "parecer";
  const professor = (opts.professorNome ?? "").trim();
  const compliance = COMPLIANCE_BY_TYPE[docType];
  const incluirAssinatura = opts.incluirAssinatura !== false;

  const css = buildPrintCss(professor, compliance, docType);
  const sig = incluirAssinatura ? buildSignatureBlock(professor) : "";
  const screenFoot = buildScreenFooter(professor, compliance);

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escHtml(title)}</title><style>${css}\n${opts.extraCss ?? ""}</style></head><body>${bodyHtml}${sig}${screenFoot}</body></html>`;
}