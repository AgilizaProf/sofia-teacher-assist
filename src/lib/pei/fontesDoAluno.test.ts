import { describe, expect, it } from "vitest";
import { diarioDoAluno, montarFontesDoAluno } from "./fontesDoAluno";

describe("montarFontesDoAluno", () => {
  it("sem nada registrado, não manda nada", () => {
    expect(montarFontesDoAluno({})).toEqual({ texto: "", resumo: [] });
    expect(
      montarFontesDoAluno({
        anamnese: [{ l: "Eixo", obs: "", items: [{ d: "Lê palavras", s: "naoObservado" }] }],
        registros: [{ when: "01/02/2026", cat: "ped", body: "  " }],
        parecer: {},
        whatsapp: [],
      }),
    ).toEqual({ texto: "", resumo: [] });
  });

  it("junta anamnese, registros, relatório, diário e WhatsApp", () => {
    const r = montarFontesDoAluno({
      anamnese: [
        {
          l: "Desempenho Acadêmico",
          obs: "Gosta de letras móveis.",
          items: [
            { d: "Escrita do próprio nome", s: "consolidado" },
            { d: "Cópia de frases", s: "naoObservado" },
          ],
        },
      ],
      anamneseObsGeral: "Mora com a avó.",
      registros: [{ when: "10/11/2026 · 09:30", cat: "com", body: "Aguardou a vez no jogo." }],
      parecer: { periodoLabel: "3º Bimestre · 2026", avancos: ["Reconhece as vogais"] },
      diario: [{ date: "05/11/2026", title: "Roda", text: "Participou da roda." }],
      whatsapp: [
        { recebido_em: "2026-11-12T13:00:00Z", texto: "Heitor reconheceu todas as vogais." },
      ],
    });
    expect(r.resumo).toEqual([
      "anamnese",
      "1 registro",
      "relatório de inclusão",
      "1 anotação do diário",
      "1 mensagem do WhatsApp",
    ]);
    expect(r.texto).toContain("Escrita do próprio nome: consolidado");
    expect(r.texto).not.toContain("Cópia de frases");
    expect(r.texto).toContain("Observação geral: Mora com a avó.");
    expect(r.texto).toContain("- 10/11/2026 (comportamental): Aguardou a vez no jogo.");
    expect(r.texto).toContain("RELATÓRIO DE INCLUSÃO (3º Bimestre · 2026)");
    expect(r.texto).toContain("Heitor reconheceu todas as vogais.");
  });

  it("limita o tamanho de cada fonte", () => {
    const registros = Array.from({ length: 80 }, (_, i) => ({
      when: "01/01/2026",
      cat: "ped",
      body: `Registro ${i} ` + "x".repeat(900),
    }));
    const r = montarFontesDoAluno({ registros });
    expect(r.resumo).toEqual(["30 registros"]);
    expect(r.texto.length).toBeLessThan(5100);
  });
});

describe("diarioDoAluno", () => {
  const entradas = [
    { title: "Roda", text: "Ana participou", alunoIds: undefined },
    { title: "Jogo", text: "turma animada", alunoIds: ["s1"] },
    { title: "Banana no lanche", text: "", alunoIds: undefined },
    { title: "Outro", text: "Ana foi bem", alunoIds: ["s2"] },
  ];
  it("usa o id quando existe e o primeiro nome nas entradas antigas", () => {
    expect(diarioDoAluno(entradas, "s1", "Ana Souza").map((e) => e.title)).toEqual([
      "Roda",
      "Jogo",
    ]);
  });
  it("não casa pedaço de palavra", () => {
    expect(diarioDoAluno(entradas, "s9", "Ana").map((e) => e.title)).toEqual(["Roda"]);
  });
});
