/**
 * ============================================================================
 *  PROXY LOCAL DE IA — SoundLab AI
 *  © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 * ============================================================================
 *  Mantiene la clave de Gemini FUERA del navegador y del repositorio.
 *
 *  Uso:
 *    1. Copia `.env.example` a `.env.local` y rellena `GEMINI_API_KEY`.
 *    2. `npm run ai:proxy`
 *    3. `node scripts/check-gemini.mjs` para diagnosticar la conexión.
 *
 *  Sin dependencias: solo Node 20+ (fetch nativo).
 *
 *  En producción este mismo contrato se despliega como Cloudflare Worker o
 *  función serverless. La clave va SIEMPRE en el secreto del servidor.
 * ============================================================================
 */
import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 8787);
const API_KEY = process.env.GEMINI_API_KEY ?? "";
const MODEL = (process.env.GEMINI_MODEL ?? "gemini-2.5-flash").replace(/^models\//, "");
const MAX_BODY = 24 * 1024; // 24 kB: solo texto, nunca audio
const RATE_LIMIT = 30;
const WINDOW_MS = 60_000;

/* ------------------------------ orígenes -------------------------------- */

const configured = (process.env.ALLOW_ORIGINS ?? process.env.ALLOW_ORIGIN ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

/** En desarrollo se aceptan tanto `localhost` como `127.0.0.1`. */
const DEV_ORIGINS = [
  "http://localhost:5180",
  "http://127.0.0.1:5180",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

const ALLOWED = new Set([...configured, ...DEV_ORIGINS]);

if (!API_KEY) {
  console.error("[proxy] Falta GEMINI_API_KEY. Copia .env.example a .env.local y rellénala.");
  process.exit(1);
}

/* ------------------------------ utilidades ------------------------------ */

const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip) ?? { count: 0, reset: now + WINDOW_MS };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + WINDOW_MS;
  }
  entry.count += 1;
  hits.set(ip, entry);
  return entry.count > RATE_LIMIT;
}

function corsFor(req) {
  const origin = req.headers.origin;
  if (origin && ALLOWED.has(origin)) {
    return { "access-control-allow-origin": origin, vary: "Origin" };
  }
  return { vary: "Origin" };
}

function send(req, res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
    "cache-control": "no-store",
    ...corsFor(req),
  });
  res.end(JSON.stringify(payload));
}

/** Esquema estricto: el modelo no puede devolver otra forma que esta. */
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    stylePrompt: { type: "string" },
    excludeStyles: { type: "string" },
    lyricsNotes: { type: "string" },
    rationale: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["stylePrompt", "rationale"],
};

const SYSTEM = `Eres un ingeniero de audio y musicólogo senior especializado en prompts de SUNO AI.
Recibirás un set de producción ya construido por un motor determinista y deberás MEJORARLO sin
traicionar su intención.

REGLAS:
- El style prompt va en INGLÉS, denso en técnica, entre 180 y 320 caracteres. Nunca superes 1000.
- No inventes géneros ni cambies el preset recibido: refina matices (timbre, época, producción).
- Prohibido citar nombres de artistas, bandas o marcas reales.
- No escribas letras nuevas: solo notas sobre la estructura si aportan.
- Devuelve JSON válido con el esquema pedido. En rationale, justifica cada cambio en una línea.`;

async function handleSuggest(req, res) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > MAX_BODY) return send(req, res, 413, { error: "payload demasiado grande" });
  }

  let payload;
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    return send(req, res, 400, { error: "JSON inválido" });
  }

  const { set, preset, extras } = payload ?? {};
  if (typeof set !== "string" || set.length < 10) {
    return send(req, res, 400, { error: "falta el set de producción" });
  }

  const userText = [
    `PRESET: ${preset ?? "(sin especificar)"}`,
    `SET ACTUAL: ${set}`,
    extras ? `CONTEXTO: ${String(extras).slice(0, 800)}` : "",
    "Devuelve el set mejorado.",
  ]
    .filter(Boolean)
    .join("\n");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1600,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          // Gemini 2.5 razona antes de responder y esos tokens se descuentan de
          // maxOutputTokens: sin desactivarlo el JSON llega truncado.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: AbortSignal.timeout(45_000),
    });

    const text = await response.text();
    if (!response.ok) {
      // Nunca reenviar el mensaje del proveedor tal cual: puede contener detalles internos.
      console.error("[proxy] error del proveedor", response.status);
      return send(req, res, 502, { error: `el proveedor respondió ${response.status}` });
    }

    const data = JSON.parse(text);
    const candidate = data?.candidates?.[0];
    const raw = candidate?.content?.parts?.[0]?.text ?? "";
    const finish = candidate?.finishReason ?? "";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("[proxy] respuesta no estructurada", finish, raw.length);
      return send(req, res, 502, { error: `respuesta no estructurada (${finish || "sin finishReason"})` });
    }

    return send(req, res, 200, {
      ...parsed,
      model: MODEL,
      usage: data?.usageMetadata
        ? {
            inputTokens: data.usageMetadata.promptTokenCount ?? null,
            outputTokens: data.usageMetadata.candidatesTokenCount ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error("[proxy] fallo de red", error?.name ?? "error");
    return send(req, res, 502, { error: "no se pudo contactar con el proveedor" });
  }
}

/* -------------------------------- servidor ------------------------------ */

const server = createServer((req, res) => {
  const ip = req.socket.remoteAddress ?? "local";

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      ...corsFor(req),
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "POST, GET, OPTIONS",
      "access-control-max-age": "600",
    });
    return res.end();
  }

  if (req.method === "GET" && req.url === "/health") {
    return send(req, res, 200, { ok: true, model: MODEL, hasKey: true });
  }

  if (req.method !== "POST" || req.url !== "/api/suggest") {
    return send(req, res, 404, { error: "ruta no encontrada" });
  }

  if (rateLimited(ip)) {
    return send(req, res, 429, { error: "demasiadas peticiones, espera un minuto" });
  }

  void handleSuggest(req, res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[proxy] escuchando en http://127.0.0.1:${PORT}`);
  console.log(`[proxy] modelo ${MODEL}`);
  console.log(`[proxy] orígenes permitidos: ${[...ALLOWED].join(", ")}`);
  console.log("[proxy] la clave nunca se registra en logs");
});
