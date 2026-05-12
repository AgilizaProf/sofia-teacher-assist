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
 */
export const STANDARD_PRINT_CSS = `
@page { size: A4; margin: 2cm; }

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
}
/* Em tela (pré-visualização do pop-up) também desenha a moldura */
@media screen {
  body { border: 1px solid #000; padding: 12mm; box-sizing: border-box; min-height: 100vh; }
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
`;

/** Embrulha o conteúdo HTML do documento com o CSS padrão. */
export function wrapStandardPrintHtml(title: string, bodyHtml: string, extraCss = ""): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${title}</title><style>${STANDARD_PRINT_CSS}\n${extraCss}</style></head><body>${bodyHtml}</body></html>`;
}