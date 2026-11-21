// Casos do N9: o sanitizador não pode mudar o sentido de contas e comparações.
// (Os mesmos casos rodam no bun em src/lib/sofia/sanitizeTexto.test.ts.)
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { sanitizarTextoSofia } from "./sanitize-texto.ts";

const CASOS: Array<[string, string]> = [
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
  ["**Avançou** — com alegria.", "Avançou, com alegria."],
];

for (const [entrada, saida] of CASOS) {
  Deno.test(`sanitizarTextoSofia: ${entrada}`, () => {
    assertEquals(sanitizarTextoSofia(entrada), saida);
  });
}
