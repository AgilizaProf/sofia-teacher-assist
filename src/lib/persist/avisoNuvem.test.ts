import { describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { warning: vi.fn(), success: vi.fn() }) }));

describe("aviso de falha ao salvar na nuvem", () => {
  it("avisa uma vez, tenta de novo e avisa quando subiu", async () => {
    vi.useFakeTimers();
    const { toast } = await import("sonner");
    const { falhouSalvarNaNuvem, pendentesNaNuvem } = await import("./avisoNuvem");
    let tentativas = 0;
    const tentar = async () => ++tentativas >= 2;
    falhouSalvarNaNuvem("u:a", tentar);
    falhouSalvarNaNuvem("u:a", tentar);
    expect(toast.warning).toHaveBeenCalledTimes(1);
    expect(pendentesNaNuvem()).toBe(1);
    await vi.advanceTimersByTimeAsync(4_000); // 1ª nova tentativa falha
    expect(pendentesNaNuvem()).toBe(1);
    await vi.advanceTimersByTimeAsync(10_000); // 2ª dá certo
    expect(pendentesNaNuvem()).toBe(0);
    expect(toast.success).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
