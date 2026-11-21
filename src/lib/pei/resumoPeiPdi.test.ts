import { describe, expect, it } from "vitest";
import { peiPdiPorAluno, resumoPeiPdi } from "./resumoPeiPdi";

describe("PEI/PDI no parecer", () => {
  const linha = {
    aluno_client_id: "u1",
    aluno_nome: "Ana Souza",
    bimestre: "1º bimestre",
    objetivos_longo: [{ objetivo: "Ler frases curtas" }],
    objetivos_curto: [{ objetivo: "Reconhecer o nome" }],
    estrategias: { comunicacao: ["Rotina visual"], materiais: [] },
    avaliacao: { como_avaliar: "Observação semanal" },
  };
  it("resume objetivos, estratégias e avaliação", () => {
    const t = resumoPeiPdi(linha);
    expect(t).toContain("Ler frases curtas");
    expect(t).toContain("Reconhecer o nome");
    expect(t).toContain("Rotina visual");
    expect(t).toContain("Observação semanal");
  });
  it("acha pelo id ou pelo nome, ficando com o mais recente", () => {
    const achar = peiPdiPorAluno([linha, { ...linha, bimestre: "antigo" }]);
    expect(achar("u1", "")?.bimestre).toBe("1º bimestre");
    expect(achar("outro", "ana souza")?.bimestre).toBe("1º bimestre");
    expect(achar("x", "Bia")).toBeUndefined();
  });
});
