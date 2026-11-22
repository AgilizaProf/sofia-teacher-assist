import { imprimirHtml } from "@/lib/alfabetizacao/imprimir";

// Imprimir ou baixar em Word uma resposta da Sofia, com a formatação que aparece
// no chat (títulos, listas, tabelas), sem os botões da tela.

const CSS = `
body{font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.5;color:#111;margin:2cm;}
h1{font-size:18pt;margin:0 0 4pt} h2{font-size:15pt;margin:14pt 0 6pt} h3{font-size:13pt;margin:12pt 0 4pt}
p{margin:0 0 8pt} ul,ol{margin:0 0 8pt 18pt} li{margin:0 0 3pt}
table{border-collapse:collapse;width:100%;margin:8pt 0} td,th{border:1px solid #888;padding:4pt 6pt;vertical-align:top;text-align:left}
th{background:#eee} .rodape{margin-top:18pt;font-size:9pt;color:#666;border-top:1px solid #ccc;padding-top:6pt}
@media print{body{margin:1.5cm}}
`;

function esc(t: string): string {
  return t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}

/** Limpa o HTML da resposta: tira botões, ícones e atributos de tela. */
export function limparHtmlResposta(html: string): string {
  return html
    .replace(/<button[\s\S]*?<\/button>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/\s(class|style|data-[\w-]+|aria-[\w-]+|role|tabindex)="[^"]*"/gi, "");
}

function documento(html: string, titulo: string): string {
  const data = new Date().toLocaleDateString("pt-BR");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>${CSS}</style></head><body>${limparHtmlResposta(html)}<p class="rodape">Feito com a Sofia · AgilizaProf · ${data}. Revise antes de usar.</p></body></html>`;
}

export function imprimirResposta(html: string, titulo: string): boolean {
  return imprimirHtml(documento(html, titulo));
}

export function baixarRespostaWord(html: string, titulo: string): void {
  const inner = documento(html, titulo).replace(/^<!doctype html>/i, "").replace(/^<html lang="pt-BR">/i, "").replace(/<\/html>\s*$/i, "");
  const docHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">${inner}</html>`;
  const blob = new Blob(["﻿", docHtml], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(titulo || "resposta-da-sofia").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "_").slice(0, 60)}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Título curto para a resposta: o primeiro título dela, ou o começo do texto. */
export function tituloDaResposta(markdown: string): string {
  const h = /^#{1,3}\s+(.+)$/m.exec(markdown);
  const base = (h?.[1] ?? markdown.split("\n").find((l) => l.trim()) ?? "Resposta da Sofia")
    .replace(/[*_`#>]/g, "")
    .trim();
  return base.length > 80 ? base.slice(0, 77) + "…" : base || "Resposta da Sofia";
}
