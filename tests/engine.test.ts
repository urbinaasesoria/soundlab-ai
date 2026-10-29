/**
 * Verificación del motor de análisis.
 * Ejecutar: node --import ./tests/register.mjs tests/engine.test.ts
 *
 * © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractFeatures } from "../src/lib/audio/features.ts";
import { evaluate, MODEL_META } from "../src/lib/audio/model.ts";
import { analyzeTrack, zoneFromProbability } from "../src/lib/audio/analyzer.ts";
import {
  makeClickTrack,
  makeHalfSilence,
  makeHuman,
  makeNoise,
  makePureTone,
  makeSynthetic,
} from "./fixtures.ts";

/* ------------------------------ tempo ----------------------------------- */

for (const bpm of [90, 128, 160]) {
  test(`estima ${bpm} BPM en un click-track perfecto`, async () => {
    const features = await extractFeatures(makeClickTrack(bpm));
    assert.ok(
      Math.abs(features.bpm - bpm) <= 2,
      `esperado ~${bpm} BPM, obtenido ${features.bpm.toFixed(1)}`,
    );
  });
}

/* ------------------------- medidas físicas ------------------------------ */

test("el piso de ruido coincide con el nivel inyectado", async () => {
  const features = await extractFeatures(makeNoise(-60));
  assert.ok(
    Math.abs(features.noiseFloorDbfs - -60) < 4,
    `esperado ≈ -60 dBFS, obtenido ${features.noiseFloorDbfs.toFixed(1)}`,
  );
});

test("detecta el silencio digital y no lo confunde con ruido", async () => {
  const features = await extractFeatures(makeHalfSilence());
  assert.ok(features.silenceRatio > 0.4, `silenceRatio=${features.silenceRatio}`);
  assert.ok(features.silenceRatio < 0.65, `silenceRatio=${features.silenceRatio}`);
});

test("el borde espectral distingue banda completa de banda limitada", async () => {
  const tone = await extractFeatures(makePureTone(440, 8));
  const synth = await extractFeatures(makeSynthetic(20));
  // El tono puro solo tiene energía en 440 Hz: el borde debe ser bajo.
  assert.ok(tone.spectralEdgeHz < 2000, `tono: ${tone.spectralEdgeHz} Hz`);
  // El perfil generativo está limitado a 12 kHz.
  assert.ok(synth.spectralEdgeHz < 14000, `sintético: ${synth.spectralEdgeHz} Hz`);
  assert.ok(synth.hfAbove16kRatio < 0.02, `>16k en sintético: ${synth.hfAbove16kRatio}`);
});

/* --------------------------- microtiming -------------------------------- */

test("la rejilla perfecta tiene jitter bajo y bloqueo alto", async () => {
  const synth = await extractFeatures(makeSynthetic(24));
  assert.ok(synth.transientJitterMs < 4, `jitter sintético ${synth.transientJitterMs.toFixed(2)} ms`);
  assert.ok(synth.gridLock > 0.6, `gridLock sintético ${synth.gridLock.toFixed(2)}`);
});

test("el perfil humano se desvía de la rejilla", async () => {
  const human = await extractFeatures(makeHuman(24));
  assert.ok(
    human.transientJitterMs > 3,
    `jitter humano ${human.transientJitterMs.toFixed(2)} ms (debería superar al sintético)`,
  );
});

/* --------------------------- imagen estéreo ----------------------------- */

test("detecta canales idénticos frente a canales asimétricos", async () => {
  const synth = await extractFeatures(makeSynthetic(20));
  const human = await extractFeatures(makeHuman(20));
  assert.ok(synth.hfDecorrelation > 0.99, `HF corr sintético ${synth.hfDecorrelation}`);
  assert.ok(human.hfDecorrelation < 0.97, `HF corr humano ${human.hfDecorrelation}`);
});

/* ------------------------------- modelo --------------------------------- */

test("el modelo no está declarado como calibrado sin datos reales", () => {
  assert.equal(MODEL_META.calibrated, false);
  assert.match(MODEL_META.note, /recalib/i);
});

test("ACEPTACIÓN: el perfil generativo supera al humano por ≥ 40 puntos", async () => {
  const synth = evaluate(await extractFeatures(makeSynthetic(30, 11)));
  const human = evaluate(await extractFeatures(makeHuman(30, 12)));

  assert.ok(synth.probability > 70, `sintético debería ser >70 %, obtenido ${synth.probability}`);
  assert.ok(human.probability < 30, `humano debería ser <30 %, obtenido ${human.probability}`);
  assert.ok(
    synth.probability - human.probability >= 40,
    `discriminación insuficiente: ${synth.probability} vs ${human.probability}`,
  );
});

test("ninguna señal del modelo queda muerta en los dos perfiles", async () => {
  const synth = evaluate(await extractFeatures(makeSynthetic(26, 21)));
  const human = evaluate(await extractFeatures(makeHuman(26, 22)));
  const dead = synth.contributions.filter((c, i) => {
    const other = human.contributions[i];
    return c.applicable && other.applicable && c.value === other.value;
  });
  // Se admite como mucho una señal con lectura idéntica (la estructura).
  assert.ok(
    dead.length <= 1,
    `señales sin capacidad de discriminación: ${dead.map((d) => d.id).join(", ")}`,
  );
});

test("las señales no aplicables no penalizan (archivo mono)", async () => {
  const mono = makePureTone(220, 20);
  mono.channels = [mono.channels[0]];
  mono.numberOfChannels = 1;
  const result = evaluate(await extractFeatures(mono));
  const stereo = result.contributions.find((c) => c.id === "stereo");
  assert.equal(stereo?.applicable, false);
});

/* --------------------------- resultado final ---------------------------- */

test("analyzeTrack produce un informe completo y coherente", async () => {
  const result = await analyzeTrack(makeSynthetic(18, 31));
  assert.ok(result.ai.probability >= 0 && result.ai.probability <= 100);
  assert.equal(result.ai.zone, zoneFromProbability(result.ai.probability));
  assert.equal(result.modules.length, result.ai.signals.length);
  assert.ok(result.modules.length >= 8, "deben existir al menos 8 módulos");
  assert.ok(result.waveform.peaks.length === 900);
  assert.equal(result.spectrogram.frames.length % result.spectrogram.bands, 0);
  assert.ok(result.loudness.lufs < 0, "el loudness debe ser negativo");
  assert.ok(result.engine.includes("URBINA") || result.engine.includes("AUDIO"));
});

test("el resultado es reproducible para el mismo audio", async () => {
  const track = makeSynthetic(14, 41);
  const a = await analyzeTrack(track);
  const b = await analyzeTrack(track);
  assert.equal(a.ai.probability, b.ai.probability);
  assert.equal(a.rhythm.bpm, b.rhythm.bpm);
});
