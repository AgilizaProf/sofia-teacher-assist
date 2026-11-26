import { describe, it, expect } from "vitest";
import { rotuloDataRegistro } from "./rotuloData";

describe("rotuloDataRegistro", () => {
  const agora = new Date("2026-11-22T15:00:00Z"); // 12:00 em Brasília
  it("mostra a hora de Brasília, não a UTC", () => {
    const id = `e-${new Date("2026-11-22T13:01:00Z").getTime()}`;
    expect(rotuloDataRegistro({ id, date: "Hoje · 13:01" }, agora)).toBe("Hoje · 10:01");
  });
  it("um registro de ontem não diz Hoje", () => {
    const id = `e-${new Date("2026-11-21T13:01:00Z").getTime()}`;
    expect(rotuloDataRegistro({ id, date: "Hoje · 10:01" }, agora)).toBe("Ontem · 10:01");
  });
  it("registro mais antigo mostra dia e mês", () => {
    expect(rotuloDataRegistro({ criadoEm: "2026-11-10T13:01:00Z" }, agora)).toBe("10/11 · 10:01");
  });
  it("sem data conhecida, usa o texto gravado", () => {
    expect(rotuloDataRegistro({ id: "x1", date: "12/10 · 09:00" }, agora)).toBe("12/10 · 09:00");
  });
});
