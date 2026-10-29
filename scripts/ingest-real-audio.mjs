/**
 * Ingesta de audio real para calibrar el modelo.
 *
 * Recorre dos carpetas (pistas humanas/comerciales y pistas generadas con IA),
 * decodifica los WAV, extrae el mismo vector de características que usa el
 * motor y escribe un dataset etiquetado compatible con `train-model.mjs`.
 *
 *   node --import ./tests/register.mjs scripts/ingest-real-audio.mjs \
 *     --human "D:/Calibracion/humanas" --ai "D:/Calibracion/ia" \
 *     --out data/dataset.real.json
 *
 * FORMATOS: WAV PCM 8/16/24/32 bits y WAV float32 (los másters y las
 * exportaciones de Suno en WAV). Para MP3/M4A/FLAC conviene convertir antes:
 *
 *   ffmpeg -i pista.mp3 -ac 2 -ar 44100 pista.wav
 *
 * © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { extname, join, basename } from "node:path";
import { extractFeatures } from "../src/lib/audio/features.ts";

/* --------------------------- argumentos -------------------------------- */

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const HUMAN_DIR = arg("human");
const AI_DIR = arg("ai");
const OUT = arg("out", "data/dataset.real.json");
const MAX_SECONDS = Number(arg("max-seconds", "45"));

if (!HUMAN_DIR || !AI_DIR) {
  console.error(
    "Uso: node --import ./tests/register.mjs scripts/ingest-real-audio.mjs --human <carpeta> --ai <carpeta> [--out data/dataset.real.json] [--max-seconds 45]",
  );
  process.exit(1);
}

/* ------------------------- decodificador WAV ---------------------------- */

/** Lee chunks RIFF/WAVE y devuelve los canales como Float32Array. */
function decodeWav(buffer) {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("no es RIFF/WAVE");
  }
  let offset = 12;
  let fmt = null;
  let data = null;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt ") {
      let format = buffer.readUInt16LE(body);
      const channels = buffer.readUInt16LE(body + 2);
      const sampleRate = buffer.readUInt32LE(body + 4);
      const bits = buffer.readUInt16LE(body + 14);
      if (format === 0xfffe && size >= 40) format = buffer.readUInt16LE(body + 24); // subformato
      fmt = { format, channels, sampleRate, bits };
    } else if (id === "data") {
      data = buffer.subarray(body, Math.min(buffer.length, body + size));
    }
    offset = body + size + (size % 2);
  }
  if (!fmt || !data) throw new Error("WAV sin fmt o data");
  const { format, channels, sampleRate, bits } = fmt;
  const bytesPerSample = bits / 8;
  const frames = Math.floor(data.length / (bytesPerSample * channels));
  const out = Array.from({ length: channels }, () => new Float32Array(frames));

  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const p = (i * channels + c) * bytesPerSample;
      let v = 0;
      if (format === 3 && bits === 32) {
        v = data.readFloatLE(p);
      } else if (bits === 16) {
        v = data.readInt16LE(p) / 32768;
      } else if (bits === 24) {
        const b0 = data[p];
        const b1 = data[p + 1];
        const b2 = data[p + 2];
        let raw = (b2 << 16) | (b1 << 8) | b0;
        if (raw & 0x800000) raw |= ~0xffffff;
        v = raw / 8388608;
      } else if (bits === 32) {
        v = data.readInt32LE(p) / 2147483648;
      } else if (bits === 8) {
        v = (data[p] - 128) / 128;
      } else {
        throw new Error(`profundidad no soportada: ${bits} bits`);
      }
      out[c][i] = v;
    }
  }
  return { channels: out, sampleRate };
}

function walk(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const info = statSync(full);
    if (info.isDirectory()) found.push(...walk(full));
    else if ([".wav", ".wave"].includes(extname(entry).toLowerCase())) found.push(full);
  }
  return found;
}

/* -------------------------- características ---------------------------- */

const FEATURE_KEYS = [
  "transientJitterMs",
  "gridLock",
  "velocityVariation",
  "spectralEdgeHz",
  "hfAbove16kRatio",
  "hfSlopeDbOct",
  "noiseFloorDbfs",
  "silenceRatio",
  "hfDecorrelation",
  "width",
  "channelLevelDiffDb",
  "lra",
  "crestDb",
  "centroidStd",
];

const rows = [];
const problems = [];

async function ingest(dir, label, className) {
  const files = walk(dir);
  console.log(`\n${className}: ${files.length} archivos WAV en ${dir}`);
  for (const [index, file] of files.entries()) {
    const name = basename(file);
    try {
      const decoded = decodeWav(readFileSync(file));
      const total = decoded.channels[0].length;
      const limit = Math.min(total, Math.round(decoded.sampleRate * MAX_SECONDS));
      const channels = decoded.channels.map((ch) => ch.subarray(0, limit));
      const features = await extractFeatures({
        name,
        size: statSync(file).size,
        mime: "audio/wav",
        duration: limit / decoded.sampleRate,
        sampleRate: decoded.sampleRate,
        channels,
        numberOfChannels: channels.length,
      });
      rows.push({
        label,
        source: className,
        file: name,
        features: FEATURE_KEYS.map((k) => {
          const v = features[k];
          return Number.isFinite(v) ? Math.round(v * 10000) / 10000 : 0;
        }),
      });
      process.stdout.write(`\r  ${index + 1}/${files.length} · ${name.slice(0, 40)}   `);
    } catch (err) {
      problems.push({ file, reason: err.message });
    }
  }
  process.stdout.write("\n");
}

await ingest(HUMAN_DIR, 0, "humanas");
await ingest(AI_DIR, 1, "generadas");

const humanas = rows.filter((r) => r.label === 0).length;
const generadas = rows.filter((r) => r.label === 1).length;

console.log(`\nMuestras válidas: ${rows.length} (humanas ${humanas} · generadas ${generadas})`);
if (problems.length) {
  console.log(`Archivos omitidos: ${problems.length}`);
  for (const p of problems.slice(0, 10)) console.log(`  · ${basename(p.file)} → ${p.reason}`);
}

if (humanas < 60 || generadas < 60) {
  console.warn(
    "\n⚠️  Menos de 60 muestras por clase. El modelo no será fiable: apunta a 120–200 por clase " +
      "y empareja por género (mismo estilo en ambas carpetas).",
  );
}

mkdirSync(join(OUT, ".."), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify(
    {
      version: 1,
      source: "real-audio",
      createdAt: new Date().toISOString(),
      classes: { 1: "generado con IA", 0: "humano / comercial" },
      balance: { humanas, generadas },
      featureKeys: FEATURE_KEYS,
      rows,
      problems,
    },
    null,
    1,
  ),
  "utf8",
);
console.log(`\nEscrito ${OUT}`);
console.log("Siguiente paso:  npm run model:train -- --dataset " + OUT);
