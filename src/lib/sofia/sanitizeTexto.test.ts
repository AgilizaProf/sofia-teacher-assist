import { describe, it, expect } from "vitest";
// O arquivo das edge functions não importa nada do Deno: roda no bun também.
import { sanitizarTextoSofia } from "../../../supabase/functions/_shared/sanitize-texto";

const limpar = (s: string) => sanitizarTextoSofia(s) as string;

describe("sanitizarTextoSofia (N9): preserva matemática e sentido", () => {
  it.each([
    ["reconhece que 7 > 5 e que 3 < 4", "reconhece que 7 > 5 e que 3 < 4"],
    ["Acertou 8 - 3 = 5", "Acertou 8 - 3 = 5"],
    ["Conta de 2 * 3 = 6", "Conta de 2 × 3 = 6"],
    ["frações como 1 / 2", "frações como 1 / 2"],
    ["menos de 50% (< 50%)", "menos de 50% (< 50%)"],
    [
      "Língua Portuguesa / Matemática (EF02LP01 / EF02MA01)",
      "Língua Portuguesa / Matemática (EF02LP01 / EF02MA01)",
    ],
    ["2. Leitura: avançou.", "2. Leitura: avançou."],
    [
      "Lei 9.394/1996, EF15LP01/02, 27/05/2026 e 3/4",
      "Lei 9.394/1996, EF15LP01/02, 27/05/2026 e 3/4",
    ],
    ["Turma de 5 – 6 anos", "Turma de 5 – 6 anos"],
    ["valores >= 10 e x <= 3", "valores >= 10 e x <= 3"],
  ])("%s", (entrada: string, saida: string) => {
    expect(limpar(entrada)).toBe(saida);
  });
});

describe("sanitizarTextoSofia: continua limpando marcação", () => {
  it("negrito, itálico, títulos, crases e colchetes", () => {
    expect(limpar("## Leitura\n**Avançou** muito na *leitura* de `palavras` [EF03MA05].")).toBe(
      "Leitura\nAvançou muito na leitura de palavras EF03MA05.",
    );
  });

  it("travessão e hífen de separação viram vírgula", () => {
    expect(limpar("Participou bem — e com alegria - nas rodas.")).toBe(
      "Participou bem, e com alegria, nas rodas.",
    );
  });

  it("bullets e listas numeradas de verdade viram parágrafos", () => {
    expect(limpar("- Lê frases\n- Escreve o nome")).toBe("Lê frases\nEscreve o nome");
    expect(limpar("1. Lê frases\n2. Escreve o nome")).toBe("Lê frases\nEscreve o nome");
  });

  it("tags HTML, pipes, chaves e > de citação saem", () => {
    expect(limpar("> Texto <b>forte</b> | {x}")).toBe("Texto forte x");
  });

  it("aspas tipográficas viram retas", () => {
    expect(limpar("disse “oi” e ‘tchau’")).toBe("disse \"oi\" e 'tchau'");
  });

  it("percorre objetos e listas", () => {
    expect(sanitizarTextoSofia({ a: ["**x**", 3], b: { c: "7 > 5" } })).toEqual({
      a: ["x", 3],
      b: { c: "7 > 5" },
    });
  });
});
