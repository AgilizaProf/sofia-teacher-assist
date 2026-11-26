import { describe, it, expect } from "vitest";
import { etapaAnoDaTurma } from "./etapaAno";

describe("etapaAnoDaTurma", () => {
  it("reconhece anos do Fundamental", () => {
    expect(etapaAnoDaTurma("3º ano")).toEqual({ etapa: "fund1", ano: "3º" });
    expect(etapaAnoDaTurma("6º B")).toEqual({ etapa: "fund2", ano: "6º" });
    expect(etapaAnoDaTurma("4 ano A")).toEqual({ etapa: "fund1", ano: "4º" });
  });
  it("reconhece a Educação Infantil", () => {
    expect(etapaAnoDaTurma("PRÉ 2")).toEqual({ etapa: "infantil", ano: "Pré II" });
    expect(etapaAnoDaTurma("Pré I")).toEqual({ etapa: "infantil", ano: "Pré I" });
    expect(etapaAnoDaTurma("Maternal")).toEqual({ etapa: "infantil", ano: "Creche" });
  });
  it("reconhece Médio e EJA", () => {
    expect(etapaAnoDaTurma("2ª série")).toEqual({ etapa: "medio", ano: "2ª série" });
    expect(etapaAnoDaTurma("EJA II")).toEqual({ etapa: "eja", ano: "EJA II" });
  });
  it("não inventa quando não dá para saber", () => {
    expect(etapaAnoDaTurma("511")).toBeNull();
    expect(etapaAnoDaTurma("Turma da tarde")).toBeNull();
  });
});
