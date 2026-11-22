import { describe, it, expect } from "vitest";
import { semBlocoContexto } from "./textoVisivel";

describe("semBlocoContexto", () => {
  it("tira o bloco de contexto do fim", () => {
    expect(semBlocoContexto("Monte um plano\n\n[Contexto: turma 3º A, 25 alunos]")).toBe("Monte um plano");
  });
  it("mantém o texto sem contexto", () => {
    expect(semBlocoContexto("Oi, Sofia")).toBe("Oi, Sofia");
  });
});
