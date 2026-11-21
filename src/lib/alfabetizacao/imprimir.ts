// Impressão dos cartões de leitura e das atividades.
import type { Cartao } from "./tipos";
import { NIVEIS_CARTAO } from "./tipos";

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const CSS = `
*{box-sizing:border-box}
body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#111}
.pg{display:grid;gap:6mm;padding:10mm;page-break-after:always;height:297mm;align-content:start}
.pg:last-child{page-break-after:auto}
.pg.g4{grid-template-columns:1fr 1fr;grid-template-rows:repeat(2,134mm)}
.pg.g2{grid-template-columns:1fr;grid-template-rows:repeat(2,134mm)}
.pg.g1{grid-template-columns:1fr;grid-template-rows:270mm}
.ct{border:2px dashed #666;border-radius:5mm;padding:7mm;display:flex;flex-direction:column;overflow:hidden}
.ct-h{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:11px;color:#444;border-bottom:1px solid #bbb;padding-bottom:3px;margin-bottom:5mm}
.ct-h b{font-size:13px;color:#111}
.ct-b{flex:1;display:flex;flex-direction:column;justify-content:center}
.sil{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm 4mm;text-align:center;font-size:34px;font-weight:bold;letter-spacing:1px}
.pal{display:grid;grid-template-columns:repeat(2,1fr);gap:7mm 4mm;text-align:center;font-size:27px;font-weight:bold}
.fra{display:grid;gap:9mm;font-size:27px;line-height:1.35}
.tx h3{margin:0 0 5mm;font-size:24px;text-align:center}
.tx p{margin:0;font-size:21px;line-height:1.75}
.g1 .tx p{font-size:25px;line-height:1.9}
.g1 .tx h3{font-size:30px}
.ct-f{font-size:10px;color:#666;margin-top:4mm;text-align:right}
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
  return `<div class="ct"><div class="ct-h"><b>${esc(c.tipo === "texto" ? "Leitura" : c.titulo)}</b><span>Nível ${c.nivel} · ${esc(nv?.nome || "")} · ${esc(c.id)}</span></div><div class="ct-b">${corpo(c)}</div><div class="ct-f">${c.total} ${c.tipo === "silabas" ? "sílabas" : "palavras"} · AgilizaProf</div></div>`;
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
  const imprimir = () => {
    try {
      w.focus();
      w.print();
    } catch {
      /* a professora pode imprimir pelo menu do navegador */
    }
  };
  if (w.document.readyState === "complete") setTimeout(imprimir, 300);
  else w.addEventListener("load", () => setTimeout(imprimir, 300));
  return true;
}
