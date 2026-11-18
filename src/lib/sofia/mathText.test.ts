import { describe, it, expect } from "vitest";
import { semLatex, semLatexProfundo } from "./mathText";

describe("semLatex", () => {
  it("troca frações em LaTeX por frações comuns (caso relatado)", () => {
    expect(semLatex("Mostre as notações $\\frac{1}{2}$ e $\\frac{1}{4}$.")).toBe(
      "Mostre as notações ½ e ¼.",
    );
  });

  it("não mexe em valores em reais", () => {
    const t = "Custa R$ 5,00 e o outro R$ 3,00. Total: R$5 ou R$ 10.";
    expect(semLatex(t)).toBe(t);
  });

  it("converte \\( \\), \\[ \\] e $$ $$", () => {
    expect(semLatex("Calcule \\(3 \\times 4\\) e \\[x^2 + y^{10} = \\sqrt{16}\\]")).toBe(
      "Calcule 3 × 4 e x² + y¹⁰ = √16",
    );
    expect(semLatex("$$\\frac{3}{7} + \\frac{1}{7} = \\frac{4}{7}$$")).toBe("3/7 + 1/7 = 4/7");
  });

  it("converte comandos soltos, fora de cifrões", () => {
    expect(semLatex("A metade é \\frac{1}{2} da pizza e 10 \\div 2 = 5.")).toBe(
      "A metade é ½ da pizza e 10 ÷ 2 = 5.",
    );
  });

  it("trata texto, unidades, graus e vírgula decimal", () => {
    expect(semLatex("Temperatura de $25^\\circ$C e $\\text{área} = 12\\,\\text{cm}^2$")).toBe(
      "Temperatura de 25°C e área = 12 cm²",
    );
    expect(semLatex("$2{,}5 \\leq x$")).toBe("2,5 ≤ x");
  });

  it("frações compostas ganham parênteses", () => {
    expect(semLatex("$\\dfrac{a+b}{2}$")).toBe("(a+b)/2");
  });

  it("preserva código e links", () => {
    const t = "Use `$\\frac{1}{2}$` e veja https://x.com/a_b?c=$d";
    expect(semLatex(t)).toBe(t);
  });

  it("não altera texto sem fórmulas", () => {
    const t = "Gastou $12 com $3 de troco. Ana_1 e {chaves} ficam.";
    expect(semLatex(t)).toBe(t);
  });

  it("limpa todas as strings de uma resposta estruturada", () => {
    expect(
      semLatexProfundo({ titulo: "Frações", passos: ["Pinte $\\frac{3}{4}$", 2], ok: true }),
    ).toEqual({ titulo: "Frações", passos: ["Pinte ¾", 2], ok: true });
  });
});
