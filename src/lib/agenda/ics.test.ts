import { describe, expect, it } from "vitest";
import { gerarIcs } from "./ics";

describe("arquivo de calendário", () => {
  const agora = new Date("2026-11-21T12:00:00Z");
  it("evento com hora tem lembrete 30 min antes", () => {
    const t = gerarIcs([{ id: "1", date: "2026-11-25", title: "Reunião, pais; 5º", time: "14:30" }], agora);
    expect(t).toContain("DTSTART:20261125T143000");
    expect(t).toContain("DTEND:20261125T153000");
    expect(t).toContain("SUMMARY:Reunião\\, pais\\; 5º");
    expect(t).toContain("TRIGGER:-PT30M");
  });
  it("evento de dia inteiro termina no dia seguinte, mesmo no fim do mês", () => {
    const t = gerarIcs([{ id: "2", date: "2026-11-30", title: "Prova" }], agora);
    expect(t).toContain("DTSTART;VALUE=DATE:20261130");
    expect(t).toContain("DTEND;VALUE=DATE:20261201");
    expect(t).toContain("TRIGGER:-PT6H");
  });
});
