import { describe, it, expect } from "vitest";
import { comControle, SofiaCanceladaError, SofiaTempoEsgotadoError } from "./streamControl";

async function* lento(pausas: number[]) {
  for (const [i, ms] of pausas.entries()) {
    await new Promise((r) => setTimeout(r, ms));
    yield i;
  }
}

async function coletar(it: AsyncIterable<number>) {
  const out: number[] = [];
  for await (const v of it) out.push(v);
  return out;
}

describe("comControle (N7)", () => {
  it("passa os pedaços normalmente", async () => {
    const c = new AbortController();
    expect(
      await coletar(comControle(lento([1, 1, 1]), { signal: c.signal, tempoLimiteMs: 200 })),
    ).toEqual([0, 1, 2]);
  });

  it("tempo limite sem dados", async () => {
    const c = new AbortController();
    await expect(
      coletar(comControle(lento([1, 300]), { signal: c.signal, tempoLimiteMs: 50 })),
    ).rejects.toBeInstanceOf(SofiaTempoEsgotadoError);
  });

  it("Parar interrompe na hora", async () => {
    const c = new AbortController();
    setTimeout(() => c.abort(), 20);
    const t0 = Date.now();
    await expect(
      coletar(comControle(lento([1, 1000]), { signal: c.signal, tempoLimiteMs: 5000 })),
    ).rejects.toBeInstanceOf(SofiaCanceladaError);
    expect(Date.now() - t0).toBeLessThan(500);
  });
});
