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

function buildPrintCss(professorNome: string, compliance: string): string {
  const profLine = professorNome ? `Prof(a). ${escCss(professorNome)}` : "";
  return `
@page {
  size: A4;
  margin: 2cm 2cm 2.6cm 2cm;
  @bottom-left   { content: "${profLine}"; font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #475569; }
  @bottom-center { content: "${escCss(compliance)}"; font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt; color: #475569; }
  @bottom-right  { content: "Página " counter(page) " de " counter(pages); font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #475569; }
}

html, body {
  font-family: Arial, Helvetica, sans-serif !important;
  font-size: 12pt !important;
  line-height: 1.5 !important;
  color: #0B1220;
  margin: 0;
  padding: 0;
  background: #fff;
}

body * {
  font-family: Arial, Helvetica, sans-serif !important;
  line-height: 1.5;
}

/* Borda 1px sólida em TODAS as páginas (fixa cobre cada folha impressa) */
@media print {
  html::before {
    content: "";
    position: fixed;
    top: 0; right: 0; bottom: 0; left: 0;
    border: 1px solid #000;
    pointer-events: none;
    z-index: 9999;
  }
  /* Esconder rodapé "em tela" durante impressão (já está nos margin boxes) */
  .screen-foot { display: none !important; }
}
/* Em tela (pré-visualização do pop-up) também desenha a moldura */
@media screen {
  body { border: 1px solid #000; padding: 12mm; box-sizing: border-box; min-height: 100vh; }
  .screen-foot {
    margin-top: 24px; padding-top: 10px; border-top: 1px dashed #cbd5e1;
    display: flex; justify-content: space-between; gap: 12px;
    font-size: 10pt; color: #475569;
  }
  .screen-foot .center { text-align: center; flex: 1; }
}

/* Blocos não podem ser quebrados no meio */
section, article, table, tr, .doc-block, .kpi, .kpis, ul, ol, li, .sig, h1, h2, h3, h4, p, .card, .pei-block {
  page-break-inside: avoid;
  break-inside: avoid;
}
h1, h2, h3, h4 { page-break-after: avoid; break-after: avoid; }

/* Toolbars/botões nunca aparecem no PDF/impresso */
@media print {
  .toolbar, button, .no-print { display: none !important; }
}

/* Bloco de assinatura digital */
.digital-sig {
  margin-top: 28px; padding: 14px 16px;
  border: 1px solid #cbd5e1; border-radius: 6px;
  page-break-inside: avoid; break-inside: avoid;
}
.digital-sig .label {
  font-size: 10pt; color: #475569; text-transform: uppercase;
  letter-spacing: .06em; margin-bottom: 8px; font-weight: 700;
}
.digital-sig .row {
  display: flex; justify-content: space-between; gap: 16px;
  font-size: 11pt; flex-wrap: wrap;
}
.digital-sig .line {
  margin-top: 14px; border-top: 1px solid #0B1220;
  padding-top: 4px; font-size: 10pt; color: #475569; text-align: center;
}
.digital-sig .hint { margin-top: 8px; font-size: 9pt; color: #64748b; }
`;
}

/** CSS padrão (sem personalização) – mantido para compatibilidade. */
export const STANDARD_PRINT_CSS = buildPrintCss("", COMPLIANCE_BY_TYPE.parecer);

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

function buildScreenFooter(professorNome: string, compliance: string): string {
  return `
<div class="screen-foot">
  <div>${escHtml(professorNome ? "Prof(a). " + professorNome : "")}</div>
  <div class="center">${escHtml(compliance)}</div>
  <div>Página 1 de 1</div>
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

  const css = buildPrintCss(professor, compliance);
  const sig = incluirAssinatura ? buildSignatureBlock(professor) : "";
  const screenFoot = buildScreenFooter(professor, compliance);

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escHtml(title)}</title><style>${css}\n${opts.extraCss ?? ""}</style></head><body>${bodyHtml}${sig}${screenFoot}</body></html>`;
}