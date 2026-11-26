import { describe, expect, it } from "vitest";
import {
  conferirHabilidades,
  ehEducacaoInfantil,
  habilidadesDoAno,
  textoOficial,
} from "../../../supabase/functions/_shared/bnccOficial";

describe("conferência das habilidades da BNCC", () => {
  it("troca o texto pelo oficial e mantém código do ano certo", () => {
    const r = conferirHabilidades([{ codigo: "ef03ci05", descricao: "texto qualquer" }], "3º ano EF", ["Ciências"]);
    expect(r.habilidades).toEqual([{ codigo: "EF03CI05", descricao: textoOficial("EF03CI05") }]);
    expect(r.removidas).toEqual([]);
  });

  it("tira código inventado e código de outro ano ou componente", () => {
    const r = conferirHabilidades(
      [{ codigo: "HAB-MAT-05-01" }, { codigo: "EF04CI01" }, { codigo: "EF03MA01" }, { codigo: "EF03CI99" }],
      "3º ano EF",
      ["Ciências"],
    );
    expect(r.habilidades).toEqual([]);
    expect(r.removidas.map((x) => x.codigo)).toEqual(["HAB-MAT-05-01", "EF04CI01", "EF03MA01", "EF03CI99"]);
  });

  it("aceita habilidade de vários anos (EF15LP) dentro do intervalo", () => {
    const r = conferirHabilidades([{ codigo: "EF15LP01" }], "3º ano EF", ["Língua Portuguesa"]);
    expect(r.habilidades).toHaveLength(1);
  });

  it("com currículo da rede, código próprio da lista fica com o texto da rede", () => {
    const rede = [{ codigo: "MAR-CI-03-04", descricao: "Texto da rede" }];
    const r = conferirHabilidades([{ codigo: "MAR-CI-03-04" }, { codigo: "HAB-X" }], "3º ano EF", ["Ciências"], rede);
    expect(r.habilidades).toEqual([{ codigo: "MAR-CI-03-04", descricao: "Texto da rede" }]);
    expect(r.removidas.map((x) => x.codigo)).toEqual(["HAB-X"]);
  });

  it("Educação Infantil confere grupo etário e campo", () => {
    expect(ehEducacaoInfantil("PRÉ 2")).toBe(true);
    expect(ehEducacaoInfantil("3º ano EF")).toBe(false);
    const r = conferirHabilidades(
      [{ codigo: "EI03EO01" }, { codigo: "EI02EO01" }, { codigo: "EF03CI05" }],
      "Pré-escola (4 e 5 anos)",
      ["O eu, o outro e o nós"],
    );
    expect(r.habilidades.map((h) => h.codigo)).toEqual(["EI03EO01"]);
  });

  it("lista as habilidades do ano para o prompt", () => {
    const l = habilidadesDoAno("3º ano EF", ["Ciências"]);
    expect(l.map((h) => h.codigo)).toContain("EF03CI05");
    expect(l.every((h) => h.codigo.startsWith("EF03CI") || /^EF\d{2}CI/.test(h.codigo))).toBe(true);
  });
});

describe("etapas sem conferência", () => {
  it("Ensino Médio volta como veio", () => {
    const r = conferirHabilidades([{ codigo: "EM13LP01", descricao: "x" }], "1ª série — Ensino Médio", ["Língua Portuguesa"]);
    expect(r.habilidades).toEqual([{ codigo: "EM13LP01", descricao: "x" }]);
  });
});
