/**
 * Loudness según ITU-R BS.1770-4 (aproximación práctica):
 * K-weighting por biquads + gating absoluto/relativo, LUFS integrado,
 * LRA (EBU R128 simplificado) y pico real con interpolación Catmull-Rom.
 */

export interface Biquad {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

function highShelf(fs: number, f0: number, gainDb: number, q: number): Biquad {
  const A = 10 ** (gainDb / 40);
  const w0 = (2 * Math.PI * f0) / fs;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);
  const sqrtA = Math.sqrt(A);
  const a0 = (A + 1) - (A - 1) * cos + 2 * sqrtA * alpha;
  return {
    b0: (A * ((A + 1) + (A - 1) * cos + 2 * sqrtA * alpha)) / a0,
    b1: (-2 * A * ((A - 1) + (A + 1) * cos)) / a0,
    b2: (A * ((A + 1) + (A - 1) * cos - 2 * sqrtA * alpha)) / a0,
    a1: (2 * ((A - 1) - (A + 1) * cos)) / a0,
    a2: ((A + 1) - (A - 1) * cos - 2 * sqrtA * alpha) / a0,
  };
}

function highPass(fs: number, f0: number, q: number): Biquad {
  const w0 = (2 * Math.PI * f0) / fs;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);
  const a0 = 1 + alpha;
  return {
    b0: (1 + cos) / 2 / a0,
    b1: -(1 + cos) / a0,
    b2: (1 + cos) / 2 / a0,
    a1: (-2 * cos) / a0,
    a2: (1 - alpha) / a0,
  };
}

export function kWeighting(fs: number): [Biquad, Biquad] {
  return [
    highShelf(fs, 1681.974450955533, 3.999843853973347, 0.7071752369554196),
    highPass(fs, 38.13547087602444, 0.5003270373238773),
  ];
}

function applyBiquad(input: Float32Array, bq: Biquad): Float32Array {
  const out = new Float32Array(input.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x = input[i];
    const y = bq.b0 * x + bq.b1 * x1 + bq.b2 * x2 - bq.a1 * y1 - bq.a2 * y2;
    out[i] = y;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
  }
  return out;
}

export interface LoudnessResult {
  integratedLufs: number;
  loudnessRange: number;
  shortTermMax: number;
  shortTermMin: number;
}

/** Analiza loudness sobre canales ya a la frecuencia de muestreo del audio. */
export function measureLoudness(channels: Float32Array[], fs: number): LoudnessResult {
  const [shelf, hp] = kWeighting(fs);
  const weighted = channels.map((ch) => applyBiquad(applyBiquad(ch, shelf), hp));
  const block = Math.round(fs * 0.4);
  const hop = Math.round(fs * 0.1);
  const n = weighted[0]?.length ?? 0;
  if (!block || n < block) {
    return { integratedLufs: -Infinity, loudnessRange: 0, shortTermMax: -Infinity, shortTermMin: -Infinity };
  }

  const blockLoudness: number[] = [];
  const shortTerm: number[] = [];
  const shortBlock = Math.round(fs * 3);

  for (let start = 0; start + block <= n; start += hop) {
    let sum = 0;
    for (const ch of weighted) {
      let s = 0;
      for (let i = start; i < start + block; i++) s += ch[i] * ch[i];
      sum += s / block;
    }
    blockLoudness.push(-0.691 + 10 * Math.log10(Math.max(sum, 1e-12)));
  }

  // Short-term (3 s) para LRA
  const sh = Math.round(fs * 0.1);
  for (let start = 0; start + shortBlock <= n; start += sh) {
    let sum = 0;
    for (const ch of weighted) {
      let s = 0;
      for (let i = start; i < start + shortBlock; i++) s += ch[i] * ch[i];
      sum += s / shortBlock;
    }
    shortTerm.push(-0.691 + 10 * Math.log10(Math.max(sum, 1e-12)));
  }

  // Gating absoluto
  const absGated = blockLoudness.filter((v) => v > -70);
  if (!absGated.length) {
    return { integratedLufs: -Infinity, loudnessRange: 0, shortTermMax: -Infinity, shortTermMin: -Infinity };
  }
  const absMean = absGated.reduce((a, b) => a + 10 ** (b / 10), 0) / absGated.length;
  const relGate = -0.691 + 10 * Math.log10(absMean) - 10;
  const gated = absGated.filter((v) => v > relGate);
  const mean = gated.reduce((a, b) => a + 10 ** (b / 10), 0) / Math.max(gated.length, 1);
  const integrated = -0.691 + 10 * Math.log10(Math.max(mean, 1e-12));

  const sorted = shortTerm.slice().sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.1)] ?? integrated;
  const hi = sorted[Math.floor(sorted.length * 0.95)] ?? integrated;
  return {
    integratedLufs: integrated,
    loudnessRange: Math.max(0, hi - lo),
    shortTermMax: sorted[sorted.length - 1] ?? integrated,
    shortTermMin: sorted[0] ?? integrated,
  };
}

/** Pico real aproximado con interpolación Catmull-Rom a 4x. */
export function truePeakDb(channels: Float32Array[]): number {
  let peak = 0;
  for (const ch of channels) {
    const n = ch.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = i > 0 ? ch[i - 1] : ch[i];
      const p1 = ch[i];
      const p2 = ch[i + 1];
      const p3 = i + 2 < n ? ch[i + 2] : p2;
      let m = Math.abs(p1);
      for (let t = 0.25; t < 1; t += 0.25) {
        const t2 = t * t;
        const t3 = t2 * t;
        const v =
          0.5 *
          (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
        const av = Math.abs(v);
        if (av > m) m = av;
      }
      if (m > peak) peak = m;
    }
  }
  return 20 * Math.log10(Math.max(peak, 1e-9));
}

export function dbToGain(db: number): number {
  return 10 ** (db / 20);
}
