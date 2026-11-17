import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { componentePadrao, itensBncc, nivelDoTexto } from "./bncc";
import { valoresDeIdentificacao, type Lacuna } from "./modeloRede";

describe("nivelDoTexto", () => {
  test("lê o ano do Fundamental", () => {
    expect(nivelDoTexto("3º ano A")).toEqual({ etapa: "ef", ano: 3 });
    expect(nivelDoTexto("", "2º B")).toEqual({ etapa: "ef", ano: 2 });
    expect(nivelDoTexto("9º ano")).toEqual({ etapa: "ef", ano: 9 });
  });
  test("lê a Educação Infantil pelo grupo da BNCC", () => {
    expect(nivelDoTexto("Berçário II (1-2 anos)")).toEqual({ etapa: "ei", grupo: 1 });
    expect(nivelDoTexto("Maternal II (3-4 anos)")).toEqual({ etapa: "ei", grupo: 2 });
    expect(nivelDoTexto("Pré II / Jardim II (5-6 anos)")).toEqual({ etapa: "ei", grupo: 3 });
  });
  test("lê o Ensino Médio", () => {
    expect(nivelDoTexto("2ª série")).toEqual({ etapa: "em" });
  });
  test("o primeiro texto preenchido vale (ano de referência antes da matrícula)", () => {
    expect(nivelDoTexto("1º ano", "4º ano")).toEqual({ etapa: "ef", ano: 1 });
    expect(nivelDoTexto(undefined, "Sem turma", "4º ano")).toEqual({ etapa: "ef", ano: 4 });
  });
});

describe("itensBncc", () => {
  const dados = JSON.parse(
    readFileSync(new URL("../../../public/bncc/bncc.json", import.meta.url), "utf8"),
  );
  test("habilidades do ano: primeiro as só daquele ano", () => {
    const it = itensBncc(dados, { etapa: "ef", ano: 1 }, "lp");
    expect(it[0].cod).toBe("EF01LP01");
    expect(it.some((i) => i.cod === "EF12LP01")).toBe(true);
    expect(it.some((i) => i.cod.startsWith("EF02"))).toBe(false);
  });
  test("objetivos da Educação Infantil por grupo", () => {
    const it = itensBncc(dados, { etapa: "ei", grupo: 3 }, "eo");
    expect(it.length).toBe(7);
    expect(it.every((i) => i.cod.startsWith("EI03EO"))).toBe(true);
  });
  test("campos sem BNCC não mostram a lista", () => {
    expect(componentePadrao("comoLidarCrises", "ef")).toBeNull();
    expect(componentePadrao("aval_obs:raciocinio_logico", "ei")).toBe("et");
  });
});

describe("valoresDeIdentificacao", () => {
  const l = (id: string, rotulo: string, tipo: Lacuna["tipo"] = "celula"): Lacuna => ({
    id,
    rotulo,
    tipo,
    secao: "",
  });
  test("preenche só os dados de identificação claros", () => {
    const v = valoresDeIdentificacao(
      [
        l("L1", "Nome do(a) estudante"),
        l("L2", "Data de nascimento"),
        l("L3", "Unidade escolar"),
        l("L4", "Ano/Turma"),
        l("L5", "CID"),
        l("L6", "Meta — Língua Portuguesa"),
        l("L7", "Responsável pela revisão"),
        l("L8", "Professor(a) regente"),
      ],
      {
        nome: "Ana",
        dataNascimento: "2017-03-15",
        escola: "E.M. X",
        serie: "2º ano",
        cid: "F84.0",
        professor: "Júlia",
      },
    );
    expect(v).toEqual({
      L1: "Ana",
      L2: "15/03/2017",
      L3: "E.M. X",
      L4: "2º ano",
      L5: "F84.0",
      L8: "Júlia",
    });
  });
});
