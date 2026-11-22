import { describe, expect, it } from "vitest";
import { cartoesDoNivel } from "./cartoes";
import { folhasDeCartoes, htmlCartoes } from "./imprimir";

const um = (n: 1 | 2 | 3 | 4 | 5 | 6, i = 0) => cartoesDoNivel(n)[i];

describe("impressão dos cartões de leitura", () => {
  it("dois cartões marcados saem sempre na mesma folha, de qualquer tipo", () => {
    for (const a of [1, 2, 3, 4, 5, 6] as const)
      for (const b of [1, 2, 3, 4, 5, 6] as const) {
        const folhas = folhasDeCartoes([um(a), um(b, 1)]);
        expect(folhas, `níveis ${a} e ${b}`).toHaveLength(1);
        expect(folhas[0]).toHaveLength(2);
      }
  });

  it("cabem quatro pequenos, ou dois largos, ou dois pequenos e um largo por folha", () => {
    const pequenos = cartoesDoNivel(1).slice(0, 5);
    expect(folhasDeCartoes(pequenos).map((f) => f.length)).toEqual([4, 1]);
    const largos = cartoesDoNivel(5).slice(0, 3);
    expect(folhasDeCartoes(largos).map((f) => f.length)).toEqual([2, 1]);
    expect(folhasDeCartoes([um(1), um(2), um(5)]).map((f) => f.length)).toEqual([3]);
    // pequeno, largo, pequeno: o largo ocupa a segunda fileira e o último vai para outra folha
    expect(folhasDeCartoes([um(1), um(5), um(2)]).map((f) => f.length)).toEqual([2, 1]);
  });

  it("não perde nem repete cartão e mantém a ordem", () => {
    const todos = [um(6), um(1), um(4), um(2), um(2, 1), um(5), um(3), um(6, 1), um(1, 1)];
    expect(folhasDeCartoes(todos).flat()).toEqual(todos);
  });

  it("leva a marca do AgilizaProf e usa a folha inteira para um texto longo sozinho", () => {
    const sozinho = htmlCartoes([um(6)]);
    expect(sozinho).toContain('class="pg g1"');
    expect(sozinho).toContain("Agiliza<b>Prof</b>");
    const dois = htmlCartoes([um(6), um(6, 1)]);
    expect(dois.match(/class="pg /g)).toHaveLength(1);
    expect(dois.match(/class="ct w cp"/g)).toHaveLength(2);
  });
});
