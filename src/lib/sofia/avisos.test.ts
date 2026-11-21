import { describe, expect, it } from "vitest";
import { calcularAvisos, lerDataRegistro, listaNomes, type AvisosEntrada } from "./avisos";

const HOJE = new Date(2026, 10, 21, 9, 0); // 21/11/2026, 9h

const vazio = (p: Partial<AvisosEntrada> = {}): AvisosEntrada => ({
  agenda: [],
  alunos: [],
  registros: {},
  peiInclusao: {},
  alunosComPeiPdi: [],
  leituras: [],
  ...p,
});

const antigo = "2026-09-01T12:00:00Z";

describe("avisos da Sofia no Início", () => {
  it("não avisa nada quando a professora não cadastrou nada", () => {
    expect(calcularAvisos(vazio(), HOJE)).toEqual([]);
  });

  it("lê as datas dos registros e lista nomes curtos", () => {
    expect(lerDataRegistro("05/11/2026 · 14:05")?.getDate()).toBe(5);
    expect(lerDataRegistro("2026-11-05")?.getMonth()).toBe(10);
    expect(lerDataRegistro("sem data")).toBeNull();
    expect(listaNomes(["Ana Souza"])).toBe("Ana");
    expect(listaNomes(["Ana Souza", "Bia Lima"])).toBe("Ana e Bia");
    expect(listaNomes(["Ana", "Bia", "Caio"])).toBe("Ana, Bia e Caio");
    expect(listaNomes(["Ana", "Bia", "Caio", "Davi", "Eva"])).toBe("Ana, Bia e mais 3");
  });

  it("mostra os compromissos de hoje, em ordem de horário", () => {
    const [a] = calcularAvisos(
      vazio({
        agenda: [
          { id: "2", date: "2026-11-21", title: "Conselho de classe", time: "14:00:00" },
          { id: "1", date: "2026-11-21", title: "Reunião de pais", time: "08:30" },
          { id: "3", date: "2026-11-22", title: "Amanhã" },
        ],
      }),
      HOJE,
    );
    expect(a.tipo).toBe("agenda");
    expect(a.texto).toBe("Hoje: Reunião de pais às 08:30 e Conselho de classe às 14:00.");
  });

  it("sem nada hoje, mostra os de amanhã", () => {
    const [a] = calcularAvisos(
      vazio({ agenda: [{ id: "3", date: "2026-11-22", title: "Feira de ciências" }] }),
      HOJE,
    );
    expect(a.texto).toBe("Amanhã: Feira de ciências.");
  });

  it("avisa aluno da Inclusão sem registro há 15 dias e leva direto à ficha", () => {
    const avisos = calcularAvisos(
      vazio({
        alunos: [
          { id: "a1", name: "Ana Souza", pcd: "tea", createdAt: antigo },
          { id: "a2", name: "Bia Lima", pcd: "tdah", createdAt: antigo },
          { id: "a3", name: "Caio", pcd: "nao", createdAt: antigo }, // Criança alfabetizada: fica de fora
          { id: "a4", name: "Davi", pcd: "tea", createdAt: "2026-11-18T10:00:00Z" }, // recém-cadastrado
        ],
        registros: {
          a1: [{ when: "01/11/2026 · 10:00" }],
          a2: [{ when: "01/10/2026 · 10:00" }, { when: "20/11/2026 · 10:00" }],
        },
        peiInclusao: { a1: { objetivos: "Ler palavras" }, a2: { x: "y" }, a4: { x: "y" } },
      }),
      HOJE,
    );
    expect(avisos).toHaveLength(1);
    expect(avisos[0].tipo).toBe("registro");
    expect(avisos[0].texto).toBe("Ana está há mais de 15 dias sem registro na Inclusão.");
    expect(avisos[0].search).toEqual({ view: "detail", aluno: "a1", tab: "reg" });
  });

  it("avisa quem não tem PEI em nenhum dos dois lugares", () => {
    const avisos = calcularAvisos(
      vazio({
        alunos: [
          { id: "a1", name: "Ana", pcd: "tea", createdAt: "2026-11-20" },
          { id: "a2", name: "Bia", pcd: "tea", createdAt: "2026-11-20" },
          { id: "a3", name: "Caio", pcd: "tea", createdAt: "2026-11-20" },
          { id: "a4", name: "Davi", pcd: "tea", createdAt: "2026-11-20" },
        ],
        peiInclusao: { a1: { objetivos: "" }, a2: { objetivos: "Ler" } },
        alunosComPeiPdi: ["a3"],
      }),
      HOJE,
    );
    expect(avisos.map((a) => a.tipo)).toEqual(["pei"]);
    expect(avisos[0].texto).toBe("Ana e Davi ainda não têm PEI. A Sofia monta a partir dos registros.");
    expect(avisos[0].to).toBe("/inclusao/pei");
  });

  it("avisa leitura atrasada só para quem já usa a Criança alfabetizada", () => {
    const alunos = [
      { id: "c1", name: "Caio Reis", pcd: "nao" },
      { id: "c2", name: "Duda", pcd: "nao" },
    ];
    const avisos = calcularAvisos(
      vazio({
        alunos,
        leituras: [
          { alunoId: "c1", alunoNome: "Caio Reis", data: "2026-09-10T10:00:00Z" },
          { alunoId: "c2", alunoNome: "Duda", data: "2026-09-10T10:00:00Z" },
          { alunoId: "c2", alunoNome: "Duda", data: "2026-11-15T10:00:00Z" },
          { alunoId: "x9", alunoNome: "Apagado", data: "2026-08-01T10:00:00Z" },
        ],
      }),
      HOJE,
    );
    expect(avisos).toHaveLength(1);
    expect(avisos[0].texto).toBe("Caio não tem avaliação de leitura há mais de 30 dias.");
  });

  it("ordena: agenda, registro, PEI e leitura", () => {
    const avisos = calcularAvisos(
      vazio({
        agenda: [{ id: "1", date: "2026-11-21", title: "Reunião" }],
        alunos: [
          { id: "a1", name: "Ana", pcd: "tea", createdAt: antigo },
          { id: "c1", name: "Caio", pcd: "nao" },
        ],
        leituras: [{ alunoId: "c1", alunoNome: "Caio", data: "2026-09-10" }],
      }),
      HOJE,
    );
    expect(avisos.map((a) => a.tipo)).toEqual(["agenda", "registro", "pei", "leitura"]);
  });
});
