import { describe, expect, it } from "vitest";
import { PEI_SUGGESTIONS } from "@/components/inclusao/PEISuggestions";
import { REGRAS_CAMPOS } from "./camposModelo";
import { SUGESTOES_CID, condicoesDoAluno, sugestoesDoCid } from "./sugestoesPorCid";

describe("condicoesDoAluno", () => {
  it("lê CID-10 e CID-11", () => {
    expect(condicoesDoAluno("F84.0")).toEqual(["tea"]);
    expect(condicoesDoAluno("6A02")).toEqual(["tea"]);
    expect(condicoesDoAluno("CID F90.0")).toEqual(["tdah"]);
    expect(condicoesDoAluno("F71")).toEqual(["di"]);
    expect(condicoesDoAluno("F81.0")).toEqual(["aprendizagem"]);
    expect(condicoesDoAluno("Q90.9")).toEqual(["down"]);
    expect(condicoesDoAluno("H90.3")).toEqual(["auditiva"]);
    expect(condicoesDoAluno("H54.2")).toEqual(["visual"]);
    expect(condicoesDoAluno("G80.0")).toEqual(["fisica"]);
  });

  it("aceita vários CIDs (comorbidades), sem repetir", () => {
    expect(condicoesDoAluno("F84.0, F90.0; F84.5")).toEqual(["tea", "tdah"]);
  });

  it("usa o diagnóstico escrito quando não há código", () => {
    expect(condicoesDoAluno("", "TEA nível 1 de suporte")).toEqual(["tea"]);
    expect(condicoesDoAluno(null, "Síndrome de Down")).toEqual(["down"]);
    expect(condicoesDoAluno("", "Altas habilidades/superdotação")).toEqual(["ahsd"]);
    expect(condicoesDoAluno("", "Dislexia")).toEqual(["aprendizagem"]);
    expect(condicoesDoAluno("F84.0", "Autismo e TDAH")).toEqual(["tea", "tdah"]);
  });

  it("não inventa condição", () => {
    expect(condicoesDoAluno("", "")).toEqual([]);
    expect(condicoesDoAluno("não informado", "Em investigação")).toEqual([]);
    expect(condicoesDoAluno("J45", "Asma")).toEqual([]);
    // "di" só como palavra inteira
    expect(condicoesDoAluno("", "Dificuldade de aprendizagem")).toEqual([]);
  });
});

describe("sugestoesDoCid", () => {
  it("traz as frases do campo para cada condição do aluno", () => {
    const g = sugestoesDoCid("comoLidarCrises", ["tea", "tdah"]);
    expect(g.map((x) => x.condicao)).toEqual(["tea", "tdah"]);
    expect(g[0].frases.length).toBeGreaterThan(1);
    expect(sugestoesDoCid("percursoEscolar", ["tea"])).toEqual([]);
  });

  it("todo campo citado existe no PEI e é alcançado pelo modelo da rede", () => {
    const doModelo = new Set(REGRAS_CAMPOS.map((r) => r[1]));
    for (const [cond, campos] of Object.entries(SUGESTOES_CID)) {
      for (const [campo, frases] of Object.entries(campos)) {
        expect(PEI_SUGGESTIONS[campo], `${cond}.${campo} existe no PEI`).toBeTruthy();
        expect(doModelo.has(campo), `${cond}.${campo} tem regra no modelo`).toBe(true);
        expect(new Set(frases).size, `${cond}.${campo} sem frase repetida`).toBe(frases.length);
      }
    }
  });
});
