import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config para os testes E2E reais do M6 (Planejamento).
 *
 * Estratégia:
 *   - Reutiliza o dev server do sandbox (Vite em :8080) via `webServer.reuseExistingServer`.
 *     Não roda `npm run dev` aqui dentro: o sandbox já tem o servidor de pé.
 *   - Roda apenas em Chromium para manter o tempo curto no CI do sandbox.
 *   - Sem retries por padrão; um worker para não competir com o dev.
 */
const PORT = Number(process.env.E2E_PORT ?? 8080);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 800 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});