import { describe, expect, it } from "vitest";
import {
  CANTOS_MM,
  CANTO_LADO,
  FAIXA,
  FOLHA_A,
  FOLHA_L,
  QR_MM,
  TABELA,
  alunosDaPagina,
  bitsDaFaixa,
  codigoDeTexto,
  codigoTexto,
  decidirLinha,
  lerBitsDaFaixa,
  lerFolha,
  novoCodigo,
  paginasDaFolha,
  projecaoDe4,
  projetar,
  yDaLinha,
  type FolhaSondagem,
  type Imagem,
} from "./folha";
import { htmlFolha } from "./folhaImprimir";

// ───────── "fotografa" uma folha de mentira, para testar a leitura ─────────

type Marca = "x" | "v" | "cheio";
type Cena = {
  cod: number;
  pagina?: number;
  /** marca[linha] = { nivel (1 a 6): tipo de marca } */
  marcas: Record<number, Record<number, Marca>>;
  /** Onde os 4 cantos da FOLHA (0,0 / 210,0 / 210,297 / 0,297) caem na foto. */
  cantosDaFolha: Array<[number, number]>;
  w: number;
  h: number;
  mesa?: number;
  /** Luz: multiplica o brilho de um lado ao outro (ex.: 0.55 = sombra forte). */
  sombra?: number;
  /** Foto fora de foco: raio do borrão, em pontos. */
  borrao?: number;
};

function sorteio(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Quanta tinta há em um ponto da folha (0 = papel, 1 = preto). */
function tinta(x: number, y: number, c: Cena, bits: number[], ruidoQr: Uint8Array): number {
  // quadrados dos cantos
  for (const [cx, cy] of CANTOS_MM)
    if (Math.abs(x - cx) <= CANTO_LADO / 2 && Math.abs(y - cy) <= CANTO_LADO / 2) return 1;
  // faixa
  if (Math.abs(y - FAIXA.y) <= FAIXA.celula / 2) {
    const i = Math.floor((x - FAIXA.x0) / FAIXA.celula);
    if (i >= 0 && i < FAIXA.n && bits[i]) return 1;
  }
  // QR code (só o borrão de quadradinhos, para atrapalhar como o de verdade)
  if (x >= QR_MM.x && x < QR_MM.x + QR_MM.lado && y >= QR_MM.y && y < QR_MM.y + QR_MM.lado) {
    const i = Math.floor(((x - QR_MM.x) / QR_MM.lado) * 33);
    const j = Math.floor(((y - QR_MM.y) / QR_MM.lado) * 33);
    const borda = (a: number, b: number) =>
      a >= 0 &&
      a < 7 &&
      b >= 0 &&
      b < 7 &&
      (a === 0 || a === 6 || b === 0 || b === 6 || (a > 1 && a < 5 && b > 1 && b < 5));
    if (i < 7 && j < 7) return borda(i, j) ? 1 : 0;
    if (i >= 26 && j < 7) return borda(i - 26, j) ? 1 : 0;
    if (i < 7 && j >= 26) return borda(i, j - 26) ? 1 : 0;
    return ruidoQr[j * 33 + i];
  }
  // título
  if (y > 14 && y < 20 && x > 26 && x < 110 && Math.floor(x * 1.3) % 3 !== 0) return 0.9;
  // tabela
  const r = Math.round((y - TABELA.yPrimeira) / TABELA.alturaLinha);
  if (r >= 0 && r < TABELA.porPagina) {
    const dy = y - yDaLinha(r);
    // linha de baixo de cada aluno
    if (Math.abs(dy - TABELA.alturaLinha / 2) < 0.12 && x > 12 && x < 198) return 0.8;
    // "nome" (tracinhos)
    if (
      Math.abs(dy) < 1.1 &&
      x > TABELA.xNome &&
      x < 70 + ((r * 13) % 35) &&
      Math.floor(x * 1.7) % 4 !== 0
    )
      return 0.9;
    for (let k = 0; k < 6; k++) {
      const dx = x - TABELA.xNivel[k];
      const m = TABELA.caixa / 2;
      if (Math.abs(dx) > m + 0.2 || Math.abs(dy) > m + 0.2) continue;
      // contorno do quadrinho
      if (Math.abs(Math.abs(dx) - m) < 0.2 || Math.abs(Math.abs(dy) - m) < 0.2) return 1;
      const marca = c.marcas[r]?.[k + 1];
      if (!marca) continue;
      if (marca === "cheio" && Math.abs(dx) < 2.6 && Math.abs(dy) < 2.6) return 0.95;
      if (marca === "x" && Math.abs(dx) < 2.5 && Math.abs(dy) < 2.5)
        if (Math.abs(dx - dy) < 0.4 || Math.abs(dx + dy) < 0.4) return 0.95;
      if (marca === "v") {
        // um "certinho" de caneta fina
        if (dx > -2.2 && dx < -0.6 && Math.abs(dy - (dx + 1.4)) < 0.28) return 0.9;
        if (dx >= -0.6 && dx < 2.4 && Math.abs(dy - (0.8 - (dx + 0.6) * 0.9)) < 0.28) return 0.9;
      }
    }
  }
  return 0;
}

function fotografar(c: Cena): Imagem {
  const { w, h } = c;
  const bits = bitsDaFaixa(c.cod, c.pagina ?? 0);
  const rnd = sorteio(c.cod);
  const ruidoQr = new Uint8Array(33 * 33).map(() => (rnd() > 0.5 ? 1 : 0));
  // da foto para a folha
  const inv = projecaoDe4(c.cantosDaFolha, [
    [0, 0],
    [FOLHA_L, 0],
    [FOLHA_L, FOLHA_A],
    [0, FOLHA_A],
  ])!;
  const cinza = new Uint8Array(w * h);
  const mesa = c.mesa ?? 70;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      let soma = 0;
      for (let s = 0; s < 4; s++) {
        const [x, y] = projetar(inv, px + 0.25 + (s % 2) * 0.5, py + 0.25 + (s >> 1) * 0.5);
        if (x < 0 || y < 0 || x > FOLHA_L || y > FOLHA_A) soma += mesa;
        else soma += 232 - 205 * tinta(x, y, c, bits, ruidoQr);
      }
      let v = soma / 4;
      if (c.sombra) v *= c.sombra + (1 - c.sombra) * (px / w) * (0.6 + (0.4 * py) / h);
      v += (rnd() - 0.5) * 14;
      cinza[py * w + px] = Math.max(0, Math.min(255, v));
    }
  }
  if (!c.borrao) return { cinza, w, h };
  // borrão simples (média da vizinhança), como uma foto fora de foco
  const r = c.borrao;
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let soma = 0;
      let n = 0;
      for (let j = -r; j <= r; j++)
        for (let i = -r; i <= r; i++) {
          const xx = x + i;
          const yy = y + j;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          soma += cinza[yy * w + xx];
          n++;
        }
      out[y * w + x] = soma / n;
    }
  return { cinza: out, w, h };
}

const MARCAS: Cena["marcas"] = {
  0: { 3: "x" },
  1: { 6: "x" },
  2: { 1: "x" },
  4: { 4: "cheio" },
  5: { 2: "v" },
  9: { 5: "x" },
  26: { 6: "x" },
};
const ESPERADO: Array<number | null> = Array.from({ length: 27 }, () => null);
ESPERADO[0] = 3;
ESPERADO[1] = 6;
ESPERADO[2] = 1;
ESPERADO[4] = 4;
ESPERADO[5] = 2;
ESPERADO[9] = 5;
ESPERADO[26] = 6;

const niveis = (r: ReturnType<typeof lerFolha>) => (r.ok ? r.linhas.map((l) => l.nivel) : r.motivo);

describe("folha da turma: código", () => {
  it("a faixa guarda o código e a página e recusa leitura errada", () => {
    for (const [cod, pag] of [
      [1, 0],
      [0x4f2a, 3],
      [65535, 7],
    ]) {
      const bits = bitsDaFaixa(cod, pag);
      expect(bits).toHaveLength(FAIXA.n);
      expect(lerBitsDaFaixa(bits)).toEqual({ cod, pagina: pag });
      const errado = [...bits];
      errado[5] ^= 1;
      expect(lerBitsDaFaixa(errado)).toBeNull();
    }
    expect(lerBitsDaFaixa(Array(FAIXA.n).fill(0))).toBeNull();
    expect(lerBitsDaFaixa(Array(FAIXA.n).fill(1))).toBeNull();
  });

  it("código em texto vai e volta", () => {
    expect(codigoTexto(0x4f2a)).toBe("4F2A");
    expect(codigoDeTexto("4f2a")).toBe(0x4f2a);
    expect(codigoDeTexto("zz")).toBeNull();
    expect(codigoDeTexto("0")).toBeNull();
    expect(novoCodigo([7], () => 6 / 65535)).not.toBe(7);
  });

  it("divide a turma em páginas de 27 alunos", () => {
    const f: FolhaSondagem = {
      cod: 9,
      turma: "2º A",
      criada: "2026-11-21",
      alunos: Array.from({ length: 30 }, (_, i) => ({ id: "a" + i, nome: "Aluno " + i })),
    };
    expect(paginasDaFolha(f)).toBe(2);
    expect(alunosDaPagina(f, 0)).toHaveLength(27);
    expect(alunosDaPagina(f, 1).map((a) => a.id)).toEqual(["a27", "a28", "a29"]);
  });
});

describe("folha da turma: impressão", () => {
  it("monta uma página para cada 27 alunos, com os quadrinhos e o QR code", () => {
    const f: FolhaSondagem = {
      cod: 0x4f2a,
      turma: "2º ano <A>",
      criada: "2026-11-21",
      alunos: Array.from({ length: 30 }, (_, i) => ({ id: "a" + i, nome: "Aluno " + (i + 1) })),
    };
    const html = htmlFolha(f, "https://exemplo.test/alfabetizacao?folha=4F2A");
    const paginas = html.split('<div class="pg">').slice(1);
    expect(paginas).toHaveLength(2);
    expect(paginas[0].match(/class="cx"/g)).toHaveLength(27 * 6);
    expect(paginas[1].match(/class="cx"/g)).toHaveLength(3 * 6);
    expect(paginas[0]).toContain("Página 1 de 2");
    expect(paginas[1]).toContain("Aluno 28");
    expect(html).toContain("Folha 4F2A");
    expect(html).toContain("2º ano &lt;A&gt;"); // nome da turma não vira HTML
    expect(html.match(/<svg /g)).toHaveLength(2); // um QR code por página
    // cada página leva a sua própria faixa (a página muda os quadradinhos pretos)
    const pretos = (p: string) => (p.match(/class="pt"/g) || []).length;
    expect(pretos(paginas[0])).toBe(4 + bitsDaFaixa(0x4f2a, 0).filter(Boolean).length);
    expect(pretos(paginas[1])).toBe(4 + bitsDaFaixa(0x4f2a, 1).filter(Boolean).length);
  });
});

describe("folha da turma: marcação de cada linha", () => {
  it("uma marca clara", () => {
    expect(decidirLinha([0.01, 0.02, 0.3, 0.01, 0, 0.02])).toEqual({ nivel: 3, duvida: false });
  });
  it("linha em branco, mesmo com sombra igual em todos", () => {
    expect(decidirLinha([0.01, 0, 0.02, 0.01, 0, 0.01])).toEqual({ nivel: null, duvida: false });
    expect(decidirLinha([0.2, 0.22, 0.21, 0.2, 0.19, 0.2]).nivel).toBeNull();
  });
  it("duas marcas: fica a mais forte e pede para conferir", () => {
    expect(decidirLinha([0.01, 0.25, 0.02, 0.3, 0, 0.01])).toEqual({ nivel: 4, duvida: true });
  });
  it("marca fraca: sugere e pede para conferir", () => {
    expect(decidirLinha([0.0, 0.01, 0.0, 0.0, 0.055, 0.0])).toEqual({ nivel: 5, duvida: true });
  });
});

describe("folha da turma: leitura da foto", () => {
  const base = { cod: 0x4f2a, marcas: MARCAS };

  it("foto reta, de cima", () => {
    const img = fotografar({
      ...base,
      w: 900,
      h: 1250,
      cantosDaFolha: [
        [30, 25],
        [870, 25],
        [870, 1213],
        [30, 1213],
      ],
    });
    const r = lerFolha(img);
    expect(r.ok && r.cod).toBe(0x4f2a);
    expect(r.ok && r.pagina).toBe(0);
    expect(niveis(r)).toEqual(ESPERADO);
    expect(r.ok && r.linhas.filter((l) => l.duvida)).toEqual([]);
  });

  it("foto torta, de lado, com sombra e mesa escura", () => {
    const img = fotografar({
      ...base,
      w: 1100,
      h: 1400,
      mesa: 45,
      sombra: 0.5,
      cantosDaFolha: [
        [150, 120],
        [930, 70],
        [1040, 1290],
        [60, 1220],
      ],
    });
    expect(niveis(lerFolha(img))).toEqual(ESPERADO);
  });

  it("folha de cabeça para baixo", () => {
    const img = fotografar({
      ...base,
      w: 900,
      h: 1250,
      mesa: 200,
      cantosDaFolha: [
        [860, 1200],
        [40, 1210],
        [50, 40],
        [850, 30],
      ],
    });
    const r = lerFolha(img);
    expect(r.ok && r.cod).toBe(0x4f2a);
    expect(niveis(r)).toEqual(ESPERADO);
  });

  it("celular deitado (folha girada um quarto de volta)", () => {
    const img = fotografar({
      ...base,
      pagina: 1,
      w: 1300,
      h: 950,
      cantosDaFolha: [
        [1260, 40],
        [1250, 900],
        [40, 910],
        [50, 50],
      ],
    });
    const r = lerFolha(img);
    expect(r.ok && r.pagina).toBe(1);
    expect(niveis(r)).toEqual(ESPERADO);
  });

  it("folha pequena na foto, longe da câmera", () => {
    const img = fotografar({
      ...base,
      w: 1500,
      h: 1500,
      mesa: 120,
      cantosDaFolha: [
        [430, 300],
        [1060, 320],
        [1050, 1200],
        [420, 1190],
      ],
    });
    expect(niveis(lerFolha(img))).toEqual(ESPERADO);
  });

  it("foto fora de foco e torta", () => {
    const img = fotografar({
      ...base,
      w: 1000,
      h: 1350,
      borrao: 2,
      sombra: 0.7,
      cantosDaFolha: [
        [90, 80],
        [900, 50],
        [960, 1290],
        [40, 1250],
      ],
    });
    expect(niveis(lerFolha(img))).toEqual(ESPERADO);
  });

  it("foto pequena (pouca resolução)", () => {
    const img = fotografar({
      ...base,
      w: 620,
      h: 860,
      borrao: 1,
      cantosDaFolha: [
        [25, 20],
        [595, 28],
        [600, 840],
        [18, 835],
      ],
    });
    expect(niveis(lerFolha(img))).toEqual(ESPERADO);
  });

  it("lê só as linhas da turma e recusa folha que não é da conta", () => {
    const img = fotografar({
      ...base,
      w: 900,
      h: 1250,
      cantosDaFolha: [
        [30, 25],
        [870, 25],
        [870, 1213],
        [30, 1213],
      ],
    });
    const r = lerFolha(img, (cod) => (cod === 0x4f2a ? 10 : null));
    expect(r.ok && r.linhas).toHaveLength(10);
    expect(lerFolha(img, () => null)).toEqual({ ok: false, motivo: "sem_codigo" });
  });

  it("duas marcas na mesma linha pedem conferência", () => {
    const img = fotografar({
      cod: 77,
      marcas: { 3: { 2: "x", 5: "x" }, 7: { 4: "x" } },
      w: 900,
      h: 1250,
      cantosDaFolha: [
        [30, 25],
        [870, 25],
        [870, 1213],
        [30, 1213],
      ],
    });
    const r = lerFolha(img);
    expect(r.ok && r.linhas[3].duvida).toBe(true);
    expect(r.ok && r.linhas[7]).toEqual({ nivel: 4, duvida: false });
  });

  it("foto que não é da folha", () => {
    const cinza = new Uint8Array(600 * 800).fill(200);
    expect(lerFolha({ cinza, w: 600, h: 800 })).toEqual({ ok: false, motivo: "sem_cantos" });
  });
});
