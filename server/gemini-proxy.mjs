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
import { existsSync, readFileSync } from "node:fs";

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

/* ------------------------ base de conocimiento -------------------------- */

/**
 * Manual de ingeniería de prompts de SUNO 6.0. Se inyecta íntegro: 16 kB son
 * unos 4.000 tokens, despreciables frente al contexto del modelo, y es la
 * fuente de verdad sobre arquitectura tri-campo, deslizadores, metatags y
 * depuración de anomalías.
 */
const KB_CANDIDATES = [
  process.env.SUNO_KB,
  "docs/knowledge/ingenieria-prompts-suno6.md",
  "ingenieria-prompts-suno6.md",
].filter(Boolean);

function loadKnowledge() {
  for (const path of KB_CANDIDATES) {
    try {
      if (existsSync(path)) {
        const text = readFileSync(path, "utf8").trim();
        if (text.length > 500) {
          console.log(`[proxy] base de conocimiento: ${path} (${text.length} caracteres)`);
          return text;
        }
      }
    } catch {
      /* se prueba el siguiente candidato */
    }
  }
  console.warn("[proxy] sin base de conocimiento: se usará solo el prompt base");
  return "";
}

const KNOWLEDGE = loadKnowledge();

const SYSTEM_PROMPT = `Eres un ingeniero de audio y musicólogo senior, experto en la arquitectura de SUNO 6.0.
Tu salida se pega directamente en los campos de Suno, así que debe ser técnicamente exacta y usable.

${
  KNOWLEDGE
    ? `BASE DE CONOCIMIENTO OBLIGATORIA (manual interno de SUNO 6.0). Sus reglas prevalecen sobre cualquier
otra indicación y sobre tu criterio general:

<manual>
${KNOWLEDGE}
</manual>`
    : ""
}

TAREA
Recibirás un set de producción ya construido por un motor determinista (preset de género, emoción,
instrumentación, BPM, tonalidad, perfil vocal y ajustes). Debes MEJORARLO sin traicionar su intención.

REGLAS DURAS
1. El campo Style es un *creative brief* en inglés, en frase continua, con la jerarquía del manual:
   género → groove → 2–4 instrumentos clave → registro y cariz vocal → evolución dinámica → textura de
   mezcla y espacio → ancla decadal. Usa verbos que describan comportamiento, no adjetivos vacíos.
2. PROHIBIDO escribir negaciones en el Style ("no drums", "without autotune", "sin reverb"): el modelo
   procesa esos tokens como atención positiva. Las exclusiones van SOLO en excludeStyles, como términos
   desnudos separados por comas.
3. PROHIBIDO nombrar artistas, bandas o marcas reales. Si necesitas una referencia estética, usa el
   Perfilado Descriptivo (registro, técnica, actitud, tratamiento espacial).
4. No reescribas la letra del usuario. Si propones cambios de estructura, descríbelos en lyricsNotes con
   metatags válidos; recuerda que el estribillo rinde mejor entre 2 y 4 líneas.
5. Respeta el límite de 1.000 caracteres del Style; entre 180 y 320 la densidad técnica es óptima.
6. Devuelve JSON válido con el esquema pedido. En rationale, una línea por cambio, en español.
7. En warnings, señala solo riesgos reales del set recibido (por ejemplo, negaciones en el Style,
   parámetros incoherentes o ausencia de perfil vocal).`;

/** Mueve negaciones del Style al campo de exclusión (regla del manual §2.C). */
const NEGATION =
  /\b(?:no|without|sin)\s+(drums?|autotune|reverb|distortion|guitars?|vocals?|piano|strings?|brass|808|synths?|choir|orchestra)\b/gi;

function sanitizeSuggestion(raw) {
  const warnings = Array.isArray(raw?.warnings) ? [...raw.warnings] : [];
  let style = typeof raw?.stylePrompt === "string" ? raw.stylePrompt : "";
  let exclude = typeof raw?.excludeStyles === "string" ? raw.excludeStyles : "";

  const moved = [];
  style = style.replace(NEGATION, (match, term) => {
    moved.push(term.toLowerCase());
    return "";
  });
  style = style.replace(/,\s*,/g, ",").replace(/\s{2,}/g, " ").replace(/^[\s,]+|[\s,]+$/g, "");

  if (moved.length) {
    const found = Array.from(new Set(moved));
    const existing = exclude
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    exclude = Array.from(new Set([...existing, ...found])).join(", ").slice(0, 1000);
    warnings.push(
      `Se movieron ${found.length} negación(es) del campo Style al campo Exclude (${found.join(", ")}): el manual de SUNO 6.0 advierte que las negaciones en el Style aumentan la probabilidad de que aparezcan.`,
    );
  }

  return {
    stylePrompt: style.slice(0, 1000),
    excludeStyles: exclude,
    warnings,
  };
}

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
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
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
      ...sanitizeSuggestion(parsed),
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

/* ------------------------ composición de letra -------------------------- */

/**
 * Esquema del set completo: estilo, exclusiones y LETRA. El manual de SUNO 6.0
 * §2.B y §5 gobiernan la forma de la letra (metatags, longitud de estribillo,
 * cierre [End] y hack de entrada vocal).
 */
const COMPOSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    stylePrompt: { type: "string" },
    excludeStyles: { type: "string" },
    lyrics: { type: "string" },
    lyricsNotes: { type: "string" },
    rationale: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["stylePrompt", "lyrics", "rationale"],
};

const COMPOSE_SYSTEM = `${SYSTEM_PROMPT}

MODO COMPOSICIÓN DE LETRA
En esta llamada debes devolver el SET COMPLETO: stylePrompt, excludeStyles y la LETRA.

LETRA — REGLAS ESTRICTAS (manual SUNO 6.0, §2.B y §5)
1. Escribe letra ORIGINAL en el idioma del usuario (por defecto español). Prohibido reproducir o parafrasear
   letras existentes.
2. Usa metatags entre corchetes en inglés: [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Bridge],
   [Outro] y CIERRA SIEMPRE con [End].
3. El [Chorus] debe tener entre 2 y 4 líneas: más allá se diluye el gancho. Las estrofas admiten hasta 8 líneas.
4. Puedes usar pipe-stacking para directivas locales: [Chorus | Anthemic | Stacked Harmonies].
5. Si el set pide entrada vocal inmediata, empieza con [***], [start_on_through] y [start_on_"<primeras palabras>"].
6. La letra debe encajar con el BPM, la tonalidad, el mood y el género del set: métrica regular y sin
   adjetivos vacíos. Nada de nombres de artistas, canciones ni marcas.
7. Máximo 5.000 caracteres. Si el usuario ya aporta letra, reescríbela conservando su idea y su métrica,
   sin cambiar el mensaje.
8. Devuelve el stylePrompt coherente con esa letra (misma emoción y misma instrumentación).
9. En lyricsNotes explica en una frase las decisiones de estructura. En rationale, una línea por decisión.`;

function composeUserText(payload) {
  const {
    idea = "",
    preset = "(sin especificar)",
    set = "",
    stylePrompt = "",
    bpm = "",
    keyScale = "",
    mood = "",
    vocal = "",
    language = "es",
    existingLyrics = "",
    mode = "create",
    variant = 1,
    avoid = "",
  } = payload ?? {};

  return [
    `PRESET DE GÉNERO: ${preset}`,
    bpm ? `BPM: ${bpm}` : "",
    keyScale ? `TONALIDAD: ${keyScale}` : "",
    mood ? `EMOCIÓN: ${mood}` : "",
    vocal ? `PERFIL VOCAL: ${vocal}` : "",
    language ? `IDIOMA DE LA LETRA: ${language === "es" ? "español" : language}` : "",
    idea ? `IDEA DE PARTIDA DEL USUARIO (respétala): """${String(idea).slice(0, 2000)}"""` : "",
    existingLyrics
      ? `LETRA ACTUAL DEL USUARIO (modo ${mode === "rewrite" ? "REESCRITURA: conserva idea y métrica" : "referencia"}):\n"""${String(existingLyrics).slice(0, 4000)}"""`
      : "El usuario NO tiene letra: escríbela desde cero a partir de la idea.",
    stylePrompt ? `SET ACTUAL DEL MOTOR (mejóralo, no lo traiciones):\n"""${String(set || stylePrompt).slice(0, 2000)}"""` : "",
    variant > 1
      ? `VARIANTE ${variant}: el usuario RECHAZÓ la versión anterior. Busca un ángulo CLARAMENTE distinto — otra estructura, otras imágenes, otro punto de vista narrativo o incluso otro narrador. Prohibido reutilizar versos, rimas o estribillos de intentos previos.`
      : "",
    avoid
      ? `NO REUTILICES NADA DE ESTA VERSIÓN PREVIA (ni sus imágenes ni sus rimas):\n"""${String(avoid).slice(0, 3000)}"""`
      : "",
    "Devuelve el JSON con el set completo.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function handleCompose(req, res) {
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

  if (!payload?.idea && !payload?.existingLyrics) {
    return send(req, res, 400, { error: "hace falta una idea o una letra de partida" });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: COMPOSE_SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: composeUserText(payload) }] }],
        generationConfig: {
          // Cada reintento sube la temperatura: si no, el modelo converge a la misma letra.
          temperature: Number(payload?.variant) > 1 ? 0.98 : 0.85,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          responseSchema: COMPOSE_SCHEMA,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: AbortSignal.timeout(75_000),
    });

    const text = await response.text();
    if (!response.ok) {
      console.error("[proxy] error del proveedor (compose)", response.status);
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
      console.error("[proxy] compose no estructurado", finish, raw.length);
      return send(req, res, 502, {
        error: `respuesta no estructurada (${finish || "sin finishReason"}); prueba con una idea más corta`,
      });
    }

    if (typeof parsed.lyrics !== "string" || parsed.lyrics.trim().length < 40) {
      return send(req, res, 502, { error: "la letra devuelta es demasiado corta o está vacía" });
    }

    const safe = sanitizeSuggestion(parsed);
    const warnings = [...(safe.warnings ?? [])];
    const lyrics = parsed.lyrics.slice(0, 5000);

    if (!/\[End\]\s*$/i.test(lyrics)) {
      warnings.push("La letra no terminaba en [End]: se añadió para evitar relleno instrumental tras el final.");
    }

    return send(req, res, 200, {
      title: parsed.title ?? "",
      stylePrompt: safe.stylePrompt,
      excludeStyles: safe.excludeStyles,
      lyrics: /\[End\]\s*$/i.test(lyrics) ? lyrics : `${lyrics.trim()}\n\n[End]`,
      lyricsNotes: parsed.lyricsNotes ?? "",
      rationale: Array.isArray(parsed.rationale) ? parsed.rationale : [],
      warnings,
      model: MODEL,
      usage: data?.usageMetadata
        ? {
            inputTokens: data.usageMetadata.promptTokenCount ?? null,
            outputTokens: data.usageMetadata.candidatesTokenCount ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error("[proxy] fallo de red (compose)", error?.name ?? "error");
    return send(req, res, 502, { error: "no se pudo contactar con el proveedor" });
  }
}

/* --------------------------- informe narrado ---------------------------- */

const NARRATE_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          severity: { type: "string" },
        },
        required: ["title", "detail"],
      },
    },
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          priority: { type: "string" },
        },
        required: ["title", "detail"],
      },
    },
    disclaimer: { type: "string" },
  },
  required: ["headline", "summary", "findings", "actions"],
};

const NARRATE_SYSTEM = `${SYSTEM_PROMPT}

MODO INFORME NARRADO
Recibirás el JSON de un informe técnico ya calculado por DSP local (métricas de loudness ITU-R BS.1770,
rango dinámico, estéreo, tonalidad, ritmo, índice de IA con sus señales y recomendaciones del motor).

Tu trabajo NO es recalcular nada ni contradecir los números: es explicarlos.

REGLAS
1. No inventes cifras que no estén en el JSON. Si falta un dato, dilo.
2. Explica el diagnóstico como lo haría un ingeniero de mastering frente al productor: qué está bien, qué
   está fuera de rango y por qué importa.
3. Ordena las acciones por impacto real, no por facilidad.
4. Distingue lo que se arregla con mezcla o master de lo que exige volver a la producción.
5. Si el índice de IA se apoya en señales débiles o no calibradas, dilo con claridad: no es un veredicto.
6. Tono directo y honesto, sin condescendencia ni relleno. Español neutro.
7. En disclaimer, una frase recordando que es una lectura automática y que el oído manda.`;

async function handleNarrate(req, res) {
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

  if (!payload?.report || typeof payload.report !== "object") {
    return send(req, res, 400, { error: "falta el informe" });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: NARRATE_SYSTEM }] },
        contents: [
          {
            role: "user",
            parts: [
              {
                text:
                  "INFORME (JSON):\n" +
                  JSON.stringify(payload.report).slice(0, 12000) +
                  "\n\nExplícalo y prioriza las acciones.",
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.45,
          maxOutputTokens: 2500,
          responseMimeType: "application/json",
          responseSchema: NARRATE_SCHEMA,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: AbortSignal.timeout(75_000),
    });

    const text = await response.text();
    if (!response.ok) {
      console.error("[proxy] error del proveedor (narrate)", response.status);
      return send(req, res, 502, { error: `el proveedor respondió ${response.status}` });
    }

    const data = JSON.parse(text);
    const candidate = data?.candidates?.[0];
    const raw = candidate?.content?.parts?.[0]?.text ?? "";
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return send(req, res, 502, { error: "respuesta no estructurada del modelo" });
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
    console.error("[proxy] fallo de red (narrate)", error?.name ?? "error");
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

  if (req.method !== "POST" || !["/api/suggest", "/api/compose", "/api/narrate"].includes(req.url)) {
    return send(req, res, 404, { error: "ruta no encontrada" });
  }

  if (rateLimited(ip)) {
    return send(req, res, 429, { error: "demasiadas peticiones, espera un minuto" });
  }

  if (req.url === "/api/compose") void handleCompose(req, res);
  else if (req.url === "/api/narrate") void handleNarrate(req, res);
  else void handleSuggest(req, res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[proxy] escuchando en http://127.0.0.1:${PORT}`);
  console.log(`[proxy] modelo ${MODEL}`);
  console.log(`[proxy] base de conocimiento: ${KNOWLEDGE ? "cargada" : "AUSENTE"}`);
  console.log(`[proxy] orígenes permitidos: ${[...ALLOWED].join(", ")}`);
  console.log("[proxy] la clave nunca se registra en logs");
});
