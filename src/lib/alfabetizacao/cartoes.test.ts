import { describe, it, expect } from "vitest";
import { QTD_POR_NIVEL, cartoesDoNivel, todosOsCartoes } from "./cartoes";
import { alinhar, alvosDoCartao, normalizar, resumir, sugerirNivel } from "./analise";

describe("cartões de leitura", () => {
  const todos = todosOsCartoes();
  it("são 1000, com ids únicos", () => {
    expect(todos.length).toBe(1000);
    expect(new Set(todos.map((c) => c.id)).size).toBe(1000);
  });
  it("cada nível tem a quantidade combinada", () => {
    for (const n of [1, 2, 3, 4, 5, 6] as const)
      expect(cartoesDoNivel(n).length).toBe(QTD_POR_NIVEL[n]);
  });
  it("nenhum cartão repete o conteúdo de outro", () => {
    const chaves = todos.map((c) => c.tipo + "|" + (c.texto || c.itens.join(" ")));
    expect(new Set(chaves).size).toBe(1000);
  });
  it("todo cartão tem o que ler e o total bate", () => {
    for (const c of todos) {
      const alvos = alvosDoCartao(c);
      expect(alvos.length).toBeGreaterThan(4);
      expect(c.total).toBe(alvos.length);
      for (const a of alvos) expect(normalizar(a).length).toBeGreaterThan(0);
    }
  });
  it("textos têm o tamanho de cada nível", () => {
    for (const c of cartoesDoNivel(5)) expect(c.total).toBeGreaterThanOrEqual(30);
    for (const c of cartoesDoNivel(5)) expect(c.total).toBeLessThanOrEqual(52);
    for (const c of cartoesDoNivel(6)) expect(c.total).toBeGreaterThanOrEqual(80);
    for (const c of cartoesDoNivel(6)) expect(c.total).toBeLessThanOrEqual(112);
  });
  it("monta sempre os mesmos cartões", () => {
    expect(cartoesDoNivel(1)[0].itens.slice(0, 5)).toEqual(["a", "e", "i", "o", "u"]);
    expect(cartoesDoNivel(3)[0].foco).toBe("LH");
  });
});

describe("comparação da leitura com o cartão", () => {
  const alvos = "O gato subiu no muro alto da casa".split(" ");
  it("marca certo, troca, pulo e onde parou", () => {
    const r = alinhar(alvos, "o gato subi no alto".split(" "));
    expect(r.map((x) => x.marca)).toEqual(["ok", "ok", "troca", "ok", "pulou", "ok", "nao", "nao"]);
    expect(r[2].dito).toBe("subi");
  });
  it("ignora acento, maiúscula, pontuação e palavra repetida", () => {
    const r = alinhar(["Vovó", "fez", "bolo."], ["vovo", "vovo", "fez", "é", "bolo"]);
    expect(r.every((x) => x.marca === "ok")).toBe(true);
  });
  it("sem fala, nada foi lido", () => {
    expect(alinhar(alvos, []).every((x) => x.marca === "nao")).toBe(true);
  });
  it("conta palavras certas por minuto", () => {
    const marcas = alinhar(alvos, "o gato subiu no muro alto da casa".split(" ")).map(
      (x) => x.marca,
    );
    const r = resumir(marcas, 30);
    expect(r).toMatchObject({ total: 8, lidas: 8, corretas: 8, precisao: 1, pcpm: 16 });
  });
});

describe("nível sugerido", () => {
  const res = (total: number, lidas: number, corretas: number, pcpm: number) => ({
    total,
    lidas,
    corretas,
    precisao: lidas ? corretas / lidas : 0,
    pcpm,
  });
  it("sílabas", () => {
    expect(sugerirNivel("silabas", res(12, 3, 2, 2), 60).nivel).toBe(1);
    expect(sugerirNivel("silabas", res(12, 12, 10, 10), 60).nivel).toBe(2);
  });
  it("palavras", () => {
    expect(sugerirNivel("palavras", res(8, 8, 0, 0), 60).nivel).toBe(1);
    expect(sugerirNivel("palavras", res(8, 4, 3, 3), 60).nivel).toBe(2);
    expect(sugerirNivel("palavras", res(8, 8, 7, 7), 60).nivel).toBe(3);
  });
  it("frases", () => {
    expect(sugerirNivel("frases", res(18, 10, 9, 9), 60).nivel).toBe(3);
    expect(sugerirNivel("frases", res(18, 18, 16, 16), 60).nivel).toBe(4);
  });
  it("texto: fluente só com ritmo e acerto", () => {
    expect(sugerirNivel("texto", res(90, 40, 30, 30), 60).nivel).toBe(4);
    expect(sugerirNivel("texto", res(90, 50, 46, 46), 60).nivel).toBe(5);
    expect(sugerirNivel("texto", res(90, 70, 68, 68), 60).nivel).toBe(6);
    expect(sugerirNivel("texto", res(90, 70, 68, 68), 80).nivel).toBe(5);
  });
});
