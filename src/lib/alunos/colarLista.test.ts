import { describe, expect, it } from "vitest";
import { lerListaColada } from "./colarLista";

describe("colar lista de alunos", () => {
  it("tira numeração, marcadores e linhas vazias", () => {
    const r = lerListaColada("1. Ana Souza\n02 - Bruno Lima\n\n• Carla\n3) Davi Rocha");
    expect(r.novos).toEqual(["Ana Souza", "Bruno Lima", "Carla", "Davi Rocha"]);
  });

  it("aceita colunas de planilha e nomes em maiúsculas", () => {
    const r = lerListaColada("1\tMARIA DA SILVA\t12/03/2017\n2\tJOÃO PEDRO");
    expect(r.novos).toEqual(["Maria da Silva", "João Pedro"]);
  });

  it("não repete quem já está na turma nem nomes iguais", () => {
    const r = lerListaColada("Ana Souza; ana souza; Bia", ["Ána Souza"]);
    expect(r.novos).toEqual(["Bia"]);
    expect(r.repetidos).toEqual(["Ana Souza"]);
  });
});

import { nomeProprio } from "./colarLista";
describe("nomeProprio", () => {
  it("arruma nomes todos em maiúsculas ou minúsculas", () => {
    expect(nomeProprio("ANA DA SILVA")).toBe("Ana da Silva");
    expect(nomeProprio("joão  dos santos")).toBe("João dos Santos");
  });
  it("respeita o que já está escrito certo", () => {
    expect(nomeProprio("Maria McDonald")).toBe("Maria McDonald");
  });
});
