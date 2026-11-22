// Folha da turma para marcar no papel o nível de leitura de cada aluno.
//
// A professora imprime a folha, marca um X no nível de cada criança e manda a
// foto pelo app. A leitura da foto é feita aqui mesmo, no aparelho, sem IA e
// sem custo: quatro quadrados pretos nos cantos dão a posição da folha, uma
// faixa de quadradinhos diz qual folha é, e depois é só ver qual quadrinho de
// cada linha está marcado. A foto não é guardada nem enviada.
//
// Tudo neste arquivo é conta pura (sem tela), para poder ser testado.
import type { FolhaGuardada, NivelLeitura } from "./tipos";

// ───────────────────────── medidas da folha (mm, A4 em pé) ─────────────────

export const FOLHA_L = 210;
export const FOLHA_A = 297;

/** Lado dos quadrados pretos dos cantos. */
export const CANTO_LADO = 9;
/** Centros dos quadrados dos cantos: cima-esquerda, cima-direita, baixo-direita, baixo-esquerda. */
export const CANTOS_MM: Array<[number, number]> = [
  [15, 15],
  [195, 15],
  [195, 282],
  [15, 282],
];

/** Faixa de quadradinhos que identifica a folha. */
export const FAIXA = { x0: 24, y: 48, celula: 4, n: 27 };

/** Tabela dos alunos. */
export const TABELA = {
  yPrimeira: 71.5, // centro da primeira linha
  alturaLinha: 7,
  porPagina: 27,
  xNumero: 12,
  xNome: 20,
  /** Centro do quadrinho de cada nível (1 a 6). */
  xNivel: [127, 139.5, 152, 164.5, 177, 189.5],
  caixa: 6.5,
};

export const QR_MM = { x: 164, y: 24, lado: 24 };

export function yDaLinha(i: number): number {
  return TABELA.yPrimeira + i * TABELA.alturaLinha;
}

// ───────────────────────── a folha guardada na conta ───────────────────────

/** Código de 1 a 65535 (impresso na faixa e no QR code), turma, dia e alunos na ordem das linhas. */
export type FolhaSondagem = FolhaGuardada;

export function paginasDaFolha(f: FolhaSondagem): number {
  return Math.max(1, Math.ceil(f.alunos.length / TABELA.porPagina));
}

export function alunosDaPagina(
  f: FolhaSondagem,
  pagina: number,
): Array<{ id: string; nome: string }> {
  return f.alunos.slice(pagina * TABELA.porPagina, (pagina + 1) * TABELA.porPagina);
}

/** Código novo, diferente dos que já existem. */
export function novoCodigo(usados: number[], sorteio: () => number = Math.random): number {
  for (let i = 0; i < 200; i++) {
    const c = 1 + Math.floor(sorteio() * 65535);
    if (!usados.includes(c)) return c;
  }
  let c = 1;
  while (usados.includes(c)) c++;
  return c;
}

/** Texto do código para a professora ler (ex.: "4F2A"). */
export function codigoTexto(cod: number): string {
  return cod.toString(16).toUpperCase().padStart(4, "0");
}

export function codigoDeTexto(t: string | null | undefined): number | null {
  if (!t || !/^[0-9a-fA-F]{1,4}$/.test(t.trim())) return null;
  const n = parseInt(t.trim(), 16);
  return n >= 1 && n <= 65535 ? n : null;
}

// ───────────────────────── faixa de identificação ──────────────────────────

function crc8(bits: number[]): number {
  let crc = 0x5a;
  for (const b of bits) {
    const topo = ((crc >> 7) & 1) ^ (b & 1);
    crc = (crc << 1) & 0xff;
    if (topo) crc ^= 0x07;
  }
  return crc;
}

/** 16 bits do código, 3 da página e 8 de conferência. 1 = quadradinho preto. */
export function bitsDaFaixa(cod: number, pagina: number): number[] {
  const bits: number[] = [];
  for (let i = 15; i >= 0; i--) bits.push((cod >> i) & 1);
  for (let i = 2; i >= 0; i--) bits.push((pagina >> i) & 1);
  const c = crc8(bits);
  for (let i = 7; i >= 0; i--) bits.push((c >> i) & 1);
  return bits;
}

export function lerBitsDaFaixa(bits: number[]): { cod: number; pagina: number } | null {
  if (bits.length !== FAIXA.n) return null;
  const dados = bits.slice(0, 19);
  let c = 0;
  for (const b of bits.slice(19)) c = (c << 1) | (b & 1);
  if (crc8(dados) !== c) return null;
  let cod = 0;
  for (const b of dados.slice(0, 16)) cod = (cod << 1) | (b & 1);
  let pagina = 0;
  for (const b of dados.slice(16)) pagina = (pagina << 1) | (b & 1);
  if (cod < 1) return null;
  return { cod, pagina };
}

// ───────────────────────── projeção da folha na foto ───────────────────────

/** Matriz 3x3 (em linha) que leva um ponto da folha (mm) para a foto (pixel). */
export type Projecao = number[];

/** Acha a projeção a partir de 4 pontos da folha e os 4 pontos correspondentes na foto. */
export function projecaoDe4(
  mm: Array<[number, number]>,
  px: Array<[number, number]>,
): Projecao | null {
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = mm[i];
    const [u, v] = px[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  // eliminação de Gauss com pivô
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-9) return null;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      if (!f) continue;
      for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k];
    }
  }
  const h = A.map((linha, i) => linha[8] / linha[i]);
  return [...h, 1];
}

export function projetar(h: Projecao, x: number, y: number): [number, number] {
  const w = h[6] * x + h[7] * y + h[8];
  return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w];
}

// ───────────────────────── leitura dos pixels ──────────────────────────────

export type Imagem = { cinza: Uint8Array | Uint8ClampedArray; w: number; h: number };

/**
 * Separa o escuro do claro comparando cada ponto com a média da vizinhança,
 * para aguentar sombra e luz desigual. Devolve 1 onde é escuro.
 */
export function binarizar(img: Imagem, raioPedido?: number): Uint8Array {
  const { cinza, w, h } = img;
  const W = w + 1;
  const soma = new Float64Array(W * (h + 1));
  for (let y = 0; y < h; y++) {
    let linha = 0;
    for (let x = 0; x < w; x++) {
      linha += cinza[y * w + x];
      soma[(y + 1) * W + (x + 1)] = soma[y * W + (x + 1)] + linha;
    }
  }
  const raio = raioPedido ?? Math.max(12, Math.round(Math.min(w, h) / 10));
  const bin = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - raio);
    const y1 = Math.min(h, y + raio + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - raio);
      const x1 = Math.min(w, x + raio + 1);
      const s = soma[y1 * W + x1] - soma[y0 * W + x1] - soma[y1 * W + x0] + soma[y0 * W + x0];
      const media = s / ((x1 - x0) * (y1 - y0));
      // escuro se bem abaixo da vizinhança; ou muito escuro de qualquer jeito
      const v = cinza[y * w + x];
      if (v < media * 0.72 || v < 50) bin[y * w + x] = 1;
    }
  }
  return bin;
}

type Mancha = {
  area: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  cx: number;
  cy: number;
};

/** Manchas escuras ligadas (vizinhança de 4). */
export function manchas(bin: Uint8Array, w: number, h: number, areaMin: number): Mancha[] {
  const visto = new Uint8Array(w * h);
  const pilha = new Int32Array(w * h);
  const out: Mancha[] = [];
  for (let i0 = 0; i0 < w * h; i0++) {
    if (!bin[i0] || visto[i0]) continue;
    let topo = 0;
    pilha[topo++] = i0;
    visto[i0] = 1;
    let area = 0;
    let sx = 0;
    let sy = 0;
    let x0 = w;
    let x1 = 0;
    let y0 = h;
    let y1 = 0;
    while (topo) {
      const i = pilha[--topo];
      const x = i % w;
      const y = (i - x) / w;
      area++;
      sx += x;
      sy += y;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (x > 0 && bin[i - 1] && !visto[i - 1]) {
        visto[i - 1] = 1;
        pilha[topo++] = i - 1;
      }
      if (x < w - 1 && bin[i + 1] && !visto[i + 1]) {
        visto[i + 1] = 1;
        pilha[topo++] = i + 1;
      }
      if (y > 0 && bin[i - w] && !visto[i - w]) {
        visto[i - w] = 1;
        pilha[topo++] = i - w;
      }
      if (y < h - 1 && bin[i + w] && !visto[i + w]) {
        visto[i + w] = 1;
        pilha[topo++] = i + w;
      }
    }
    if (area >= areaMin) out.push({ area, x0, x1, y0, y1, cx: sx / area, cy: sy / area });
  }
  return out;
}

function areaQuadrilatero(p: Array<[number, number]>): number {
  let a = 0;
  for (let i = 0; i < 4; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % 4];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/** Fração de pontos escuros em um quadrado da folha (centro e meio lado em mm). */
function escuro(
  bin: Uint8Array,
  w: number,
  h: number,
  proj: Projecao,
  cx: number,
  cy: number,
  meio: number,
  n = 9,
): number {
  let dentro = 0;
  let escuros = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = cx - meio + (2 * meio * (i + 0.5)) / n;
      const y = cy - meio + (2 * meio * (j + 0.5)) / n;
      const [u, v] = projetar(proj, x, y);
      const px = Math.round(u);
      const py = Math.round(v);
      if (px < 0 || py < 0 || px >= w || py >= h) continue;
      dentro++;
      if (bin[py * w + px]) escuros++;
    }
  }
  return dentro ? escuros / dentro : 0;
}

/** Tom médio (0 a 255) de um quadrado da folha (centro e meio lado em mm). */
function tomMedio(
  img: Imagem,
  proj: Projecao,
  cx: number,
  cy: number,
  meio: number,
  n: number,
): number {
  const { cinza, w, h } = img;
  let dentro = 0;
  let soma = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = cx - meio + (2 * meio * (i + 0.5)) / n;
      const y = cy - meio + (2 * meio * (j + 0.5)) / n;
      const [u, v] = projetar(proj, x, y);
      const px = Math.round(u);
      const py = Math.round(v);
      if (px < 0 || py < 0 || px >= w || py >= h) continue;
      dentro++;
      soma += cinza[py * w + px];
    }
  }
  return dentro ? soma / dentro : 255;
}

/**
 * Quanta tinta há dentro de um quadrinho (0 = vazio, perto de 1 = pintado).
 * Compara o tom de dentro com o papel em branco logo ao lado, na mesma linha.
 * Assim a sombra não atrapalha, e um risco fino conta mesmo em foto fora de
 * foco, porque o borrão espalha a tinta mas não some com ela.
 */
function tintaDoQuadrinho(img: Imagem, proj: Projecao, x: number, y: number): number {
  const passo = (TABELA.xNivel[1] - TABELA.xNivel[0]) / 2;
  const papel = Math.max(
    tomMedio(img, proj, x - passo, y, 1.1, 5),
    tomMedio(img, proj, x + passo, y, 1.1, 5),
  );
  if (papel < 1) return 0;
  const dentro = tomMedio(img, proj, x, y, 2.1, 11);
  return Math.max(0, 1 - dentro / papel);
}

export type LinhaLida = {
  /** Nível marcado, ou null se a linha ficou em branco. */
  nivel: NivelLeitura | null;
  /** true quando há mais de uma marca ou a marca é fraca: a professora confere. */
  duvida: boolean;
};

/**
 * Decide o nível de uma linha a partir de quanta tinta há em cada um dos 6
 * quadrinhos (0 a 1). Compara os quadrinhos entre si: o marcado tem bem mais
 * tinta que os vazios da mesma linha.
 */
export function decidirLinha(forcas: number[]): LinhaLida {
  const ord = [...forcas].sort((a, b) => a - b);
  const base = (ord[1] + ord[2]) / 2; // os vazios da linha
  const todos = forcas.map((f, i) => ({ f, i })).sort((a, b) => b.f - a.f);
  const fortes = todos.filter((x) => x.f >= base + 0.06 && x.f >= 0.07);
  if (fortes.length > 0) {
    const melhor = fortes[0];
    const nivel = (melhor.i + 1) as NivelLeitura;
    // duas marcas na mesma linha: fica a mais forte, mas a professora confere
    if (fortes.length > 1 && fortes[1].f > melhor.f * 0.5) return { nivel, duvida: true };
    return { nivel, duvida: false };
  }
  // marca fraquinha (risco fino de caneta): sugere, mas pede para conferir
  const fraca = todos[0];
  if (fraca.f >= base + 0.025 && fraca.f >= 0.03)
    return { nivel: (fraca.i + 1) as NivelLeitura, duvida: true };
  return { nivel: null, duvida: false };
}

/** Um retângulo dentro da foto, em pontos. */
export type Caixa = { x0: number; y0: number; x1: number; y1: number };

export type LeituraDaFolha =
  | {
      ok: true;
      cod: number;
      pagina: number;
      linhas: LinhaLida[];
      /** Onde a folha está na foto (retângulo em volta dos 4 quadrados). */
      quadro: Caixa;
      /** Tamanho da folha na foto: pontos por milímetro. */
      pontosPorMm: number;
    }
  | {
      ok: false;
      motivo: "sem_cantos" | "sem_codigo";
      /** Lugares da foto que parecem uma folha (para olhar de perto). */
      quadros: Caixa[];
    };

type Quadro = { pts: Array<[number, number]>; area: number; curto: number };

const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function caixaDe(pts: Array<[number, number]>): Caixa {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

/**
 * Procura, em qualquer lugar e em qualquer tamanho da foto, grupos de 4
 * quadrados pretos que formam o retângulo da folha. Não importa se a folha
 * ocupa a foto inteira ou só um pedaço pequeno dela.
 */
function acharQuadros(bin: Uint8Array, w: number, h: number): Quadro[] {
  const menor = Math.min(w, h);
  const ladoMin = Math.max(4, menor * 0.0035);
  const ladoMax = menor * 0.11;
  const todas = manchas(bin, w, h, Math.max(12, Math.floor(ladoMin * ladoMin * 0.5)));
  const cand = todas
    .filter((m) => {
      const mw = m.x1 - m.x0 + 1;
      const mh = m.y1 - m.y0 + 1;
      if (mw < ladoMin || mh < ladoMin || mw > ladoMax || mh > ladoMax) return false;
      const prop = mw / mh;
      if (prop < 0.5 || prop > 2) return false;
      return m.area / (mw * mh) >= 0.5; // cheio (um quadrado girado ocupa menos a caixa)
    })
    .sort((a, b) => b.area - a.area)
    .slice(0, 48);
  const n = cand.length;
  const out: Quadro[] = [];
  if (n < 4) return out;
  // proporção entre o quadrado do canto e o lado curto do retângulo dos cantos
  const alvo = CANTO_LADO / (CANTOS_MM[1][0] - CANTOS_MM[0][0]);
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++) {
      if (cand[a].area > cand[b].area * 5) break; // ordenado por área: daqui em diante só piora
      for (let c = b + 1; c < n; c++) {
        if (cand[a].area > cand[c].area * 5) break;
        for (let d = c + 1; d < n; d++) {
          if (cand[a].area > cand[d].area * 5) break;
          const q = [cand[a], cand[b], cand[c], cand[d]];
          const mx = (q[0].cx + q[1].cx + q[2].cx + q[3].cx) / 4;
          const my = (q[0].cy + q[1].cy + q[2].cy + q[3].cy) / 4;
          const pts = q
            .map((m) => [m.cx, m.cy] as [number, number])
            .sort(
              (p1, p2) => Math.atan2(p1[1] - my, p1[0] - mx) - Math.atan2(p2[1] - my, p2[0] - mx),
            );
          const l = [0, 1, 2, 3].map((i) => dist(pts[i], pts[(i + 1) % 4]));
          // lados opostos parecidos (a foto torta deforma, mas não tanto)
          const r1 = l[0] / l[2];
          const r2 = l[1] / l[3];
          if (r1 < 0.5 || r1 > 2 || r2 < 0.5 || r2 > 2) continue;
          const m1 = (l[0] + l[2]) / 2;
          const m2 = (l[1] + l[3]) / 2;
          const curto = Math.min(m1, m2);
          const longo = Math.max(m1, m2);
          // a folha é mais alta que larga: 267 por 180 mm entre os quadrados
          const prop = longo / curto;
          if (prop < 1.08 || prop > 2.1) continue;
          const area = Math.abs(areaQuadrilatero(pts));
          if (area < curto * longo * 0.6) continue; // muito torto para ser a folha
          // o quadrado do canto tem que combinar com o tamanho da folha
          const lado = Math.sqrt((q[0].area + q[1].area + q[2].area + q[3].area) / 4);
          const rel = lado / curto / alvo;
          if (rel < 0.45 || rel > 2.2) continue;
          out.push({ pts, area, curto });
        }
      }
    }
  out.sort((x, y) => y.area - x.area);
  return out.slice(0, 60);
}

/**
 * Lê a foto de uma folha. `linhasDe` diz quantas linhas ler em cada folha
 * conhecida (quando a folha não é conhecida, lê a página inteira).
 */
export function lerFolha(
  img: Imagem,
  linhasDe?: (cod: number, pagina: number) => number | null,
): LeituraDaFolha {
  const { w, h } = img;
  const menor = Math.min(w, h);
  const quadros: Caixa[] = [];
  // duas vizinhanças: a larga serve para a folha de perto; a curta, para a
  // folha pequena no meio de uma mesa escura ou de uma sala
  const raios = [Math.max(12, Math.round(menor / 10)), Math.max(10, Math.round(menor / 34))];
  for (const raio of raios) {
    const bin = binarizar(img, raio);
    for (const combo of acharQuadros(bin, w, h)) {
      if (quadros.length < 6) quadros.push(caixaDe(combo.pts));
      // os pontos estão em ordem ao redor do centro; falta saber qual é o de cima à esquerda
      for (let giro = 0; giro < 4; giro++) {
        const px = [0, 1, 2, 3].map((i) => combo.pts[(i + giro) % 4]);
        const proj = projecaoDe4(CANTOS_MM, px);
        if (!proj) continue;
        const bits: number[] = [];
        for (let i = 0; i < FAIXA.n; i++) {
          const f = escuro(bin, w, h, proj, FAIXA.x0 + (i + 0.5) * FAIXA.celula, FAIXA.y, 1.3, 5);
          bits.push(f > 0.5 ? 1 : 0);
        }
        const id = lerBitsDaFaixa(bits);
        if (!id) continue;
        const conhecidas = linhasDe ? linhasDe(id.cod, id.pagina) : null;
        if (linhasDe && conhecidas === null) continue; // código que não é de nenhuma folha da conta
        const total = conhecidas ?? TABELA.porPagina;
        const linhas: LinhaLida[] = [];
        for (let r = 0; r < total; r++) {
          const forcas = TABELA.xNivel.map((x) => tintaDoQuadrinho(img, proj, x, yDaLinha(r)));
          linhas.push(decidirLinha(forcas));
        }
        return {
          ok: true,
          cod: id.cod,
          pagina: id.pagina,
          linhas,
          quadro: caixaDe(combo.pts),
          pontosPorMm: combo.curto / (CANTOS_MM[1][0] - CANTOS_MM[0][0]),
        };
      }
    }
  }
  return { ok: false, motivo: quadros.length ? "sem_codigo" : "sem_cantos", quadros };
}

/** De onde vem a foto: tamanho original e um jeito de pegar a foto inteira ou um pedaço. */
export type FonteDaFoto = {
  w: number;
  h: number;
  /** Devolve a foto (ou só o recorte) com o maior lado em até `maxLado` pontos. */
  pegar: (recorte: Caixa | null, maxLado: number) => Imagem;
};

/** Abaixo disto (pontos por mm) a marca de caneta pode não aparecer direito. */
const NITIDEZ_BOA = 3.4;
const NITIDEZ_MINIMA = 1.9;

/**
 * Lê a folha mesmo em foto tirada de longe. Primeiro procura a folha na foto
 * inteira; se ela estiver pequena, recorta só aquele pedaço da foto original,
 * que tem mais detalhe, e lê de novo.
 */
export function lerFolhaNaFoto(
  fonte: FonteDaFoto,
  linhasDe?: (cod: number, pagina: number) => number | null,
  maxLado = 1700,
): LeituraDaFolha {
  const inteira = fonte.pegar(null, maxLado);
  const r1 = lerFolha(inteira, linhasDe);
  if (r1.ok && r1.pontosPorMm >= NITIDEZ_BOA) return r1;
  const escala = fonte.w / inteira.w; // da foto reduzida para a original
  const lugares = r1.ok ? [r1.quadro] : r1.quadros.slice(0, 4);
  let melhor: LeituraDaFolha = r1;
  for (const q of lugares) {
    // folga em volta: os quadrados ficam a 15 mm da borda do papel
    const fx = (q.x1 - q.x0) * 0.16 + 8;
    const fy = (q.y1 - q.y0) * 0.16 + 8;
    const rec: Caixa = {
      x0: Math.max(0, Math.floor((q.x0 - fx) * escala)),
      y0: Math.max(0, Math.floor((q.y0 - fy) * escala)),
      x1: Math.min(fonte.w, Math.ceil((q.x1 + fx) * escala)),
      y1: Math.min(fonte.h, Math.ceil((q.y1 + fy) * escala)),
    };
    const ladoOriginal = Math.max(rec.x1 - rec.x0, rec.y1 - rec.y0);
    const ladoAntes = ladoOriginal / escala;
    if (Math.min(ladoOriginal, maxLado) < ladoAntes * 1.2) continue; // não ganha detalhe
    const r2 = lerFolha(fonte.pegar(rec, maxLado), linhasDe);
    if (!r2.ok) continue;
    if (!melhor.ok || r2.pontosPorMm > melhor.pontosPorMm) melhor = r2;
    break;
  }
  // folha pequena demais mesmo assim: mostra o que deu para ler, mas pede para conferir tudo
  if (melhor.ok && melhor.pontosPorMm < NITIDEZ_MINIMA)
    return {
      ...melhor,
      linhas: melhor.linhas.map((l) => (l.nivel ? { ...l, duvida: true } : l)),
    };
  return melhor;
}
