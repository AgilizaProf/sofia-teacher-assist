import { describe, expect, it } from "vitest";
import { diaDaData, segundaDe } from "./semanas";

describe("plano por semana", () => {
  it("acha a segunda-feira de cada dia da semana", () => {
    // 2026-11-23 é uma segunda-feira
    expect(segundaDe(new Date(2026, 10, 23))).toBe("2026-11-23");
    expect(segundaDe(new Date(2026, 10, 27))).toBe("2026-11-23");
    // sábado e domingo ficam na semana que terminou
    expect(segundaDe(new Date(2026, 10, 28))).toBe("2026-11-23");
    expect(segundaDe(new Date(2026, 10, 29))).toBe("2026-11-23");
    // atravessa o mês
    expect(segundaDe(new Date(2026, 11, 2))).toBe("2026-11-30");
  });

  it("diz o dia útil da data e ignora o fim de semana", () => {
    expect(diaDaData(new Date(2026, 10, 23))).toBe("seg");
    expect(diaDaData(new Date(2026, 10, 27))).toBe("sex");
    expect(diaDaData(new Date(2026, 10, 28))).toBeNull();
  });
});
