import { describe, expect, it } from "vitest";
import { ehDeAlfabetizacao, obsDoAluno, obsParaSofia, type ObsWhatsapp } from "./whatsapp";

const obs = (p: Partial<ObsWhatsapp>): ObsWhatsapp => ({
  id: "1",
  data: "2026-11-20T10:00:00Z",
  texto: "Leu palavras simples sem ajuda.",
  alunoId: null,
  alunoNome: null,
  ...p,
});

describe("observações do WhatsApp para leitura e escrita", () => {
  it("reconhece o destino direto e o destino guardado no payload", () => {
    expect(ehDeAlfabetizacao({ destino_final: "alfabetizacao", payload: {} })).toBe(true);
    expect(
      ehDeAlfabetizacao({ destino_final: "registro", payload: { destino_extra: "alfabetizacao" } }),
    ).toBe(true);
    expect(ehDeAlfabetizacao({ destino_final: "registro", payload: {} })).toBe(false);
    expect(ehDeAlfabetizacao({ destino_final: null, payload: null })).toBe(false);
  });

  it("separa por aluno pelo id e, sem id, pelo nome sem acento", () => {
    const lista = [
      obs({ id: "a", alunoId: "x1", alunoNome: "Heitor" }),
      obs({ id: "b", alunoNome: "JOÃO Pedro" }),
      obs({ id: "c", alunoId: "x2", alunoNome: "João Pedro" }),
    ];
    expect(obsDoAluno(lista, "x1", "Outro nome").map((o) => o.id)).toEqual(["a"]);
    expect(obsDoAluno(lista, "x9", "João Pedro").map((o) => o.id)).toEqual(["b"]);
  });

  it("monta o texto da Sofia respeitando o limite", () => {
    const lista = [obs({ alunoNome: "Heitor" }), obs({ id: "2", alunoNome: "Lia" })];
    expect(obsParaSofia(lista)).toContain("- Heitor: Leu palavras simples sem ajuda.");
    expect(obsParaSofia(lista, 50).split("\n")).toHaveLength(1);
  });
});
