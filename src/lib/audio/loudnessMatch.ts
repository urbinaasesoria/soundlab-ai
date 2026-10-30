/**
 * Nivelación de sonoridad para pruebas A/B.
 * © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 *
 * Comparar dos versiones sin igualar el nivel es el error clásico del mastering:
 * lo que suena más fuerte casi siempre se percibe como «mejor». Aquí se atenúa
 * la versión más alta hasta el nivel de la más baja (nunca se amplifica, para no
 * introducir distorsión) y se respeta el pico real.
 */
import { dbToGain, measureLoudness, truePeakDb } from "./loudness";

export interface LevelMatch {
  /** Ganancia lineal a aplicar (0–1). */
  gain: number;
  /** Ganancia en dB. */
  gainDb: number;
  loudnessLufs: number;
  truePeakDb: number;
  /** true si hubo que recortar la ganancia para no superar 0 dBFS de pico. */
  peakLimited: boolean;
}

/**
 * Calcula la ganancia que lleva `channels` al nivel objetivo.
 * Si `targetLufs` no se indica, devuelve la ganancia neutra (1).
 */
export function levelMatch(
  channels: Float32Array[],
  sampleRate: number,
  targetLufs?: number,
): LevelMatch {
  const { integratedLufs } = measureLoudness(channels, sampleRate);
  const peak = truePeakDb(channels);
  const reported = Number.isFinite(integratedLufs) ? integratedLufs : -23;

  if (targetLufs === undefined || !Number.isFinite(targetLufs)) {
    return { gain: 1, gainDb: 0, loudnessLufs: reported, truePeakDb: peak, peakLimited: false };
  }

  let gainDb = targetLufs - reported;
  // Nunca amplificar: subir el nivel de una pista ya masterizada introduce distorsión.
  gainDb = Math.min(0, gainDb);
  let gain = dbToGain(gainDb);
  let peakLimited = false;

  // Respetar 0 dBFS de pico real.
  const projectedPeak = peak + gainDb;
  if (projectedPeak > -0.1) {
    gainDb = -0.1 - peak;
    gain = dbToGain(gainDb);
    peakLimited = true;
  }

  return { gain: Math.max(0, gain), gainDb, loudnessLufs: reported, truePeakDb: peak, peakLimited };
}

/** Objetivo común para dos versiones: la más baja de las dos (solo atenuar). */
export function commonTarget(lufsA: number, lufsB: number): number {
  const valid = [lufsA, lufsB].filter((v) => Number.isFinite(v));
  if (valid.length === 0) return -18;
  return Math.min(...valid);
}

/* --------------------------- estadística ------------------------------- */

/** Probabilidad exacta de obtener `hits` o más aciertos por azar (binomial, p=0,5). */
export function binomialTail(hits: number, trials: number): number {
  if (trials <= 0) return 1;
  const n = Math.min(trials, 500);
  const k = Math.max(0, Math.min(hits, n));
  let probability = 0;
  let term = Math.pow(0.5, n); // P(X = 0)
  for (let i = 0; i <= n; i++) {
    if (i >= k) probability += term;
    term = (term * (n - i)) / (i + 1);
  }
  return Math.min(1, probability);
}

/** Lectura honesta del resultado: qué se puede y qué no se puede concluir. */
export function interpret(hits: number, trials: number): string {
  if (trials < 8) {
    return `Con ${trials} ${trials === 1 ? "prueba" : "pruebas"} no se puede concluir nada: se necesitan al menos 10–16 para que el resultado empiece a significar algo.`;
  }
  const p = binomialTail(hits, trials);
  const pct = Math.round((hits / trials) * 100);
  if (p < 0.05) {
    return `Con ${trials} pruebas y ${pct} % de aciertos (p ≈ ${p.toFixed(3)}), la preferencia es estadísticamente significativa al 5 %: hay evidencia de que la versión procesada gusta más.`;
  }
  if (p < 0.2) {
    return `Con ${trials} pruebas y ${pct} % de aciertos (p ≈ ${p.toFixed(3)}), la tendencia apunta a favor pero todavía no es concluyente. Sigue probando con más fragmentos.`;
  }
  return `Con ${trials} pruebas y ${pct} % de aciertos (p ≈ ${p.toFixed(3)}), el resultado es indistinguible del azar: no hay evidencia de preferencia. O el procesado no aporta, o el fragmento no es el adecuado para notarlo.`;
}
