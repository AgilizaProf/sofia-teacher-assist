import { test, expect, type ConsoleMessage } from "@playwright/test";
import { chromium } from "@playwright/test";

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

// Em alguns sandboxes o chromium do Playwright não consegue iniciar por
// falta de libs de sistema (glib/udev). Os testes que dependem do browser
// são marcados como skip nesse caso, mas o teste de SSR puro (via request)
// continua rodando — é o que valida a correção do hydration mismatch.
let browserAvailable = false;
test.beforeAll(async () => {
  try {
    const b = await chromium.launch();
    await b.close();
    browserAvailable = true;
  } catch {
    browserAvailable = false;
  }
});

test.describe("Planejamento — SSR + hydration", () => {
  test("SSR renderiza o skeleton (sem grade dependente do relógio)", async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}${URL_M1}`);
    expect(res.status()).toBe(200);
    const html = await res.text();

    // Para evitar mismatch, o SSR mostra apenas o skeleton — a grade real
    // só renderiza após useHydrated(). Garantimos que:
    //   1) o skeleton está presente,
    //   2) NENHUM marcador "hoje"/dia da semana vaza no HTML SSR.
    expect(html).toContain('data-testid="planejamento-skeleton"');
    expect(html).not.toMatch(/data-is-today="true"/);
    expect(html).not.toContain('class="pl-cd-pill"');
    expect(html).not.toMatch(/>SEG</);
  });

  test("nenhum warning de hydration aparece no console", async ({}, testInfo) => {
    test.skip(!browserAvailable, "chromium indisponível neste ambiente");
    const browser = await chromium.launch();
    const page = await browser.newPage({ baseURL: testInfo.project.use.baseURL });
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
    await browser.close();
    expect(offences, `Hydration warnings:\n${offences.join("\n")}`).toEqual([]);
  });

  test("dia marcado como 'hoje' bate com a data local do navegador", async ({}, testInfo) => {
    test.skip(!browserAvailable, "chromium indisponível neste ambiente");
    const browser = await chromium.launch();
    const page = await browser.newPage({ baseURL: testInfo.project.use.baseURL });
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
    await browser.close();
  });
});