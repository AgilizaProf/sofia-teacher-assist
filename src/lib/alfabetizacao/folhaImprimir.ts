// Monta a folha da turma para imprimir (A4 em pé), com tudo em milímetros
// nas posições que a leitura da foto espera (ver folha.ts).
import QRCode from "qrcode";
import {
  CANTOS_MM,
  CANTO_LADO,
  FAIXA,
  QR_MM,
  TABELA,
  alunosDaPagina,
  bitsDaFaixa,
  codigoTexto,
  paginasDaFolha,
  yDaLinha,
  type FolhaSondagem,
} from "./folha";
import { NIVEIS_LEITURA } from "./tipos";
import { dataCurta } from "./store";

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const mm = (n: number) => `${Math.round(n * 100) / 100}mm`;

function caixa(classe: string, x: number, y: number, l: number, a: number, extra = ""): string {
  return `<i class="${classe}" style="left:${mm(x)};top:${mm(y)};width:${mm(l)};height:${mm(a)};${extra}"></i>`;
}

/** QR code em SVG (nítido em qualquer impressora). */
function qrSvg(texto: string): string {
  const qr = QRCode.create(texto, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  let d = "";
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) if (qr.modules.get(x, y)) d += `M${x} ${y}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><path d="${d}" fill="#000"/></svg>`;
}

const CSS = `
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;color:#000}
.pg{position:relative;width:210mm;height:297mm;overflow:hidden;page-break-after:always;background:#fff}
.pg:last-child{page-break-after:auto}
.pg i{position:absolute;display:block}
.pg .t{position:absolute;white-space:nowrap;overflow:hidden}
.pg .pt{background:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg .cx{border:0.35mm solid #000;background:#fff}
.pg .ln{border-bottom:0.2mm solid #999}
.qr{position:absolute}
.qr svg{display:block;width:100%;height:100%}
@media print{@page{size:A4;margin:0}}
`;

const ROTULO = ["Pré-leitor", "Sílabas", "Palavras", "Frases", "Texto", "Fluente"];

function pagina(f: FolhaSondagem, p: number, total: number, link: string): string {
  const partes: string[] = [];
  // quadrados dos cantos
  for (const [cx, cy] of CANTOS_MM)
    partes.push(caixa("pt", cx - CANTO_LADO / 2, cy - CANTO_LADO / 2, CANTO_LADO, CANTO_LADO));
  // faixa que identifica a folha
  bitsDaFaixa(f.cod, p).forEach((b, i) => {
    if (b)
      partes.push(
        caixa(
          "pt",
          FAIXA.x0 + i * FAIXA.celula,
          FAIXA.y - FAIXA.celula / 2,
          FAIXA.celula,
          FAIXA.celula,
        ),
      );
  });
  // cabeçalho
  partes.push(
    `<div class="t" style="left:24mm;top:10.5mm;width:136mm;font-size:15pt;font-weight:bold">Leitura: nível de cada aluno</div>`,
    `<div class="t" style="left:24mm;top:18mm;width:136mm;font-size:10.5pt">Turma: <b>${esc(f.turma || "Todos os alunos")}</b> &nbsp;·&nbsp; Folha ${codigoTexto(f.cod)}${total > 1 ? ` &nbsp;·&nbsp; Página ${p + 1} de ${total}` : ""} &nbsp;·&nbsp; ${dataCurta(f.criada)}</div>`,
    `<div class="t" style="left:24mm;top:24.5mm;width:136mm;font-size:9.5pt;white-space:normal;line-height:1.35">Ouça cada criança ler e marque um <b>X forte, de caneta</b>, em um só quadrinho da linha dela. Deixe em branco quem não leu hoje. Depois, tire uma foto da folha inteira pelo app.</div>`,
    `<div class="t" style="left:24mm;top:38mm;width:136mm;font-size:8pt;color:#333">Não escreva nem dobre em cima dos quadrados pretos e desta faixa:</div>`,
    `<div class="qr" style="left:${mm(QR_MM.x)};top:${mm(QR_MM.y)};width:${mm(QR_MM.lado)};height:${mm(QR_MM.lado)}">${qrSvg(link)}</div>`,
    `<div class="t" style="left:${mm(QR_MM.x + QR_MM.lado / 2 - 22)};top:${mm(QR_MM.y + QR_MM.lado + 1)};width:44mm;font-size:7pt;text-align:center">Aponte a câmera para abrir no app</div>`,
  );
  // títulos das colunas
  const yTit = TABELA.yPrimeira - TABELA.alturaLinha / 2 - 10.5;
  partes.push(
    `<div class="t" style="left:${mm(TABELA.xNome)};top:${mm(yTit + 5)};width:60mm;font-size:9pt;font-weight:bold">Aluno</div>`,
  );
  TABELA.xNivel.forEach((x, k) => {
    partes.push(
      `<div class="t" style="left:${mm(x - 6.2)};top:${mm(yTit)};width:12.4mm;text-align:center;font-size:12pt;font-weight:bold">${k + 1}</div>`,
      `<div class="t" style="left:${mm(x - 6.2)};top:${mm(yTit + 5.4)};width:12.4mm;text-align:center;font-size:7pt">${ROTULO[k]}</div>`,
    );
  });
  partes.push(
    caixa(
      "ln",
      12,
      TABELA.yPrimeira - TABELA.alturaLinha / 2 - 0.2,
      186,
      0.2,
      "border-bottom-color:#000",
    ),
  );
  // alunos
  const alunos = alunosDaPagina(f, p);
  alunos.forEach((a, r) => {
    const y = yDaLinha(r);
    const n = p * TABELA.porPagina + r + 1;
    partes.push(
      `<div class="t" style="left:${mm(TABELA.xNumero)};top:${mm(y - 2.2)};width:7mm;font-size:9pt;color:#444">${n}</div>`,
      `<div class="t" style="left:${mm(TABELA.xNome)};top:${mm(y - 2.4)};width:96mm;font-size:10.5pt">${esc(a.nome)}</div>`,
      caixa("ln", 12, y + TABELA.alturaLinha / 2 - 0.2, 186, 0.2),
    );
    for (const x of TABELA.xNivel)
      partes.push(
        caixa("cx", x - TABELA.caixa / 2, y - TABELA.caixa / 2, TABELA.caixa, TABELA.caixa),
      );
  });
  // legenda
  const leg = NIVEIS_LEITURA.map((n) => `<b>${n.n}</b> ${esc(n.nome)}: ${esc(n.desc)}`).join(
    " &nbsp; ",
  );
  partes.push(
    `<div class="t" style="left:27mm;top:264mm;width:156mm;font-size:7pt;line-height:1.3;white-space:normal;color:#222">${leg}</div>`,
    `<div class="t" style="left:27mm;top:284mm;width:156mm;font-size:7pt;color:#555;text-align:center">AgilizaProf · Criança alfabetizada</div>`,
  );
  return `<div class="pg">${partes.join("")}</div>`;
}

/** HTML da folha (uma página para cada 27 alunos). `link` é o que o QR code abre. */
export function htmlFolha(f: FolhaSondagem, link: string): string {
  const total = paginasDaFolha(f);
  const paginas = Array.from({ length: total }, (_, p) => pagina(f, p, total, link));
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Folha de leitura · ${esc(f.turma || "turma")}</title><style>${CSS}</style></head><body>${paginas.join("")}</body></html>`;
}
