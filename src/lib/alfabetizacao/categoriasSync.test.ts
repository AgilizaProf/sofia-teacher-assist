import { describe, it, expect } from "vitest";
import { CATEGORIAS } from "./erros";
import { CATEGORIAS_ERRO } from "../../../supabase/functions/avaliar-alfabetizacao/categorias";

// A Sofia classifica os erros pelos ids da função; o app monta a atividade
// pelos ids de erros.ts. Os dois precisam ser a mesma lista.
describe("categorias de erro: app e função da Sofia", () => {
  it("têm os mesmos ids, na mesma ordem", () => {
    expect(CATEGORIAS_ERRO.map(([id]) => id)).toEqual(CATEGORIAS.map((c) => c.id));
  });
});
