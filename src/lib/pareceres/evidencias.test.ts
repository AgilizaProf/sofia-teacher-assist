import { describe, expect, it } from "vitest";
import { areaDaRubrica, lerResultados, provasDoAluno, somarProvas, statusPelaProva, textoDiario, textoProvas } from "./evidencias";

const dados = {
  resultados: [
    { aluno: "Ana Souza", turma: "5º ano A", titulo: "Simulado 1", acertos: 7, total: 10, hab: { EF05MA01: [3, 4], EF05LP02: [1, 3] } },
    { aluno: "Ana Souza", turma: "4º ano B", titulo: "Outra turma", acertos: 1, total: 10 },
    { aluno: "Sem nome 1", acertos: 2, total: 10 },
  ],
};

describe("evidências do parecer", () => {
  it("acha as provas do aluno na turma certa", () => {
    const r = provasDoAluno(lerResultados(dados), "ana souza", "5 ano A");
    expect(r.map((x) => x.titulo)).toEqual(["Simulado 1"]);
  });
  it("soma por matéria e sugere o status da rubrica", () => {
    const { porArea } = somarProvas(lerResultados(dados));
    expect(porArea.ma).toEqual({ a: 3, n: 4 });
    expect(statusPelaProva(porArea.ma)).toBe("co");
    expect(statusPelaProva(porArea.lp)).toBe("na");
    expect(statusPelaProva({ a: 1, n: 2 })).toBeNull();
    expect(areaDaRubrica("Língua Portuguesa")).toBe("lp");
    expect(areaDaRubrica("Humanas (História/Geografia)")).toBe("hu");
  });
  it("monta os textos de provas e diário", () => {
    expect(textoProvas(lerResultados(dados).slice(0, 1))).toContain("Simulado 1: 7 de 10 acertos");
    const d = textoDiario(
      [{ date: "18/11", text: "Ana ajudou os colegas na roda.", turma: "3º ano" }, { text: "Turma agitada.", turma: "5º ano A" }],
      "5º ano A",
      "Ana Souza",
    );
    expect(d).toContain("[cita o aluno]");
    expect(d).toContain("Turma agitada.");
  });
});
