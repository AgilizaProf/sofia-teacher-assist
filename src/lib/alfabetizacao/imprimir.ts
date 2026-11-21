// Impressão dos cartões de leitura e das atividades.
import type { Cartao } from "./tipos";
import { NIVEIS_CARTAO } from "./tipos";

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Fontes e cores do AgilizaProf, para todo impresso desta tela. */
export const MARCA_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Sora:wght@700;800&display=swap');
:root{--ink:#14161F;--muted:#596074;--line:#D6DBE5;--green:#0B7A55;--green-soft:#CDEFE2;--sun:#FFB224;
  --display:'Sora','Segoe UI',system-ui,sans-serif;--body:'DM Sans','Segoe UI',system-ui,sans-serif;}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
.marca{display:inline-flex;align-items:center;gap:1.6mm;font-family:var(--display);font-weight:800;letter-spacing:-.03em;color:var(--ink);white-space:nowrap}
.marca b{color:var(--green);font-weight:800}
.marca svg{display:block;flex:none}
`;

/** O lápis e o nome AgilizaProf, como no topo do app. `alt` é a altura em mm. */
export function marcaHtml(alt = 6): string {
  return `<span class="marca" style="font-size:${(alt * 0.62).toFixed(2)}mm"><svg width="${alt}mm" height="${alt}mm" viewBox="0 0 100 100" aria-hidden="true"><rect x="10" y="40" width="12" height="22" rx="5" fill="#F2604B"/><rect x="20" y="40" width="10" height="22" fill="#3D8BFD"/><rect x="30" y="40" width="40" height="22" fill="#0B7A55"/><polygon points="70,40 92,51 70,62" fill="#FFB224"/><polygon points="85,47.5 92,51 85,54.5" fill="#14161F"/><line x1="14" y1="28" x2="44" y2="28" stroke="#14161F" stroke-width="6" stroke-linecap="round"/><line x1="6" y1="74" x2="32" y2="74" stroke="#14161F" stroke-width="6" stroke-linecap="round"/></svg><span>Agiliza<b>Prof</b></span></span>`;
}

const CSS = `${MARCA_CSS}
*{box-sizing:border-box}
body{margin:0;font-family:var(--body);color:var(--ink)}
.pg{display:grid;gap:7mm;padding:10mm 11mm 10mm 10mm;page-break-after:always;height:297mm;align-content:start}
.pg:last-child{page-break-after:auto}
.pg.g4{grid-template-columns:1fr 1fr;grid-template-rows:repeat(2,133mm)}
.pg.g2{grid-template-columns:1fr;grid-template-rows:repeat(2,133mm)}
.pg.g1{grid-template-columns:1fr;grid-template-rows:270mm}
.ct{border:0.7mm solid var(--ink);border-radius:5mm;background:#fff;box-shadow:1.4mm 1.4mm 0 var(--sun);padding:5.5mm 6.5mm 5mm;display:flex;flex-direction:column;overflow:hidden}
.ct-h{display:flex;justify-content:space-between;align-items:center;gap:3mm;padding-bottom:3mm;margin-bottom:4mm;border-bottom:0.5mm solid var(--line)}
.ct-nv{display:inline-flex;align-items:center;gap:1.5mm;padding:1mm 2.6mm 1mm 1mm;border-radius:99mm;background:var(--green-soft);color:var(--green);font-weight:700;font-size:8.5pt;white-space:nowrap}
.ct-nv i{display:grid;place-items:center;width:5.4mm;height:5.4mm;border-radius:50%;background:var(--green);color:#fff;font-style:normal;font-family:var(--display);font-size:8.5pt}
.ct-t{font-family:var(--display);font-weight:800;font-size:12pt;letter-spacing:-.03em;margin:0 0 3mm}
.ct-b{flex:1;display:flex;flex-direction:column;justify-content:center}
.sil{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm 4mm;text-align:center;font-size:34px;font-weight:700;letter-spacing:1px}
.pal{display:grid;grid-template-columns:repeat(2,1fr);gap:7mm 4mm;text-align:center;font-size:27px;font-weight:700}
.fra{display:grid;gap:9mm;font-size:27px;line-height:1.35}
.tx h3{margin:0 0 5mm;font-family:var(--display);font-weight:800;letter-spacing:-.03em;font-size:24px;text-align:center}
.tx p{margin:0;font-size:21px;line-height:1.75}
.g1 .tx p{font-size:25px;line-height:1.9}
.g1 .tx h3{font-size:30px}
.ct-f{display:flex;justify-content:space-between;gap:3mm;font-size:8pt;color:var(--muted);margin-top:3.5mm;padding-top:2mm;border-top:0.5mm solid var(--line)}
.ct-f b{color:var(--ink);font-weight:700}
@media print{@page{size:A4;margin:0}}
`;

function corpo(c: Cartao): string {
  if (c.tipo === "silabas")
    return `<div class="sil">${c.itens.map((s) => `<div>${esc(s.toUpperCase())}</div>`).join("")}</div>`;
  if (c.tipo === "palavras")
    return `<div class="pal">${c.itens.map((s) => `<div>${esc(s.toUpperCase())}</div>`).join("")}</div>`;
  if (c.tipo === "frases")
    return `<div class="fra">${c.itens.map((s) => `<div>${esc(s)}</div>`).join("")}</div>`;
  return `<div class="tx"><h3>${esc(c.titulo)}</h3><p>${esc(c.texto || "")}</p></div>`;
}

function htmlCartao(c: Cartao): string {
  const nv = NIVEIS_CARTAO.find((n) => n.n === c.nivel);
  const titulo = c.tipo === "texto" ? "" : `<p class="ct-t">${esc(c.titulo)}</p>`;
  return `<div class="ct"><div class="ct-h">${marcaHtml(6)}<span class="ct-nv"><i>${c.nivel}</i>${esc(nv?.nome || "")}</span></div>${titulo}<div class="ct-b">${corpo(c)}</div><div class="ct-f"><span>Cartão de leitura <b>${esc(c.id)}</b></span><span>${c.total} ${c.tipo === "silabas" ? "sílabas" : "palavras"}</span></div></div>`;
}

/** Quantos cartões cabem por folha A4, conforme o tipo. */
function porFolha(c: Cartao): 1 | 2 | 4 {
  if (c.tipo === "texto") return c.nivel === 6 ? 1 : 2;
  if (c.tipo === "frases") return 2;
  return 4;
}

export function htmlCartoes(cartoes: Cartao[]): string {
  const paginas: string[] = [];
  let i = 0;
  while (i < cartoes.length) {
    const n = porFolha(cartoes[i]);
    const grupo: Cartao[] = [];
    while (i < cartoes.length && grupo.length < n && porFolha(cartoes[i]) === n)
      grupo.push(cartoes[i++]);
    paginas.push(`<div class="pg g${n}">${grupo.map(htmlCartao).join("")}</div>`);
  }
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Cartões de leitura</title><style>${CSS}</style></head><body>${paginas.join("")}</body></html>`;
}

/** Abre o HTML em uma janela nova e chama a impressão. */
export function imprimirHtml(html: string): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  let feito = false;
  const imprimir = () => {
    if (feito) return;
    feito = true;
    try {
      w.focus();
      w.print();
    } catch {
      /* a professora pode imprimir pelo menu do navegador */
    }
  };
  // espera as letras do AgilizaProf carregarem (no máximo 2,5 s) antes de imprimir
  const quandoPronto = () => {
    w.document.fonts.ready.then(() => setTimeout(imprimir, 150)).catch(imprimir);
    setTimeout(imprimir, 2500);
  };
  if (w.document.readyState === "complete") quandoPronto();
  else w.addEventListener("load", quandoPronto);
  return true;
}
