import { test, expect, type ConsoleMessage } from "@playwright/test";

/**
 * E2E — SSR + hidratação da página /planejamento (M1).
 *
 * Garante:
 *  1. O HTML SSR renderiza a grade da semana (5 dias úteis) sem depender
 *     do relógio do cliente — checamos o markup bruto antes do JS rodar.
 *  2. Após carregar no navegador, NÃO aparece nenhum warning de hydration
 *     do React (texto "Hydration failed", "did not match", "Minified React
 *     error #418/#423/#425") no console.
 *  3. O dia marcado como "hoje" é consistente entre SSR e cliente:
 *     no SSR nenhum dia tem data-is-today="true" (evita mismatch UTC×local);
 *     após hidratar, no máximo 1 dia tem a marca, e — se houver — bate com
 *     a data local do navegador (YYYY-MM-DD).
 */

const URL_M1 = "/planejamento?m=m1";

const HYDRATION_PATTERNS = [
  /Hydration failed/i,
  /did not match/i,
  /Text content does not match/i,
  /Minified React error #(418|423|425|421|422)/i,
  /hydrated but some attributes/i,
];

test.describe("Planejamento — SSR + hydration", () => {
  test("HTML SSR contém a grade da semana sem depender do relógio do cliente", async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}${URL_M1}`);
    expect(res.status()).toBe(200);
    const html = await res.text();

    // Grade da semana renderizada no servidor: 5 colunas (SEG..SEX).
    for (const dn of ["SEG", "TER", "QUA", "QUI", "SEX"]) {
      expect(html, `dia ${dn} ausente do SSR`).toContain(`>${dn}<`);
    }

    // SSR nunca deve marcar "hoje" — isso só é decidido após hidratar
    // (caso contrário o servidor em UTC pode discordar do cliente local).
    expect(html).not.toMatch(/data-is-today="true"/);
    expect(html).not.toContain('class="pl-cd-pill"');
  });

  test("nenhum warning de hydration aparece no console", async ({ page }) => {
    const offences: string[] = [];
    const onMsg = (msg: ConsoleMessage) => {
      if (msg.type() !== "error" && msg.type() !== "warning") return;
      const text = msg.text();
      if (HYDRATION_PATTERNS.some((re) => re.test(text))) offences.push(text);
    };
    page.on("console", onMsg);
    page.on("pageerror", (err) => {
      if (HYDRATION_PATTERNS.some((re) => re.test(err.message))) {
        offences.push(err.message);
      }
    });

    await page.goto(URL_M1, { waitUntil: "networkidle" });
    // Aguarda a hidratação completar (efeitos rodam após mount).
    await expect(page.getByTestId("m1-day").first()).toBeVisible();
    await page.waitForTimeout(500);

    page.off("console", onMsg);
    expect(offences, `Hydration warnings:\n${offences.join("\n")}`).toEqual([]);
  });

  test("dia marcado como 'hoje' bate com a data local do navegador", async ({ page }) => {
    await page.goto(URL_M1);
    const days = page.getByTestId("m1-day");
    await expect(days.first()).toBeVisible();

    // Força a hidratação a concluir.
    await page.waitForFunction(() => {
      const all = Array.from(document.querySelectorAll('[data-testid="m1-day"]'));
      // Após hidratar, m1Week reroda e cada dia tem ISO real (>= 2024).
      return all.every((el) => /^\d{4}-\d{2}-\d{2}$/.test((el as HTMLElement).dataset.dayIso ?? ""));
    });

    const marked = page.locator('[data-testid="m1-day"][data-is-today="true"]');
    const markedCount = await marked.count();
    expect(markedCount).toBeLessThanOrEqual(1);

    if (markedCount === 1) {
      const iso = await marked.getAttribute("data-day-iso");
      const localISO = await page.evaluate(() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      });
      expect(iso).toBe(localISO);
    }
  });
});