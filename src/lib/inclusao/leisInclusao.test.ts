import { describe, expect, it } from "vitest";
import { fraseLegalInclusao, leisCurtoInclusao, leisInclusao } from "./leisInclusao";

describe("leis da Inclusão por diagnóstico", () => {
  it("TEA cita a LBI e a Lei 12.764, não a 14.254", () => {
    const l = leisInclusao({ cid: "F84.0", diag: "TEA" });
    expect(l).toEqual(["LBI (Lei 13.146/2015)", "Lei 12.764/2012 (TEA)"]);
    expect(leisCurtoInclusao({ cid: "F84.0" })).toBe("LBI · Lei 12.764/2012");
  });
  it("TDAH cita a Lei 14.254", () => {
    expect(leisInclusao({ cid: "F90.0" }).join()).toContain("14.254/2021");
  });
  it("sem diagnóstico, só a LBI", () => {
    expect(leisInclusao(null)).toEqual(["LBI (Lei 13.146/2015)"]);
    expect(fraseLegalInclusao(null)).toContain("LBI (Lei 13.146/2015) e na BNCC");
  });
});
