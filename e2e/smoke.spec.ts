/**
 * Pruebas de extremo a extremo (Playwright).
 * © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 *
 * Requiere: npm install && npx playwright install chromium
 */
import { expect, test } from "@playwright/test";

const ROUTES = ["/", "/projects", "/scan", "/humanizer", "/forensic", "/suno", "/shield", "/coverizador", "/billing", "/profile", "/legal"];

test.describe("Rutas y consola", () => {
  for (const route of ROUTES) {
    test(`renderiza ${route} sin errores de consola`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      page.on("pageerror", (err) => errors.push(err.message));

      await page.goto(route, { waitUntil: "networkidle" });
      await expect(page.locator("h1")).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
});

test("muestra la titularidad en el aviso legal", async ({ page }) => {
  await page.goto("/legal", { waitUntil: "networkidle" });
  await expect(page.getByText("URBINA ASESORÍA E INVERSIONES S.A.C.").first()).toBeVisible();
});

test("el escáner analiza un archivo y produce un informe", async ({ page }) => {
  await page.goto("/scan", { waitUntil: "networkidle" });
  await page.setInputFiles("input[type=file]", {
    name: "demo.wav",
    mimeType: "audio/wav",
    buffer: Buffer.from(WAV_BYTES),
  });
  await page.getByRole("button", { name: /analizar track/i }).click();
  await expect(page.getByText("Informe de autenticidad")).toBeVisible({ timeout: 120_000 });
});

/** WAV PCM 16-bit mono de 2 s con un tono a 440 Hz. */
const WAV_BYTES = (() => {
  const sr = 8000;
  const samples = sr * 2;
  const buf = Buffer.alloc(44 + samples * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + samples * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) {
    buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / sr) * 12000), 44 + i * 2);
  }
  return buf;
})();
