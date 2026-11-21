import { describe, it, expect } from "vitest";
import {
  CATEGORIAS,
  blocosDoAluno,
  errosPorCategoria,
  htmlAtividades,
  montarBloco,
  palavraCerta,
  partes,
} from "./erros";

describe("categorias de erro de escrita", () => {
  it("ids únicos e exercícios bem formados", () => {
    expect(new Set(CATEGORIAS.map((c) => c.id)).size).toBe(CATEGORIAS.length);
    for (const c of CATEGORIAS) {
      if (c.tipo !== "lacuna") continue;
      expect(c.itens.length).toBeGreaterThanOrEqual(10);
      for (const it of c.itens) {
        const x = partes(it);
        expect(it).toMatch(/\[.*\]/);
        expect(c.opcoes, `${c.id}: ${it}`).toContain(x.resp);
      }
    }
  });
  it("a outra opção nunca forma a mesma palavra", () => {
    for (const c of CATEGORIAS) {
      if (c.tipo !== "lacuna") continue;
      const b = montarBloco(c, [], "teste");
      for (const m of b.marcar) expect(m.certa).not.toBe(m.errada);
    }
  });
  it("monta a palavra certa", () => {
    expect(palavraCerta("ca[m]po")).toBe("campo");
    expect(palavraCerta("[]ontem")).toBe("ontem");
  });
});

describe("atividade de fixação por aluno", () => {
  const erros = [
    { escrita: "canpo", correta: "campo", cat: "m_pb" },
    { escrita: "bonba", correta: "bomba", cat: "m_pb" },
    { escrita: "caro", correta: "carro", cat: "r_rr" },
    { escrita: "xyz", correta: "algo", cat: "categoria_que_nao_existe" },
  ];
  it("agrupa pela categoria mais frequente e manda o desconhecido para 'outro'", () => {
    const g = errosPorCategoria(erros);
    expect(g[0].cat.id).toBe("m_pb");
    expect(g.map((x) => x.cat.id)).toContain("outro");
  });
  it("usa as palavras do texto do aluno e é igual a cada vez", () => {
    const a = { alunoNome: "Ana", erros, semente: "av1" };
    const b1 = blocosDoAluno(a);
    const b2 = blocosDoAluno(a);
    expect(b1).toEqual(b2);
    expect(b1[0].palavrasDoAluno).toEqual(["campo", "bomba"]);
    expect(b1[0].completar.length).toBe(8);
  });
  it("gera uma folha por aluno com erros", () => {
    const html = htmlAtividades([
      { alunoNome: "Ana <b>", erros, semente: "a" },
      { alunoNome: "Sem erros", erros: [], semente: "b" },
    ]);
    expect(html.match(/class="folha"/g)?.length).toBe(1);
    expect(html).toContain("Ana &lt;b&gt;");
    expect(html).toContain("M antes de P e B");
  });
});
