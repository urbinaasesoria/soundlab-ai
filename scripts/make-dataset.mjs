/**
 * Genera un dataset etiquetado de características acústicas para calibrar el
 * modelo. Cada muestra es un audio sintetizado con perfil conocido:
 *
 *   label 1 = "generativo": rejilla exacta, sin ruido, canales idénticos,
 *             banda limitada, dinámica plana.
 *   label 0 = "humano": microtiming, ruido de sala, canales asimétricos,
 *             banda completa, dinámica por secciones.
 *
 * ADVERTENCIA: este dataset es un **proxy sintético**. Sirve para validar la
 * tubería y para pruebas de regresión, NO para declarar el modelo calibrado.
 * Para calibrar de verdad hay que sustituir este generador por audio real
 * etiquetado (o añadirlo al manifiesto).
 *
 * Uso: node --import ./tests/register.mjs scripts/make-dataset.mjs [n]
 *
 * © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { extractFeatures } from "../src/lib/audio/features.ts";
import { makeHuman, makeSynthetic } from "../tests/fixtures.ts";

const PER_CLASS = Number(process.argv[2] ?? 24);
const SR = 44100;

/** Variaciones aleatorias para que el modelo no memorice una sola semilla. */
function jitterTrack(track, seed, mode) {
  const rnd = (() => {
    let s = seed >>> 0;
    return () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return ((s >>> 0) / 4294967295) * 2 - 1;
    };
  })();
  // pequeña ganancia aleatoria por muestra para evitar que el nivel sea una pista
  const gain = 0.75 + 0.5 * Math.abs(rnd());
  const channels = track.channels.map((ch) => {
    const out = new Float32Array(ch.length);
    for (let i = 0; i < ch.length; i++) out[i] = ch[i] * gain;
    return out;
  });
  void mode;
  return { ...track, channels, duration: channels[0].length / SR };
}

function rows(label, make, count, baseSeed) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const seconds = 18 + Math.round(Math.abs(Math.sin(baseSeed + i)) * 12);
    const track = jitterTrack(make(seconds, baseSeed + i * 7), baseSeed + i, label);
    out.push({ track, label, seconds });
  }
  return out;
}

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

const dataset = { version: 1, source: "synthetic-proxy", classes: { 1: "generativo", 0: "humano" }, rows: [] };

const queue = [
  ...rows(1, makeSynthetic, PER_CLASS, 101),
  ...rows(0, makeHuman, PER_CLASS, 9001),
];

console.log(`Extrayendo características de ${queue.length} muestras…`);
for (const [index, item] of queue.entries()) {
  const features = await extractFeatures(item.track, { fftSize: 2048, hopSize: 512 });
  const vector = FEATURE_KEYS.map((key) => {
    const value = features[key];
    return Number.isFinite(value) ? Math.round(value * 10000) / 10000 : 0;
  });
  dataset.rows.push({ label: item.label, features: vector });
  process.stdout.write(`\r  ${index + 1}/${queue.length}`);
}
process.stdout.write("\n");

mkdirSync("data", { recursive: true });
writeFileSync("data/dataset.json", JSON.stringify({ ...dataset, featureKeys: FEATURE_KEYS }, null, 1), "utf8");
console.log(`Escrito data/dataset.json (${dataset.rows.length} muestras, ${FEATURE_KEYS.length} características)`);
