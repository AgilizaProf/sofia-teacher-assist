import { describe, expect, it } from "vitest";
import { candidatosPara, resolverAluno, type AlunoSala } from "./alunoDaMensagem";

const sala: AlunoSala[] = [
  { id: "1", nome: "Bento Xavier", turma: "1º ano A" },
  { id: "2", nome: "Bento da Cruz", turma: "1º ano A" },
  { id: "3", nome: "Heitor Lima", turma: "Pré 2" },
  { id: "4", nome: "Ana Júlia Souza", turma: "Pré 2" },
  { id: "5", nome: "Ana Souza", turma: "1º ano A" },
];

describe("candidatosPara", () => {
  it("acha os dois Bentos pelo primeiro nome", () => {
    expect(candidatosPara("Bento", sala).map((a) => a.id)).toEqual(["1", "2"]);
  });
  it("separa pelo sobrenome, ignorando 'da' e acentos", () => {
    expect(candidatosPara("bento cruz", sala).map((a) => a.id)).toEqual(["2"]);
    expect(candidatosPara("Ana Julia", sala).map((a) => a.id)).toEqual(["4"]);
  });
  it("prefere o nome igual ao nome completo", () => {
    expect(candidatosPara("Ana Souza", sala).map((a) => a.id)).toEqual(["5"]);
  });
  it("sem nome ou sem ninguém com esse nome, não sugere ninguém", () => {
    expect(candidatosPara("", sala)).toEqual([]);
    expect(candidatosPara("Laura", sala)).toEqual([]);
  });
});

describe("resolverAluno", () => {
  it("usa o id quando a mensagem já veio com ele", () => {
    expect(resolverAluno({ aluno_id: "2", aluno_nome: "Bento" }, sala).escolhido?.id).toBe("2");
  });
  it("escolhe sozinho quando só um aluno tem o nome", () => {
    const r = resolverAluno({ aluno_id: null, aluno_nome: "Heitor" }, sala);
    expect(r.escolhido?.id).toBe("3");
    expect(r.candidatos).toEqual([]);
  });
  it("pergunta quando há mais de um", () => {
    const r = resolverAluno({ aluno_id: null, aluno_nome: "Bento" }, sala);
    expect(r.escolhido).toBeNull();
    expect(r.candidatos.map((a) => a.nome)).toEqual(["Bento Xavier", "Bento da Cruz"]);
  });
  it("id que não existe mais cai na busca pelo nome", () => {
    expect(resolverAluno({ aluno_id: "99", aluno_nome: "Heitor" }, sala).escolhido?.id).toBe("3");
  });
});
