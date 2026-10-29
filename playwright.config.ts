/**
 * Configuración de Playwright (E2E).
 * © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 *
 * Requiere: npm install && npx playwright install chromium
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 120_000,
  use: {
    baseURL: "http://127.0.0.1:4180",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run preview -- --port 4180 --strictPort",
    url: "http://127.0.0.1:4180",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
