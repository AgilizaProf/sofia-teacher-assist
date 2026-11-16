import { describe, it, expect } from "vitest";
import {
  CATALOGO_FOLHAS,
  codigosBncc,
  etapaDoAno,
  folhasDeAcordo,
  tiposDeAcordo,
  type Folha,
} from "./folhas";

const f = (p: Partial<Folha>): Folha => ({
  id: "x",
  tipo: "atividades",
  etapa: "fund1",
  ano: "2º",
  componente: "Matemática",
  habilidades: ["EF02MA05"],
  titulo: "t",
  pdf: "/x.pdf",
  ...p,
});

describe("etapaDoAno", () => {
  it("reconhece Educação Infantil", () => {
    for (const t of ["Educação Infantil", "Pré II", "Creche", "Pequenos (4 anos)", "Maternal II A"])
      expect(etapaDoAno(t)).toBe("infantil");
  });
  it("reconhece Fundamental 1", () => {
    for (const t of ["1º", "2º ano EF", "5º ano", "3o ano"]) expect(etapaDoAno(t)).toBe("fund1");
  });
  it("não sugere para Fundamental 2, Médio e EJA", () => {
    for (const t of ["6º ano EF", "9º", "1º ano EM", "2ª série", "EJA I", ""])
      expect(etapaDoAno(t)).toBeNull();
  });
});

describe("codigosBncc", () => {
  it("extrai códigos sem repetir", () => {
    expect(codigosBncc("ef02lp01, EF02LP01 e EI03EO01; nada")).toEqual(["EF02LP01", "EI03EO01"]);
  });
});

describe("folhasDeAcordo", () => {
  const cat = [
    f({ id: "a" }),
    f({ id: "b", ano: "3º" }),
    f({ id: "c", componente: "Ciências", habilidades: ["EF02CI01"] }),
    f({ id: "d", tipo: "pcd", habilidades: ["EF02MA06"] }),
    f({ id: "e", etapa: "infantil", ano: "Pré II", componente: "Corpo, gestos e movimentos" }),
  ];
  it("filtra por etapa, ano e componente", () => {
    const r = folhasDeAcordo(
      { etapa: "fund1", ano: "2º ano EF", componentes: ["matemática"] },
      cat,
    );
    expect(r.map((x) => x.id)).toEqual(["a", "d"]);
  });
  it("filtra pela habilidade quando informada", () => {
    const r = folhasDeAcordo(
      { etapa: "fund1", ano: "2º", componentes: ["Matemática"], habilidades: ["ef02ma06"] },
      cat,
    );
    expect(r.map((x) => x.id)).toEqual(["d"]);
    expect(tiposDeAcordo({ etapa: "fund1", ano: "2º", habilidades: ["EF02MA06"] }, cat)).toEqual([
      "pcd",
    ]);
  });
  it("não mostra nada fora de EI e Fundamental 1", () => {
    expect(folhasDeAcordo({ etapa: null, ano: "6º" }, cat)).toEqual([]);
  });
  it("catálogo começa vazio: nenhuma folha inventada", () => {
    expect(CATALOGO_FOLHAS).toEqual([]);
  });
});
