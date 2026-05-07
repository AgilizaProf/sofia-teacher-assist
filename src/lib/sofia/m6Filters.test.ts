import { describe, it, expect } from "vitest";
import { sanitizeFilter, sanitizeM6Filters } from "./m6Filters";

describe("sanitizeFilter", () => {
  it("aceita strings comuns com acentos", () => {
    expect(sanitizeFilter("3º Ano A")).toBe("3º Ano A");
    expect(sanitizeFilter("João Pedro")).toBe("João Pedro");
    expect(sanitizeFilter("+ funcionou")).toBeUndefined(); // '+' não está na whitelist
  });

  it("trim e colapsa espaços", () => {
    expect(sanitizeFilter("  ana   beatriz  ")).toBe("ana beatriz");
  });

  it("descarta vazios e não-strings", () => {
    expect(sanitizeFilter("")).toBeUndefined();
    expect(sanitizeFilter("   ")).toBeUndefined();
    expect(sanitizeFilter(null)).toBeUndefined();
    expect(sanitizeFilter(undefined)).toBeUndefined();
    expect(sanitizeFilter(123)).toBeUndefined();
    expect(sanitizeFilter(["x"])).toBeUndefined();
    expect(sanitizeFilter({ x: 1 })).toBeUndefined();
  });

  it("bloqueia caracteres perigosos", () => {
    expect(sanitizeFilter("<script>")).toBeUndefined();
    expect(sanitizeFilter("a<b")).toBeUndefined();
    expect(sanitizeFilter("${x}")).toBeUndefined();
    expect(sanitizeFilter("a\\b")).toBeUndefined();
    expect(sanitizeFilter("a/b")).toBeUndefined();
    expect(sanitizeFilter("a|b")).toBeUndefined();
  });

  it("remove caracteres de controle", () => {
    expect(sanitizeFilter("ana\u0000beatriz")).toBe("anabeatriz");
    expect(sanitizeFilter("a\nb")).toBe("a b");
  });

  it("aplica tamanho máximo", () => {
    expect(sanitizeFilter("a".repeat(80))).toBe("a".repeat(80));
    expect(sanitizeFilter("a".repeat(81))).toBeUndefined();
  });
});

describe("sanitizeM6Filters", () => {
  it("sanitiza objeto inteiro", () => {
    expect(
      sanitizeM6Filters({ tag: "  reforço ", turma: "3º Ano A", aluno: "<x>" }),
    ).toEqual({ tag: "reforço", turma: "3º Ano A", aluno: undefined });
  });

  it("retorna vazio para entradas inválidas", () => {
    expect(sanitizeM6Filters(null)).toEqual({});
    expect(sanitizeM6Filters("texto")).toEqual({});
    expect(sanitizeM6Filters(undefined)).toEqual({});
  });
});