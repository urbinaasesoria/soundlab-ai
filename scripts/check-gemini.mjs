/**
 * ============================================================================
 *  VERIFICADOR DE CONEXIÓN CON LA API DE GEMINI
 *  © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 * ============================================================================
 *  Comprueba, en este orden y sin revelar la clave en ningún momento:
 *
 *    1. Que exista una clave y tenga formato plausible.
 *    2. Que la API acepte la clave (ListModels).
 *    3. Que el modelo configurado esté disponible y soporte generateContent.
 *    4. Que una generación real con esquema JSON devuelva la forma esperada.
 *
 *  Uso:  node scripts/check-gemini.mjs
 *        node --env-file=.env.local scripts/check-gemini.mjs
 *
 *  Códigos de salida: 0 todo correcto · 1 sin clave · 2 clave rechazada ·
 *                     3 modelo no disponible · 4 generación fallida
 * ============================================================================
 */
import { existsSync, readFileSync } from "node:fs";

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const ENV_FILES = [".env.local", ".env"];

/* ---------------------------- carga de entorno -------------------------- */

function parseEnvFiles() {
  const values = {};
  for (const file of ENV_FILES) {
    if (!existsSync(file)) continue;
    for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!match) continue;
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (value) values[match[1]] = value; // el último valor válido gana
    }
  }
  return values;
}

const fileEnv = parseEnvFiles();
const env = { ...fileEnv };
for (const [name, value] of Object.entries(process.env)) {
  if (value) env[name] = value;
}

const key = env.GEMINI_API_KEY || env.GOOGLE_API_KEY || "";
const configuredModel = (env.GEMINI_MODEL || "gemini-2.5-flash").replace(/^models\//, "");

const redact = (value) =>
  value.length <= 10 ? "«oculta»" : `${value.slice(0, 5)}…${value.slice(-4)} (len ${value.length})`;

const ok = (msg) => console.log(`  ✅ ${msg}`);
const bad = (msg) => console.log(`  ❌ ${msg}`);
const info = (msg) => console.log(`  ·  ${msg}`);

console.log("\n╭─ VERIFICACIÓN DE LA API DE GEMINI ─────────────────────────────────");
console.log("│  SoundLab AI · URBINA ASESORÍA E INVERSIONES S.A.C.");
console.log("╰───────────────────────────────────────────────────────────────────\n");

/* ------------------------- 1. presencia y formato ----------------------- */

console.log("1) Clave");
if (!key) {
  bad("No hay GEMINI_API_KEY. Crea .env.local a partir de .env.example y añádela.");
  process.exit(1);
}
const formatOk = /^(AIza[A-Za-z0-9_-]{20,}|AQ\.[A-Za-z0-9._-]{20,})$/.test(key);
console.log(`   clave: ${redact(key)}`);
if (formatOk) ok("formato plausible (AIza… / AQ.…)");
else info("el formato no coincide con los prefijos conocidos; se probará igualmente");
if (env.GEMINI_MODEL) info(`modelo configurado: ${configuredModel}`);
else info(`sin GEMINI_MODEL en el entorno: se usará ${configuredModel}`);

/* ---------------------------- 2. listar modelos ------------------------- */

console.log("\n2) Autenticación (ListModels)");
let models = [];
try {
  const started = Date.now();
  const response = await fetch(`${BASE}/models?pageSize=200`, {
    headers: { "x-goog-api-key": key },
    signal: AbortSignal.timeout(20_000),
  });
  const elapsed = Date.now() - started;
  const body = await response.json().catch(() => ({}));

  if (response.status === 400 || response.status === 401 || response.status === 403) {
    bad(`la API rechazó la clave (HTTP ${response.status})`);
    info(`motivo declarado: ${body?.error?.message ?? "sin detalle"}`);
    info("revisa que la clave sea de Google AI Studio y que la API Gemini esté habilitada");
    process.exit(2);
  }
  if (!response.ok) {
    bad(`respuesta inesperada HTTP ${response.status}`);
    info(String(body?.error?.message ?? "").slice(0, 200));
    process.exit(2);
  }

  models = (body.models ?? []).map((m) => ({
    name: String(m.name ?? "").replace(/^models\//, ""),
    methods: m.supportedGenerationMethods ?? [],
    inputTokens: m.inputTokenLimit ?? null,
  }));
  ok(`clave aceptada · ${models.length} modelos visibles · ${elapsed} ms`);
} catch (error) {
  bad(`no se pudo contactar con la API: ${error?.message ?? error}`);
  info("comprueba la conexión a internet, el proxy corporativo o el firewall");
  process.exit(2);
}

/* --------------------------- 3. modelo disponible ----------------------- */

console.log("\n3) Modelo");
const usable = models.filter((m) => m.methods.includes("generateContent"));
if (usable.length === 0) {
  bad("ningún modelo anuncia generateContent");
  process.exit(3);
}
const target = usable.find((m) => m.name === configuredModel);
if (target) {
  ok(`«${configuredModel}» disponible para generateContent`);
} else {
  bad(`«${configuredModel}» no está en la lista de este proyecto`);
  const flash = usable.filter((m) => /flash/i.test(m.name)).map((m) => m.name);
  const pro = usable.filter((m) => /pro/i.test(m.name)).map((m) => m.name);
  if (flash.length) info(`modelos flash disponibles: ${flash.slice(0, 6).join(", ")}`);
  if (pro.length) info(`modelos pro disponibles: ${pro.slice(0, 4).join(", ")}`);
  info(`corrige GEMINI_MODEL en .env.local (por ejemplo ${flash[0] ?? pro[0] ?? usable[0].name})`);
  process.exit(3);
}

/* ------------------------- 4. generación real --------------------------- */

console.log("\n4) Generación de prueba (JSON estructurado)");
const SCHEMA = {
  type: "object",
  properties: {
    stylePrompt: { type: "string" },
    rationale: { type: "array", items: { type: "string" } },
  },
  required: ["stylePrompt", "rationale"],
};

try {
  const started = Date.now();
  const response = await fetch(`${BASE}/models/${configuredModel}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text:
              "Eres ingeniero de audio. Devuelve en JSON un style prompt breve en inglés para Suno " +
              "basado en un género dado, y una justificación en español. Sin nombres de artistas.",
          },
        ],
      },
      contents: [{ role: "user", parts: [{ text: "Género: vals criollo peruano. Ambiente: nostálgico." }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
        // Gemini 2.5 razona antes de responder y esos tokens cuentan en
        // maxOutputTokens: sin desactivarlo, la salida JSON se trunca.
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
    signal: AbortSignal.timeout(40_000),
  });
  const elapsed = Date.now() - started;
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    bad(`la generación falló (HTTP ${response.status})`);
    info(String(body?.error?.message ?? "").slice(0, 240));
    process.exit(4);
  }

  const raw = body?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const finish = body?.candidates?.[0]?.finishReason ?? "desconocido";
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    bad(`la respuesta no era JSON válido (finishReason: ${finish}, ${raw.length} caracteres)`);
    info(String(raw).slice(0, 240));
    if (finish === "MAX_TOKENS") info("se agotó maxOutputTokens: sube el límite o desactiva el thinking");
    process.exit(4);
  }

  if (typeof parsed?.stylePrompt !== "string" || !parsed.stylePrompt.trim()) {
    bad("la respuesta no trae stylePrompt");
    process.exit(4);
  }

  ok(`generación correcta en ${elapsed} ms`);
  info(`stylePrompt (${parsed.stylePrompt.length} caracteres): «${parsed.stylePrompt.slice(0, 120)}…»`);
  info(`justificación: ${Array.isArray(parsed.rationale) ? parsed.rationale.length : 0} línea(s)`);

  const usage = body?.usageMetadata;
  if (usage) {
    info(
      `tokens: ${usage.promptTokenCount ?? "?"} entrada · ${usage.candidatesTokenCount ?? "?"} salida · ` +
        `${usage.totalTokenCount ?? "?"} total`,
    );
  }
} catch (error) {
  bad(`error en la generación: ${error?.message ?? error}`);
  process.exit(4);
}

console.log("\n╭─ RESULTADO ────────────────────────────────────────────────────────");
console.log("│  La conexión con Gemini funciona de extremo a extremo.");
console.log("│  Ya puedes levantar el proxy:  npm run ai:proxy");
console.log("╰───────────────────────────────────────────────────────────────────\n");
process.exit(0);
