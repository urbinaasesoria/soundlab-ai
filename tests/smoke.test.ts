import { test } from "node:test";
import assert from "node:assert/strict";
import { FFT } from "../src/lib/audio/fft.ts";

test("FFT detecta la frecuencia de un seno", () => {
  const sr = 44100;
  const size = 2048;
  const fft = new FFT(size);
  const freq = 1000;
  const frame = new Float32Array(size);
  for (let i = 0; i < size; i++) frame[i] = Math.sin((2 * Math.PI * freq * i) / sr);
  const mags = fft.magnitudes(frame);
  let bestBin = 0;
  for (let b = 1; b < mags.length; b++) if (mags[b] > mags[bestBin]) bestBin = b;
  const detected = (bestBin * sr) / size;
  assert.ok(Math.abs(detected - freq) < (2 * sr) / size, `esperado ~${freq} Hz, obtenido ${detected} Hz`);
});

test("FFT reutiliza buffers sin alterar el resultado", () => {
  const fft = new FFT(512);
  const frame = new Float32Array(512);
  for (let i = 0; i < 512; i++) frame[i] = Math.sin((2 * Math.PI * 400 * i) / 8000);
  const mags = new Float32Array(256);
  const a = Float32Array.from(fft.magnitudesInto(frame, mags));
  const b = Float32Array.from(fft.magnitudesInto(frame, mags));
  assert.deepEqual(Array.from(a), Array.from(b));
});
