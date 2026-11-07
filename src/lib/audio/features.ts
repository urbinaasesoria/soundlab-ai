/**
 * ============================================================================
 *  EXTRACCIÓN DE CARACTERÍSTICAS ACÚSTICAS — capa pura y verificable
 * ============================================================================
 *  © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 *
 *  Esta capa NO decide nada: solo mide. Es determinista, no toca el DOM y se
 *  puede probar con node:test. El juicio (probabilidad, módulos, consejos) vive
 *  en `model.ts`.
 *
 *  Cada característica documenta qué mide y en qué dirección se interpreta.
 *  Unidades siempre explícitas: Hz, dBFS, dBTP, LU, ms, ratio 0..1.
 * ============================================================================
 */
import { FFT } from "./fft";
import { measureLoudness, truePeakDb } from "./loudness";

/* ------------------------------- tipos ---------------------------------- */

export interface Band {
  label: string;
  low: number;
  high: number;
}

export const BANDS: Band[] = [
  { label: "SUB", low: 20, high: 60 },
  { label: "LOW", low: 60, high: 250 },
  { label: "LOW-MID", low: 250, high: 500 },
  { label: "MID", low: 500, high: 2000 },
  { label: "HIGH-MID", low: 2000, high: 6000 },
  { label: "HIGH", low: 6000, high: 12000 },
  { label: "AIR", low: 12000, high: 20000 },
];

export interface Section {
  start: number;
  end: number;
  label: string;
  energy: number;
}

export interface AudioFeatures {
  /* --- identidad --- */
  durationSec: number;
  sampleRate: number;
  channelCount: number;
  isMono: boolean;

  /* --- espectro (agregado sobre tramas) --- */
  /** Centroide espectral medio (Hz): "brillo" percibido. */
  centroidMean: number;
  /** Desviación del centroide (Hz): variación tímbrica entre tramas. */
  centroidStd: number;
  /** Planitud espectral media (0..1). Alto = ruido/amplio; bajo = tonal. */
  flatnessMean: number;
  /** Desviación de la planitud: textura cambiante vs. constante. */
  flatnessStd: number;
  /** Frecuencia por debajo de la cual está el 85 % de la energía (Hz). */
  rolloff85: number;
  /** Coeficiente de variación del flujo espectral: estabilidad de la textura. */
  fluxCv: number;
  /** Tasa de cruces por cero (0..1). */
  zcrMean: number;
  /** Borde espectral: frecuencia más alta audible dentro de 45 dB del pico (Hz). */
  spectralEdgeHz: number;
  /** Pendiente del espectro entre 8 y 16 kHz (dB/octava). Negativa y empinada = corte. */
  hfSlopeDbOct: number;
  /** Energía relativa por encima de 16 kHz (0..1): un brickwall la deja casi a 0. */
  hfAbove16kRatio: number;
  /** Energía relativa 10–16 kHz (0..1): "aire". */
  airRatio: number;
  /** Energía relativa por banda, en dB respecto al total (7 valores). */
  bandDb: number[];

  /* --- dinámica --- */
  /** Loudness integrado ITU-R BS.1770-4 (LUFS). */
  lufs: number;
  /** Pico real interpolado (dBTP). */
  truePeakDbtp: number;
  /** Rango de loudness (LU). */
  lra: number;
  /** Crest factor: pico − RMS (dB). */
  crestDb: number;
  /** Peak-to-loudness ratio (dB). */
  plr: number;
  peakDb: number;
  rmsDb: number;
  dcOffset: number;
  clippingSamples: number;
  /** Piso de ruido real: percentil 5 del RMS en ventanas de 50 ms (dBFS). */
  noiseFloorDbfs: number;
  /** Proporción de ventanas de 50 ms por debajo de −60 dBFS (0..1). */
  silenceRatio: number;
  /** RMS medio de las ventanas "tranquilas" (dBFS). */
  quietRmsDbfs: number;

  /* --- tiempo / ritmo --- */
  bpm: number;
  bpmConfidence: number;
  onsetDensity: number;
  /** Coeficiente de variación de intervalos entre ataques. */
  ioiCv: number;
  /** Desviación de los ataques respecto a la rejilla ideal (ms). 0 = cuantizado. */
  transientJitterMs: number;
  /** Concentración de fase de los ataques en la rejilla (0..1). 1 = perfecto. */
  gridLock: number;
  /** Variación de intensidad de los ataques (0 = todos iguales). */
  velocityVariation: number;
  /** Regularidad global derivada de jitter + gridLock (0..1). */
  regularity: number;

  /* --- estéreo --- */
  correlation: number;
  width: number;
  balance: number;
  /** Diferencia de nivel entre canales (dB). */
  channelLevelDiffDb: number;
  /** Correlación de la señal aguda (>6 kHz aprox.). 1 = canales idénticos. */
  hfDecorrelation: number;

  /* --- tonal --- */
  key: string;
  keyConfidence: number;
  /** Entropía normalizada del croma (0..1). Alto = cromáticamente rico. */
  chromaEntropy: number;

  /* --- visualización --- */
  waveform: { peaks: number[]; rms: number[] };
  spectrogram: { bands: number; frames: number[] };
  sections: Section[];
  hook: { start: number; end: number };
}

export interface ExtractOptions {
  onProgress?: (pct: number, stage: string) => void;
  fftSize?: number;
  hopSize?: number;
}

export interface DecodedTrackLike {
  name: string;
  size: number;
  mime: string;
  duration: number;
  sampleRate: number;
  channels: Float32Array[];
  numberOfChannels: number;
}

/* ----------------------------- utilidades ------------------------------- */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const db = (v: number) => 20 * Math.log10(Math.max(v, 1e-12));
const KEY_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
/** Perfiles de Krumhansl-Kessler para estimación de tonalidad. */
const KRUMHANSL_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KRUMHANSL_MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function percentile(sorted: Float64Array | number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)));
  return sorted[idx];
}

function stdDev(values: number[], mean?: number): number {
  if (values.length < 2) return 0;
  const m = mean ?? values.reduce((a, b) => a + b, 0) / values.length;
  let acc = 0;
  for (const v of values) acc += (v - m) * (v - m);
  return Math.sqrt(acc / values.length);
}

/** Cuenta ataques a partir de una envolvente de flujo espectral. */
export function detectOnsets(
  flux: Float32Array,
  frameRate: number,
): { times: number[]; strengths: number[] } {
  const n = flux.length;
  if (n < 8) return { times: [], strengths: [] };

  // Umbral adaptativo: media + 1σ. La versión basada solo en mediana y MAD se
  // colapsa cuando la mayoría de tramas no tienen flujo (umbral ≈ 0 y se
  // detectan ataques espurios en cada trama).
  const meanFlux = flux.reduce((a, b) => a + b, 0) / n;
  const sdFlux = stdDev(Array.from(flux), meanFlux);
  const threshold = meanFlux + sdFlux * 1.0;
  const minGap = Math.max(2, Math.round(frameRate * 0.06)); // 60 ms
  const times: number[] = [];
  const strengths: number[] = [];
  let last = -minGap;
  for (let i = 1; i < n - 1; i++) {
    const v = flux[i];
    if (v > threshold && v >= flux[i - 1] && v >= flux[i + 1] && i - last >= minGap) {
      // Interpolación parabólica: precisión sub-trama (clave para el microtiming).
      const a = flux[i - 1];
      const b = v;
      const c = flux[i + 1];
      const denom = a - 2 * b + c;
      const delta = denom !== 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / denom)) : 0;
      times.push((i + delta) / frameRate);
      strengths.push(v);
      last = i;
    }
  }
  return { times, strengths };
}

/**
 * Estimación de tempo a partir de los intervalos entre ataques (IOI) validados
 * con la autocorrelación de la envolvente.
 *
 * Se parte del IOI mediano —estable y libre del error de octava de la
 * autocorrelación pura— y se eligen entre sus múltiplos y submúltiplos
 * (×1, ×2, ÷2, ×2/3, ×3/2) con una preferencia perceptual por 90–170 BPM.
 *
 * Antes: un click-track de 128 BPM se reportaba como 85 BPM.
 */
export function estimateBpm(
  onsetEnv: Float32Array,
  frameRate: number,
  onsetTimes: number[],
): { bpm: number; confidence: number } {
  const n = onsetEnv.length;
  if (n < 16) return { bpm: 0, confidence: 0 };

  // Autocorrelación de la envolvente (se usa como validador de candidatos).
  const mean = onsetEnv.reduce((a, b) => a + b, 0) / n;
  const centred = new Float32Array(n);
  for (let i = 0; i < n; i++) centred[i] = onsetEnv[i] - mean;
  const maxLag = Math.min(n - 4, Math.round(frameRate * 2));
  const minLag = Math.max(2, Math.round((frameRate * 60) / 220));
  const corr = new Float64Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let num = 0;
    let e1 = 0;
    let e2 = 0;
    for (let i = 0; i + lag < n; i++) {
      num += centred[i] * centred[i + lag];
      e1 += centred[i] * centred[i];
      e2 += centred[i + lag] * centred[i + lag];
    }
    corr[lag] = num / Math.sqrt(Math.max(e1 * e2, 1e-12));
  }
  const corrAt = (bpm: number) => {
    const lag = Math.round((60 * frameRate) / bpm);
    if (lag < minLag || lag > maxLag) return 0;
    const c0 = corr[lag] ?? 0;
    const cPrev = lag > minLag ? (corr[lag - 1] ?? 0) : 0;
    const cNext = lag < maxLag ? (corr[lag + 1] ?? 0) : 0;
    return Math.max(c0, cPrev, cNext);
  };

  // Periodo base por intervalo mediano entre ataques.
  const iois: number[] = [];
  for (let i = 1; i < onsetTimes.length; i++) {
    const d = onsetTimes[i] - onsetTimes[i - 1];
    if (d > 0.12 && d < 3) iois.push(d);
  }
  let baseBpm = 0;
  if (iois.length >= 4) {
    const sorted = iois.slice().sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)];
    baseBpm = 60 / med;
  }

  // Pico principal de autocorrelación (clave en música real con síncopa donde
  // los IOIs individuales mezclan corcheas, semicorcheas y contratiempos).
  let bestLag = minLag;
  for (let lag = minLag; lag <= maxLag; lag++) {
    if (corr[lag] > corr[bestLag]) bestLag = lag;
  }
  const acBpm = (60 * frameRate) / bestLag;
  if (!baseBpm) baseBpm = acBpm;

  // Preferencia perceptual log-normal centrada en 120 BPM.
  const prior = (bpm: number) => Math.exp(-0.5 * (Math.log2(Math.max(bpm, 1) / 120) / 0.85) ** 2);

  const candidates: { bpm: number; score: number; corr: number }[] = [];
  const seeds = acBpm > 0 && Math.abs(acBpm - baseBpm) > 2 ? [baseBpm, acBpm] : [baseBpm];
  for (const seed of seeds) {
    for (const mult of [1 / 2, 2 / 3, 1, 3 / 2, 2]) {
      const bpm = seed * mult;
      if (bpm < 45 || bpm > 210) continue;
      const c = corrAt(bpm);
      candidates.push({ bpm, score: c * prior(bpm), corr: c });
    }
    candidates.push({ bpm: seed, score: corrAt(seed) * prior(seed), corr: corrAt(seed) });
  }

  candidates.sort((a, b) => b.score - a.score);
  const winner = candidates[0];
  return { bpm: winner.bpm, confidence: clamp01(Math.max(winner.corr, 0.2) * 1.15) };
}

/**
 * Refina el instante de cada ataque en el dominio del tiempo.
 *
 * La detección por flujo espectral está cuantizada al salto de trama
 * (11,6 ms con hop 512), y ese error en diente de sierra impedía medir
 * microtiming real. Aquí se busca el inicio del ataque con resolución de
 * milisegundos sobre la envolvente RMS del canal principal.
 */
export function refineOnsets(
  mono: Float32Array,
  times: number[],
  sampleRate: number,
): number[] {
  const binMs = 0.0005; // 0,5 ms
  const win = Math.max(4, Math.round(sampleRate * binMs));
  const before = 0.012;
  const after = 0.06;
  const refined: number[] = [];

  for (const t of times) {
    const start = Math.max(0, Math.floor((t - before) * sampleRate));
    const end = Math.min(mono.length, Math.floor((t + after) * sampleRate));
    const bins = Math.floor((end - start) / win);
    if (bins < 6) {
      refined.push(t);
      continue;
    }
    const env = new Float64Array(bins);
    for (let b = 0; b < bins; b++) {
      let acc = 0;
      const s = start + b * win;
      for (let i = 0; i < win; i++) {
        const v = mono[s + i];
        acc += v * v;
      }
      env[b] = Math.sqrt(acc / win);
    }
    // Estrategia en dos pasos: (1) detectar la primera subida significativa
    // respecto al nivel previo, (2) afinar con la pendiente máxima en su
    // entorno. Así no se engancha a un evento posterior dentro de la ventana.
    const baseCount = Math.max(2, Math.floor(bins * 0.2));
    const baselineSorted = Array.from(env.slice(0, baseCount)).sort((a, b) => a - b);
    const baseline = baselineSorted[Math.floor(baselineSorted.length / 2)];
    let peak = 0;
    for (let b = 0; b < bins; b++) if (env[b] > peak) peak = env[b];
    const riseThreshold = baseline + (peak - baseline) * 0.25;

    let riseBin = -1;
    for (let b = 1; b < bins; b++) {
      if (env[b] >= riseThreshold) {
        riseBin = b;
        break;
      }
    }
    if (riseBin <= 0 || peak <= baseline) {
      refined.push(t);
      continue;
    }

    let bestBin = riseBin;
    let bestSlope = 0;
    const from = Math.max(1, riseBin - 6);
    const to = Math.min(bins - 1, riseBin + 6);
    for (let b = from; b <= to; b++) {
      const slope = env[b] - env[b - 1];
      if (slope > bestSlope) {
        bestSlope = slope;
        bestBin = b;
      }
    }
    const refinedTime = (start + (bestBin - 0.5) * win) / sampleRate;
    // Salvaguarda: si el refinado se aleja demasiado, se conserva el original.
    refined.push(Math.abs(refinedTime - t) > 0.08 ? t : refinedTime);
  }
  return refined;
}

/**
 * Mide cuantización y microtiming a partir de los intervalos entre ataques.
 *
 * En lugar de ajustar una rejilla global con fase (que acumula deriva y hace
 * parecer "humano" un patrón perfecto), se mide la dispersión **local** de cada
 * IOI respecto al múltiplo más cercano del IOI mediano. Es inmune a la deriva
 * de tempo y al error de cuantización de trama.
 *
 * `jitterMs` alto y `gridLock` bajo = microtiming humano.
 */
export function measureGrid(
  times: number[],
  strengths: number[],
  bpm: number,
): { jitterMs: number; gridLock: number; velocityVariation: number } {
  void bpm;
  const empty = { jitterMs: 0, gridLock: 0, velocityVariation: 0 };
  if (times.length < 6) return empty;

  const iois: number[] = [];
  for (let i = 1; i < times.length; i++) {
    const d = times[i] - times[i - 1];
    if (d > 0.05 && d < 2) iois.push(d);
  }
  if (iois.length < 4) return empty;

  const sortedIoi = iois.slice().sort((a, b) => a - b);
  const medianIoi = sortedIoi[Math.floor(sortedIoi.length / 2)];
  if (!(medianIoi > 0)) return empty;

  // Residuo mediano (no medio): unos pocos ataques mal refinados no deben
  // dominar la medida de cuantización de todo el track.
  const residuals: number[] = [];
  for (const d of iois) {
    const ratio = d / medianIoi;
    residuals.push(Math.abs(ratio - Math.round(ratio)));
  }
  residuals.sort((a, b) => a - b);
  const medianResidual = residuals[Math.floor(residuals.length / 2)] ?? 0;
  const jitterMs = medianResidual * medianIoi * 1000;
  // 0 % de residuo = rejilla perfecta; 5 % o más = interpretación libre.
  const gridLock = clamp01(1 - medianResidual / 0.05);

  // Variación de intensidad sobre los ataques fuertes: aísla el instrumento
  // principal en lugar de mezclar bombo y charles.
  const sortedStrengths = strengths.slice().sort((a, b) => a - b);
  const medianStrength = sortedStrengths[Math.floor(sortedStrengths.length / 2)] ?? 0;
  const loud = strengths.filter((s) => s >= medianStrength);
  const loudMean = loud.reduce((a, b) => a + b, 0) / Math.max(loud.length, 1);
  const velocityVariation = loudMean > 0 ? clamp01(stdDev(loud, loudMean) / loudMean) : 0;

  return { jitterMs, gridLock, velocityVariation };
}

/** Estima tonalidad por correlación de croma con perfiles de Krumhansl. */
export function computeKey(chroma: Float32Array): { key: string; confidence: number; entropy: number } {
  const total = chroma.reduce((a, b) => a + b, 0);
  let entropy = 0;
  if (total > 0) {
    for (let i = 0; i < 12; i++) {
      const p = chroma[i] / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    entropy = entropy / Math.log2(12);
  }

  let best = { key: "C Major", score: -Infinity };
  for (let root = 0; root < 12; root++) {
    for (const [profile, mode] of [
      [KRUMHANSL_MAJOR, "Major"],
      [KRUMHANSL_MINOR, "Minor"],
    ] as const) {
      let num = 0;
      let d1 = 0;
      let d2 = 0;
      for (let i = 0; i < 12; i++) {
        const c = chroma[(i + root) % 12];
        const p = profile[i];
        num += c * p;
        d1 += c * c;
        d2 += p * p;
      }
      const score = num / Math.sqrt(Math.max(d1 * d2, 1e-12));
      if (score > best.score) best = { key: `${KEY_NAMES[root]} ${mode}`, score };
    }
  }
  return { key: best.key, confidence: clamp01((best.score - 0.5) * 1.6), entropy: clamp01(entropy) };
}

/* --------------------------- extracción -------------------------------- */

/**
 * Extrae el vector completo de características de un audio decodificado.
 * Una sola pasada STFT con buffers reutilizados.
 */
export async function extractFeatures(
  track: DecodedTrackLike,
  options: ExtractOptions = {},
): Promise<AudioFeatures> {
  const { channels, sampleRate: fs, duration } = track;
  const mono = channels[0];
  const n = mono.length;
  const report = options.onProgress ?? (() => undefined);

  const size = options.fftSize ?? 2048;
  const hop = options.hopSize ?? 512;
  const fft = new FFT(size);
  const bins = size >> 1;
  const binHz = fs / size;
  const frames = Math.max(1, Math.floor((n - size) / hop) + 1);
  const frameRate = fs / hop;

  const mags = new Float32Array(bins);
  const avgSpectrum = new Float64Array(bins);
  const chroma = new Float32Array(12);
  const bandEnergy = new Float64Array(BANDS.length);

  const centroidArr = new Float64Array(frames);
  const flatnessArr = new Float64Array(frames);
  const fluxArr = new Float64Array(frames);
  const zcrArr = new Float64Array(frames);
  const rolloffArr = new Float64Array(frames);

  // ventanas de 50 ms para piso de ruido
  const quietWin = Math.round(fs * 0.05);
  const quietCount = Math.max(1, Math.floor(n / quietWin));
  const quietRms = new Float64Array(quietCount);

  const logBands = 72;
  const logEdges: number[] = [];
  for (let i = 0; i <= logBands; i++) logEdges.push(20 * 1000 ** (i / logBands));
  const spectroRows: number[][] = [];
  const spectroEvery = Math.max(1, Math.floor(frames / 420));
  const specMaxRef = { value: 1e-12 };

  let peak = 0;
  let clipCount = 0;
  let dcSum = 0;
  let rmsSum = 0;
  let hfEnergy16 = 0;
  let hfEnergy10to16 = 0;
  let totalEnergy = 0;
  const prevBuffer = new Float32Array(bins);

  // --- estéreo ---
  const isMono = channels.length < 2;
  let sLR = 0;
  let sLL = 0;
  let sRR = 0;
  let sMid = 0;
  let sSide = 0;
  let hfLR = 0;
  let hfLL = 0;
  let hfRR = 0;
  let levelL = 0;
  let levelR = 0;

  const L = channels[0];
  const R = channels[1];

  report(4, "Preparando señal");
  const updateEvery = Math.max(1, Math.floor(frames / 32));
  let lastReport = -updateEvery;

  for (let f = 0; f < frames; f++) {
    const start = f * hop;
    const frame = mono.subarray(start, start + size);
    fft.magnitudesInto(frame as Float32Array, mags);

    // --- descriptores espectrales por trama ---
    let num = 0;
    let den = 0;
    let logSum = 0;
    for (let b = 1; b < bins; b++) {
      const m = mags[b];
      const hz = b * binHz;
      num += hz * m;
      den += m;
      logSum += Math.log(m + 1e-12);
      avgSpectrum[b] += m;
    }
    const centroid = den > 0 ? num / den : 0;
    centroidArr[f] = centroid;

    const meanMag = den / (bins - 1);
    const geoMag = Math.exp(logSum / (bins - 1));
    flatnessArr[f] = meanMag > 0 ? geoMag / meanMag : 0;

    // rolloff 85 %
    let acc = 0;
    const target = den * 0.85;
    let rolloff = 0;
    for (let b = 1; b < bins; b++) {
      acc += mags[b];
      if (acc >= target) {
        rolloff = b * binHz;
        break;
      }
    }
    rolloffArr[f] = rolloff;

    // flujo espectral (solo crecimiento positivo), en escala absoluta
    if (f > 0) {
      let s = 0;
      for (let b = 1; b < bins; b++) {
        const d = mags[b] - prevBuffer[b];
        if (d > 0) s += d;
      }
      fluxArr[f] = s / bins;
    }
    prevBuffer.set(mags);

    // bandas + extremos de alta frecuencia
    for (let bi = 0; bi < BANDS.length; bi++) {
      const band = BANDS[bi];
      const lo = Math.max(1, Math.floor(band.low / binHz));
      const hi = Math.min(bins - 1, Math.ceil(band.high / binHz));
      let e = 0;
      for (let b = lo; b <= hi; b++) e += mags[b] * mags[b];
      bandEnergy[bi] += e;
      totalEnergy += e;
      if (band.low >= 12000) hfEnergy16 += e;
      if (band.low >= 6000 && band.high <= 12000) hfEnergy10to16 += e;
    }

    // croma (60 Hz – 2200 Hz): picos armónicos con interpolación parabólica y
    // ponderación hacia fundamentales, atenuando tramas ruidosas (percusión).
    const frameWeight = flatnessArr[f] < 0.35 ? 1 : 0.15;
    for (let b = 2; b < bins - 1; b++) {
      const hzBase = b * binHz;
      if (hzBase < 60 || hzBase > 2200) continue;
      const m = mags[b];
      if (m < mags[b - 1] || m < mags[b + 1]) continue;
      const a = mags[b - 1];
      const c = mags[b + 1];
      const denom = a - 2 * m + c;
      const delta = denom !== 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / denom)) : 0;
      const hz = (b + delta) * binHz;
      const midi = 69 + 12 * Math.log2(hz / 440);
      const pc = ((Math.round(midi) % 12) + 12) % 12;
      const freqWeight = 1 / Math.sqrt(Math.max(1, hz / 110));
      chroma[pc] += m * m * freqWeight * frameWeight;
    }

    // ZCR
    let zc = 0;
    let prev = frame[0];
    for (let i = 1; i < size; i++) {
      const v = frame[i];
      if (v * prev < 0) zc++;
      prev = v;
    }
    zcrArr[f] = zc / size;

    // RMS de trama y pico/DC/clipping
    let sumSq = 0;
    for (let i = 0; i < size; i++) {
      const v = frame[i];
      sumSq += v * v;
      const a = v < 0 ? -v : v;
      if (a > peak) peak = a;
      if (a > 0.999) clipCount++;
      dcSum += v;
    }
    rmsSum += Math.sqrt(sumSq / size);

    if (f % spectroEvery === 0) {
      const row: number[] = [];
      for (let i = 0; i < logBands; i++) {
        const lo = Math.max(1, Math.floor(logEdges[i] / binHz));
        const hi = Math.max(lo + 1, Math.min(bins - 1, Math.ceil(logEdges[i + 1] / binHz)));
        let e = 0;
        for (let b = lo; b <= hi; b++) e += mags[b] * mags[b];
        const v = Math.sqrt(e / (hi - lo + 1));
        if (v > specMaxRef.value) specMaxRef.value = v;
        row.push(v);
      }
      spectroRows.push(row);
    }

    if (f - lastReport >= updateEvery) {
      lastReport = f;
      report(6 + (f / frames) * 58, "Midiendo espectro y transitorios");
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  // --- ventanas de 50 ms (piso de ruido / silencio) ---
  report(66, "Midiendo piso de ruido");
  for (let w = 0; w < quietCount; w++) {
    const s = w * quietWin;
    const e = Math.min(n, s + quietWin);
    let acc = 0;
    for (let i = s; i < e; i++) acc += mono[i] * mono[i];
    quietRms[w] = Math.sqrt(acc / Math.max(1, e - s));
  }
  const quietSorted = Array.from(quietRms).sort((a, b) => a - b);
  const p5 = percentile(quietSorted, 0.05);
  const noiseFloorDbfs = db(p5);
  let silent = 0;
  let quietSum = 0;
  let quietN = 0;
  const silenceThreshold = 10 ** (-60 / 20);
  for (const v of quietRms) {
    if (v < silenceThreshold) silent++;
    else if (v < 0.05) {
      quietSum += v;
      quietN++;
    }
  }
  const silenceRatio = quietCount > 0 ? silent / quietCount : 0;
  const quietRmsDbfs = db(quietN > 0 ? quietSum / quietN : p5);
  await new Promise((r) => setTimeout(r, 0));

  // --- estéreo ---
  report(72, "Analizando imagen estéreo");
  let correlation = 1;
  let width = 0;
  let balance = 0;
  let channelLevelDiffDb = 0;
  let hfDecorrelation = 0;
  if (!isMono) {
    const step = Math.max(1, Math.floor(L.length / 400000));
    for (let i = 1; i < L.length; i += step) {
      const l = L[i];
      const r = R[i];
      sLR += l * r;
      sLL += l * l;
      sRR += r * r;
      const m = (l + r) / 2;
      const sd = (l - r) / 2;
      sMid += m * m;
      sSide += sd * sd;
      levelL += l * l;
      levelR += r * r;
      // aproximación paso-alto por diferencia de muestras: aísla agudos
      const dl = l - L[i - 1];
      const dr = r - R[i - 1];
      hfLR += dl * dr;
      hfLL += dl * dl;
      hfRR += dr * dr;
    }
    correlation = sLR / Math.sqrt(Math.max(sLL * sRR, 1e-12));
    width = Math.sqrt(sSide / Math.max(sMid, 1e-12));
    balance = (sLL - sRR) / Math.max(sLL + sRR, 1e-12);
    channelLevelDiffDb = Math.abs(db(Math.sqrt(levelL)) - db(Math.sqrt(levelR)));
    hfDecorrelation = hfLR / Math.sqrt(Math.max(hfLL * hfRR, 1e-12));
  }
  await new Promise((r) => setTimeout(r, 0));

  // --- loudness ---
  report(78, "Loudness ITU-R BS.1770");
  const loud = measureLoudness(channels, fs);
  const truePeakDbtp = truePeakDb(channels);
  const rmsTotal = rmsSum / Math.max(frames, 1);
  const crestDb = db(peak) - db(rmsTotal);
  const plr = truePeakDbtp - loud.integratedLufs;
  const dcOffset = dcSum / Math.max(frames * size, 1);
  const clippingSamples = clipCount;

  // --- agregados espectrales ---
  report(84, "Consolidando características");
  const centroids: number[] = Array.from(centroidArr);
  const flatnesses: number[] = Array.from(flatnessArr);
  const flux: number[] = Array.from(fluxArr);
  const centroidMean = centroids.reduce((a, b) => a + b, 0) / frames;
  const centroidStd = stdDev(centroids, centroidMean);
  const flatnessMean = flatnesses.reduce((a, b) => a + b, 0) / frames;
  const flatnessStd = stdDev(flatnesses, flatnessMean);
  const rolloff85 = Array.from(rolloffArr).reduce((a, b) => a + b, 0) / frames;
  const fluxMean = flux.reduce((a, b) => a + b, 0) / frames;
  const fluxStd = stdDev(flux, fluxMean);
  const fluxCv = fluxMean > 1e-9 ? fluxStd / fluxMean : 0;
  const zcrMean = Array.from(zcrArr).reduce((a, b) => a + b, 0) / frames;

  // --- borde espectral por bandas de 1/3 de octava ---
  // Comparar bins sueltos contra el pico absoluto es frágil: en una mezcla real
  // el pico está en graves y los agudos quedan 40–60 dB por debajo. Se suaviza
  // por bandas y se busca la banda más alta dentro de 55 dB del máximo.
  let maxSpec = 0;
  for (let b = 1; b < bins; b++) {
    const v = avgSpectrum[b];
    if (v > maxSpec) maxSpec = v;
  }
  const thirdOctave: { center: number; energy: number; db: number }[] = [];
  for (let center = 25; center < 20000; center *= 2 ** (1 / 3)) {
    const lo = Math.max(1, Math.floor((center * 2 ** (-1 / 6)) / binHz));
    const hi = Math.min(bins - 1, Math.ceil((center * 2 ** (1 / 6)) / binHz));
    if (hi <= lo) continue;
    let e = 0;
    for (let b = lo; b <= hi; b++) e += avgSpectrum[b] * avgSpectrum[b];
    thirdOctave.push({ center, energy: e, db: 10 * Math.log10(Math.max(e, 1e-18)) });
  }
  const maxBandDb = thirdOctave.reduce((m, x) => Math.max(m, x.db), -Infinity);
  let spectralEdgeHz = 0;
  for (let i = thirdOctave.length - 1; i >= 0; i--) {
    if (thirdOctave[i].db >= maxBandDb - 55) {
      spectralEdgeHz = thirdOctave[i].center;
      break;
    }
  }
  // pendiente por regresión lineal de dB vs log2(f) en 8–16 kHz
  let sx = 0;
  let sy = 0;
  let sxy = 0;
  let sxx = 0;
  let cnt = 0;
  for (let b = 1; b < bins; b++) {
    const hz = b * binHz;
    if (hz < 8000 || hz > 16000) continue;
    const x = Math.log2(hz);
    const y = 20 * Math.log10(Math.max(avgSpectrum[b], 1e-15) / Math.max(maxSpec, 1e-15));
    sx += x;
    sy += y;
    sxy += x * y;
    sxx += x * x;
    cnt++;
  }
  const hfSlopeDbOct = cnt > 2 ? (cnt * sxy - sx * sy) / Math.max(cnt * sxx - sx * sx, 1e-12) : 0;
  const hfAbove16kRatio = totalEnergy > 0 ? hfEnergy16 / totalEnergy : 0;
  const airRatio = totalEnergy > 0 ? hfEnergy10to16 / totalEnergy : 0;
  const totalBand = bandEnergy.reduce((a, b) => a + b, 0) || 1;
  const bandDb = Array.from(bandEnergy).map((e) => 10 * Math.log10(Math.max(e / totalBand, 1e-9)));

  // --- ritmo ---
  report(90, "Estimando tempo y microtiming");
  const onsetEnv = new Float32Array(Math.max(1, frames - 2));
  for (let f = 1; f < frames - 1; f++) {
    onsetEnv[f - 1] = Math.max(0, fluxArr[f] - 0.5 * (fluxArr[f - 1] + fluxArr[f + 1]));
  }
  const rawOnsets = detectOnsets(onsetEnv, frameRate);
  const onsetTimes = refineOnsets(mono, rawOnsets.times, fs);
  const strengths = rawOnsets.strengths;
  const { bpm, confidence: bpmConfidence } = estimateBpm(onsetEnv, frameRate, onsetTimes);
  const { jitterMs, gridLock, velocityVariation } = measureGrid(onsetTimes, strengths, bpm);

  const iois: number[] = [];
  for (let i = 1; i < onsetTimes.length; i++) iois.push(onsetTimes[i] - onsetTimes[i - 1]);
  const ioiMean = iois.length ? iois.reduce((a, b) => a + b, 0) / iois.length : 0;
  const ioiCv = ioiMean > 0 ? stdDev(iois, ioiMean) / ioiMean : 0;
  const onsetDensity = onsetTimes.length / Math.max(1, duration);

  // Regularidad: rejilla ajustada y jitter pequeño ⇒ alta.
  const jitterScore = clamp01(1 - jitterMs / 12);
  const regularity = clamp01(gridLock * 0.55 + jitterScore * 0.3 + (1 - clamp01(velocityVariation)) * 0.15);

  // --- tonalidad ---
  const { key, confidence: keyConfidence, entropy: chromaEntropy } = computeKey(chroma);

  // --- secciones y hook ---
  report(94, "Detectando estructura");
  // Energía real por ventana de 50 ms (misma base que el piso de ruido).
  const windowSec = 2;
  const novelty: { t: number; v: number; e: number }[] = [];
  const fps = fs / hop;
  const winMs = quietWin / fs; // 0.05 s
  const energyAt = (fromSec: number, toSec: number): number => {
    const a = Math.max(0, Math.floor(fromSec / winMs));
    const b = Math.min(quietCount, Math.ceil(toSec / winMs));
    if (b <= a) return 0;
    let acc = 0;
    for (let w = a; w < b; w++) acc += quietRms[w] * quietRms[w];
    return Math.sqrt(acc / (b - a));
  };
  for (let t = 0; t < Math.max(1, duration - windowSec); t += 1) {
    const a = Math.floor(t * fps);
    const b = Math.min(frames, Math.floor((t + windowSec) * fps));
    let fsum = 0;
    let count = 0;
    for (let f = a; f < b; f++) {
      fsum += fluxArr[f];
      count++;
    }
    novelty.push({
      t,
      v: fsum / Math.max(count, 1),
      e: Math.max(energyAt(t, t + windowSec), 1e-6),
    });
  }
  const novMean = novelty.reduce((a, b) => a + b.v, 0) / Math.max(1, novelty.length);
  const novStd = stdDev(novelty.map((x) => x.v), novMean);
  const boundaries: number[] = [0];
  for (let i = 2; i < novelty.length - 2; i++) {
    const v = novelty[i].v;
    if (v > novMean + novStd * 1.4 && v >= novelty[i - 1].v && v >= novelty[i + 1].v) {
      const t = novelty[i].t;
      if (t - boundaries[boundaries.length - 1] > Math.max(6, duration * 0.08)) boundaries.push(t);
    }
  }
  boundaries.push(Math.round(duration));
  const maxEnergy = Math.max(...novelty.map((x) => x.e), 1e-9);
  const sections: Section[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const s = boundaries[i];
    const e = boundaries[i + 1];
    const inside = novelty.filter((x) => x.t >= s && x.t < e);
    const energy = inside.length ? inside.reduce((a, b) => a + b.e, 0) / inside.length / maxEnergy : 0;
    const label =
      i === 0
        ? "Intro"
        : energy > 0.72
          ? "Drop / Coro"
          : energy > 0.45
            ? "Verso"
            : i === boundaries.length - 2
              ? "Outro"
              : "Puente";
    sections.push({ start: Math.round(s), end: Math.round(e), label, energy });
  }

  let hookStart = 0;
  let hookScore = -1;
  const hookWin = Math.min(18, Math.max(6, duration * 0.2));
  for (let t = 0; t < Math.max(0.1, duration - hookWin); t += 1) {
    const inside = novelty.filter((x) => x.t >= t && x.t < t + hookWin);
    const score = inside.length ? inside.reduce((a, b) => a + b.e * (1 + b.v), 0) / inside.length : 0;
    if (score > hookScore) {
      hookScore = score;
      hookStart = t;
    }
  }
  const hook = {
    start: Math.round(hookStart),
    end: Math.round(Math.min(duration, hookStart + hookWin)),
  };

  // --- visualización ---
  report(97, "Preparando gráficos");
  const waveform = downsamplePeaks(channels, 900);
  const specMax = specMaxRef.value;
  const flatSpec = spectroRows.flat().map((v) => Math.round(Math.min(255, (v / specMax) * 255)));

  report(100, "Listo");

  return {
    durationSec: duration,
    sampleRate: fs,
    channelCount: channels.length,
    isMono,
    centroidMean,
    centroidStd,
    flatnessMean,
    flatnessStd,
    rolloff85,
    fluxCv,
    zcrMean,
    spectralEdgeHz,
    hfSlopeDbOct,
    hfAbove16kRatio,
    airRatio,
    bandDb,
    lufs: loud.integratedLufs,
    truePeakDbtp,
    lra: loud.loudnessRange,
    crestDb,
    plr,
    peakDb: db(peak),
    rmsDb: db(rmsTotal),
    dcOffset,
    clippingSamples,
    noiseFloorDbfs,
    silenceRatio,
    quietRmsDbfs,
    bpm,
    bpmConfidence,
    onsetDensity,
    ioiCv,
    transientJitterMs: jitterMs,
    gridLock,
    velocityVariation,
    regularity,
    correlation,
    width,
    balance,
    channelLevelDiffDb,
    hfDecorrelation,
    key,
    keyConfidence,
    chromaEntropy,
    waveform,
    spectrogram: { bands: logBands, frames: flatSpec },
    sections,
    hook,
  };
}

/* --------------------------- helpers internos --------------------------- */

function downsamplePeaks(channels: Float32Array[], count: number) {
  const ch = channels[0];
  const len = ch.length;
  const block = Math.max(1, Math.floor(len / count));
  const peaks: number[] = [];
  const rms: number[] = [];
  for (let i = 0; i < count; i++) {
    const start = i * block;
    const end = Math.min(len, start + block);
    let p = 0;
    let sum = 0;
    for (let j = start; j < end; j++) {
      const v = Math.abs(ch[j]);
      if (v > p) p = v;
      sum += ch[j] * ch[j];
    }
    peaks.push(Math.round(p * 1000) / 1000);
    rms.push(Math.round(Math.sqrt(sum / Math.max(1, end - start)) * 1000) / 1000);
  }
  return { peaks, rms };
}

/** Deja el tipo `SpectrogramLike` explícito para consumidores. */
export type SpectrogramPayload = AudioFeatures["spectrogram"];
