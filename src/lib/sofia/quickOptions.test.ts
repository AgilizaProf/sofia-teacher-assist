import { describe, it, expect } from "vitest";
import { parseQuickOptions, isFreeTextOption } from "./quickOptions";

describe("parseQuickOptions", () => {
  it("formato padrão com hífen", () => {
    const r = parseQuickOptions(
      "Qual etapa?\n\n[OPÇÕES]\n- Educação Infantil\n- Ensino Fundamental\n- Outro (digitar)\n[/OPÇÕES]",
    );
    expect(r.clean).toBe("Qual etapa?");
    expect(r.options).toEqual(["Educação Infantil", "Ensino Fundamental", "Outro (digitar)"]);
  });

  it("aceita opções numeradas 1. e 1)", () => {
    expect(
      parseQuickOptions("Qual etapa?\n[OPÇÕES]\n1. Infantil\n2. Fundamental\n[/OPÇÕES]").options,
    ).toEqual(["Infantil", "Fundamental"]);
    expect(
      parseQuickOptions("Qual etapa?\n[OPÇÕES]\n1) Infantil\n2) Fundamental\n[/OPÇÕES]").options,
    ).toEqual(["Infantil", "Fundamental"]);
  });

  it("tags e opções em negrito não deixam ** nem botões '*'", () => {
    const r = parseQuickOptions(
      "Qual etapa?\n**[OPÇÕES]**\n- **Infantil**\n- Fundamental\n**[/OPÇÕES]**",
    );
    expect(r.options).toEqual(["Infantil", "Fundamental"]);
    expect(r.clean).toBe("Qual etapa?");
  });

  it("sem tag de fechamento: resposta completa extrai até o fim", () => {
    const r = parseQuickOptions("Qual etapa?\n[OPÇÕES]\n- Infantil\n- Fundamental", true);
    expect(r.options).toEqual(["Infantil", "Fundamental"]);
    expect(r.clean).toBe("Qual etapa?");
  });

  it("durante o streaming o bloco aberto some, sem botões", () => {
    const r = parseQuickOptions("Qual etapa?\n[OPÇÕES]\n- Infan", false);
    expect(r.options).toEqual([]);
    expect(r.clean).toBe("Qual etapa?");
  });

  it("dentro de crase tripla não sobra bloco de código vazio", () => {
    const r = parseQuickOptions(
      "Qual etapa?\n```\n[OPÇÕES]\n- Infantil\n- Fundamental\n[/OPÇÕES]\n```",
    );
    expect(r.options).toEqual(["Infantil", "Fundamental"]);
    expect(r.clean).toBe("Qual etapa?");
  });

  it("opções repetidas viram uma só", () => {
    expect(parseQuickOptions("?\n[OPÇÕES]\n- Sim\n- Sim\n- Não\n[/OPÇÕES]").options).toEqual([
      "Sim",
      "Não",
    ]);
  });

  it("aceita OPCOES sem acento e linhas sem marcador", () => {
    expect(parseQuickOptions("?\n[OPCOES]\nSim\nNão\n[/OPCOES]").options).toEqual(["Sim", "Não"]);
  });

  it("mantém semLatex no texto visível", () => {
    expect(parseQuickOptions("Metade é $\\frac{1}{2}$.").clean).toBe("Metade é ½.");
  });

  it("texto sem bloco fica igual", () => {
    expect(parseQuickOptions("Olá!\n- item")).toEqual({ clean: "Olá!\n- item", options: [] });
  });

  it("isFreeTextOption", () => {
    expect(isFreeTextOption("Outro (digitar)")).toBe(true);
    expect(isFreeTextOption("Infantil")).toBe(false);
  });
});
