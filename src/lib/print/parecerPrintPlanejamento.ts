/**
 * Wrapper de impressão do PARECER no MESMO padrão visual do Planejamento
 * (planejamentoDireto.ts): borda 1px sólida preta na página, título Fraunces
 * 28 centralizado, corpo Arial 12 justificado, seções separadas por linha
 * superior, assinaturas com linha e rodapé. Margens A4 1cm. Drop-in para
 * wrapEditorialPrintHtml — mesma assinatura (title, bodyHtml, opts).
 */
export type ParecerDocType = "parecer" | "pei" | "planejamento" | "plano-adaptado" | "relatorio" | "anamnese";

export interface ParecerPrintOptions {
  extraCss?: string;
  docType?: ParecerDocType;
  docLabel?: string;
  legalBase?: string;
  professorNome?: string;
  incluirAssinatura?: boolean;
}

function escHtml(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const BASE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700&display=swap');
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{margin:0;padding:0;background:#fff;color:#000}
body{font:12px/1.45 Arial, Helvetica, sans-serif;text-align:justify}
article.report{border:1px solid #000;padding:2cm;margin:0;}
article.report h1{font-family:'Fraunces', Georgia, serif;font-weight:700;font-size:28px;text-align:center;margin:0 0 8px;letter-spacing:.01em;line-height:1.15;}
.grid-2{display:block;margin:8px 0 16px;border-top:1px solid #000;padding-top:10px;}
.field-box{display:flex;gap:6px;align-items:baseline;margin:2px 0;background:none;border:0;}
.field-label{font-weight:700;color:#000;background:none;border:0;padding:0;text-transform:none;letter-spacing:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;}
.field-label::after{content:":";}
.field-value{padding:0;color:#000;font-size:12px;}
article.report > section,
article.report > div > section{margin:12px 0;padding-top:10px;border-top:1px solid #000;}
article.report h2{font-size:13px;font-weight:700;margin:0 0 6px;text-align:left;font-family:Arial,Helvetica,sans-serif;}
article.report h3{font-size:12px;font-weight:700;margin:10px 0 2px;font-family:Arial,Helvetica,sans-serif;}
article.report p{margin:0 0 6px;text-align:justify;}
article.report ul{margin:4px 0 8px;padding-left:18px;}
article.report li{margin:2px 0;}
.sig{margin-top:28px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;}
.sig > div{border-top:1px solid #000;padding-top:6px;font-size:11px;color:#000;text-align:center;}
.foot{margin-top:18px;border-top:1px solid #000;padding-top:8px;font-size:10px;color:#444;text-align:center;font-style:normal;}
@page{size:A4;margin:1cm}
@media print{button,.no-print{display:none !important;} article.report{border:1px solid #000;padding:1cm;}}
`;

export function wrapParecerPrintHtml(title: string, bodyHtml: string, opts: ParecerPrintOptions = {}): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${escHtml(title)}</title>
<style>${BASE_CSS}
${opts.extraCss ?? ""}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
