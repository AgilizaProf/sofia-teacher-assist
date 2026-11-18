import { describe, it, expect } from "vitest";
import * as app from "../sofia-constitution";
import * as servidor from "../../../supabase/functions/_shared/sofia-constitution";

describe("Constituição da Sofia: app e edge functions iguais (N10)", () => {
  it("mesma versão e mesmo texto", () => {
    expect(servidor.SOFIA_CONSTITUTION_VERSION).toBe(app.SOFIA_CONSTITUTION_VERSION);
    expect(servidor.SOFIA_CONSTITUTION).toBe(app.SOFIA_CONSTITUTION);
  });

  it("tem 14 princípios numerados", () => {
    const nums = [...app.SOFIA_CONSTITUTION.matchAll(/^(\d{1,2})\. PRINCÍPIO/gm)].map((m) =>
      Number(m[1]),
    );
    expect(nums).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
    expect(app.SOFIA_CONSTITUTION).toContain("Aplique os 14 princípios");
  });

  it("transparência: documentos formais com bloco, textos para a família sem fontes internas", () => {
    const c = app.SOFIA_CONSTITUTION;
    expect(c).not.toMatch(/toda saída cita/i);
    expect(c).toContain("NÃO levam o bloco e NÃO citam fontes internas");
    expect(c).toContain("No texto final para a família, escreve direto sobre a criança");
  });

  it("regra de LaTeX e de códigos BNCC chegam às edge functions", () => {
    const out = servidor.withConstitution("Gere o parecer.");
    expect(out).toContain("NUNCA use LaTeX");
    expect(out).toContain("(confira o código na BNCC)");
    expect(out).toContain("Constituição v1.3");
  });

  it("mapa do app cita Diário de bordo, Trilhas, Questões, Minha Biblioteca e Para confirmar", () => {
    const p = app.buildSofiaPrompt("teste");
    for (const t of [
      "Diário de bordo",
      "Trilhas semestrais",
      'QUESTÕES ("/questoes"',
      'MINHA BIBLIOTECA ("/biblioteca"',
      'PARA CONFIRMAR ("/confirmar"',
      "AINDA NÃO está ligado",
    ]) {
      expect(p).toContain(t);
    }
    expect(p).not.toContain("📌 SIMULADOS");
  });
});
