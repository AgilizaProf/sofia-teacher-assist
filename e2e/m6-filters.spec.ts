import { test, expect } from "@playwright/test";

/**
 * E2E reais — filtros do M6 (Planejamento).
 *
 * Garantem que estados inválidos vindos da URL ou de localStorage não
 * alteram a lista filtrada (defesa contra inconsistências/ injeção).
 *
 * Fonte de verdade do baseline: a contagem de entradas seed (M6_INITIAL)
 * no Planejamento. Em vez de hard-codar, lemos a contagem da própria UI
 * navegando primeiro sem filtros.
 */

const M6 = "/planejamento?m=m6";

async function gotoFresh(page: import("@playwright/test").Page, url: string) {
  // Garante storage limpo antes de cada navegação para evitar contaminação
  // entre testes (filtros persistidos em plan_m6_filters).
  await page.goto(url);
  await page.evaluate(() => {
    try { localStorage.removeItem("plan_m6_filters"); } catch {}
  });
  await page.goto(url);
}

test.describe("M6 — filtros (URL/localStorage inválidos)", () => {
  test("URL sem filtros mostra todas as entradas seed", async ({ page }) => {
    await gotoFresh(page, M6);
    const entries = page.getByTestId("m6-entry");
    await expect(entries.first()).toBeVisible();
    const total = await entries.count();
    expect(total).toBeGreaterThanOrEqual(5);
    // Banner de filtro NÃO deve aparecer.
    await expect(page.getByTestId("m6-filter-count")).toHaveCount(0);
  });

  test("URL inválida (XSS/regex/oversize) é descartada — lista igual à sem filtro", async ({ page }) => {
    await gotoFresh(page, M6);
    const baseline = await page.getByTestId("m6-entry").count();

    const badURLs = [
      `${M6}&tag=${encodeURIComponent("<script>alert(1)</script>")}`,
      `${M6}&turma=${encodeURIComponent(".*|5A")}`,
      `${M6}&aluno=${encodeURIComponent("../../etc/passwd")}`,
      `${M6}&tag=${encodeURIComponent("a".repeat(120))}`,
      `${M6}&turma=${encodeURIComponent("${x}")}`,
    ];

    for (const url of badURLs) {
      await page.goto(url);
      await expect(page.getByTestId("m6-entry").first()).toBeVisible();
      // Banner não deve aparecer (todos os campos foram descartados).
      await expect(page.getByTestId("m6-filter-count")).toHaveCount(0);
      const count = await page.getByTestId("m6-entry").count();
      expect(count).toBe(baseline);
    }
  });

  test("URL parcialmente inválida aplica só o campo válido", async ({ page }) => {
    await gotoFresh(page, M6);
    // turma válida ("Turma" aparece em várias seeds) + aluno XSS descartado.
    await page.goto(`${M6}&turma=Turma&aluno=${encodeURIComponent("<script>")}`);
    await expect(page.getByTestId("m6-filter-turma")).toBeVisible();
    await expect(page.getByTestId("m6-filter-aluno")).toHaveCount(0);
    await expect(page.getByTestId("m6-filter-count")).toBeVisible();
  });

  test("localStorage corrompido NÃO restaura filtros — lista intacta", async ({ page }) => {
    await gotoFresh(page, M6);
    const baseline = await page.getByTestId("m6-entry").count();

    const corrupt = [
      JSON.stringify({ tag: "<script>alert(1)</script>" }),
      JSON.stringify({ turma: "${x}", aluno: 123 }),
      JSON.stringify({ tag: "a".repeat(200) }),
      JSON.stringify(["not", "an", "object"]),
      "not-even-json",
    ];

    for (const payload of corrupt) {
      await page.evaluate((p) => {
        try { localStorage.setItem("plan_m6_filters", p); } catch {}
      }, payload);
      await page.goto(M6);
      await expect(page.getByTestId("m6-entry").first()).toBeVisible();
      await expect(page.getByTestId("m6-filter-count")).toHaveCount(0);
      expect(await page.getByTestId("m6-entry").count()).toBe(baseline);
    }
  });

  test("localStorage com filtro válido é restaurado ao voltar ao M6 sem params", async ({ browser }) => {
    // Usa um contexto fresco e semeia localStorage ANTES do primeiro load,
    // para que o ref m6FilterRestored ainda esteja virgem na montagem.
    const context = await browser.newContext();
    await context.addInitScript(() => {
      try {
        localStorage.setItem("plan_m6_filters", JSON.stringify({ turma: "Turma" }));
      } catch {}
    });
    const page = await context.newPage();
    await page.goto(M6);
    await expect(page.getByTestId("m6-filter-turma")).toBeVisible();
    await expect.poll(() => page.url()).toMatch(/turma=Turma/);
    await context.close();
  });
});