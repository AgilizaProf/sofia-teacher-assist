import { describe, expect, it } from "vitest";
import catalogoJson from "./catalogo.json";
import {
  atividadesDoCatalogo,
  atividadesParaPlano,
  buscarNoCatalogo,
  cadernosLiberados,
  type Catalogo,
} from "./catalogo";

const cat = catalogoJson as unknown as Catalogo;

describe("catálogo dos cadernos", () => {
  it("tem os 142 PDFs da pasta Cadernos e o texto de todas as habilidades", () => {
    expect(cat.cadernos).toHaveLength(142);
    const codigos = new Set(cat.cadernos.flatMap((c) => c.fichas.flatMap((f) => f.h)));
    for (const c of codigos) expect(cat.bncc[c], c).toBeTruthy();
  });

  it("junta a mesma ficha de todos os cadernos do ano e disciplina", () => {
    const a = atividadesDoCatalogo(cat).find(
      (x) => x.componente === "Matemática" && x.ano === "3º ano" && x.n === 1,
    );
    expect(a?.titulo).toBe("Os números até 9 999");
    expect(a?.habilidades).toContain("EF03MA01");
    expect(a?.pdfs.map((p) => p.tipo)).toEqual([
      "atividades",
      "conceito",
      "fixacao",
      "pcd",
      "caderno_professor",
    ]);
    expect(a?.pdfs.find((p) => p.tipo === "atividades")?.pagina).toBe(5);
  });

  it("acha pelo código da BNCC", () => {
    const r = buscarNoCatalogo(cat, "EF03CI01");
    expect(r.atividades.length).toBeGreaterThan(0);
    expect(r.atividades.every((a) => a.habilidades.includes("EF03CI01"))).toBe(true);
    expect(r.atividades[0].titulo).toMatch(/som/i);
  });

  it("acha pelo assunto, sem acento e no plural", () => {
    const r = buscarNoCatalogo(cat, "fracoes");
    expect(r.atividades.some((a) => /fra[cç]/i.test(a.titulo))).toBe(true);
  });

  it("entende disciplina e ano e lista os cadernos inteiros", () => {
    const r = buscarNoCatalogo(cat, "matemática 4º ano");
    expect(r.entendido).toMatchObject({ ano: "4º ano", componente: "Matemática" });
    expect(r.cadernos.map((c) => c.arquivo)).toContain("MATEMATICA_4ANO_CADERNO_DE_FIXACAO.pdf");
    expect(r.atividades.every((a) => a.ano === "4º ano" && a.componente === "Matemática")).toBe(
      true,
    );
  });

  it("busca por tema da Educação Infantil", () => {
    const r = buscarNoCatalogo(cat, "carnaval", { etapa: "infantil" });
    expect(r.cadernos.map((c) => c.arquivo)).toContain("EDUCACAO_INFANTIL_TEMA_CARNAVAL.pdf");
  });

  it("sugere no planejamento só as fichas da habilidade e do ano", () => {
    const l = atividadesParaPlano(cat, {
      etapa: "fund1",
      ano: "2º ano EF",
      habilidades: ["EF02MA01"],
    });
    expect(l.length).toBeGreaterThan(0);
    expect(l.every((a) => a.ano === "2º ano" && a.habilidades.includes("EF02MA01"))).toBe(true);
  });

  it("libera para as professoras só em 13/03/2027", () => {
    expect(cadernosLiberados(new Date("2027-03-12T23:59:00-03:00"))).toBe(false);
    expect(cadernosLiberados(new Date("2027-03-13T00:00:00-03:00"))).toBe(true);
  });
});
