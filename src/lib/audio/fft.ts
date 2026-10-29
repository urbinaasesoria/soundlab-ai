/**
 * FFT radix-2 iterativa con ventana Hann.
 *
 * Optimizada para análisis por lotes: `magnitudesInto` reutiliza buffers y evita
 * la asignación de memoria por trama (antes: 3 arrays × 20 000 tramas ≈ 400 MB
 * de basura para un track de 4 minutos).
 */
export class FFT {
  readonly size: number;
  private cosTable: Float32Array;
  private sinTable: Float32Array;
  private reverse: Uint32Array;
  readonly window: Float32Array;
  /** Buffers de trabajo reutilizables. */
  private scratchRe: Float32Array;
  private scratchIm: Float32Array;

  constructor(size = 2048) {
    if ((size & (size - 1)) !== 0) throw new Error("FFT size must be power of two");
    this.size = size;
    const half = size >> 1;
    this.cosTable = new Float32Array(half);
    this.sinTable = new Float32Array(half);
    for (let i = 0; i < half; i++) {
      this.cosTable[i] = Math.cos((-2 * Math.PI * i) / size);
      this.sinTable[i] = Math.sin((-2 * Math.PI * i) / size);
    }
    this.reverse = new Uint32Array(size);
    const bits = Math.log2(size) | 0;
    for (let i = 0; i < size; i++) {
      let r = 0;
      for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
      this.reverse[i] = r;
    }
    this.window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      this.window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
    }
    this.scratchRe = new Float32Array(size);
    this.scratchIm = new Float32Array(size);
  }

  /** Transforma in-place un buffer de tamaño `size` (parte real en re, imaginaria en im). */
  transform(re: Float32Array, im: Float32Array): void {
    const n = this.size;
    for (let i = 0; i < n; i++) {
      const j = this.reverse[i];
      if (j > i) {
        let t = re[i];
        re[i] = re[j];
        re[j] = t;
        t = im[i];
        im[i] = im[j];
        im[j] = t;
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const half = len >> 1;
      const step = n / len;
      for (let i = 0; i < n; i += len) {
        for (let k = 0; k < half; k++) {
          const tw = k * step;
          const c = this.cosTable[tw];
          const s = this.sinTable[tw];
          const a = i + k;
          const b = a + half;
          const tr = re[b] * c - im[b] * s;
          const ti = re[b] * s + im[b] * c;
          re[b] = re[a] - tr;
          im[b] = im[a] - ti;
          re[a] += tr;
          im[a] += ti;
        }
      }
    }
  }

  /**
   * Calcula magnitudes (size/2) sin asignar memoria nueva.
   * `mags` debe tener al menos `size/2` elementos y se reescribe.
   */
  magnitudesInto(frame: Float32Array, mags: Float32Array): Float32Array {
    const n = this.size;
    const re = this.scratchRe;
    const im = this.scratchIm;
    const w = this.window;
    for (let i = 0; i < n; i++) {
      re[i] = (frame[i] ?? 0) * w[i];
      im[i] = 0;
    }
    this.transform(re, im);
    const half = n >> 1;
    const scale = 1 / (n * 0.5);
    for (let i = 0; i < half; i++) mags[i] = Math.hypot(re[i], im[i]) * scale;
    return mags;
  }

  /** Compatibilidad: devuelve magnitudes en un array propio. */
  magnitudes(frame: Float32Array, out?: Float32Array): Float32Array {
    const mags = out ?? new Float32Array(this.size >> 1);
    return this.magnitudesInto(frame, mags);
  }
}

export const hannWindow = (size: number) => {
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
  return w;
};

export const hzToMel = (hz: number) => 2595 * Math.log10(1 + hz / 700);
export const melToHz = (mel: number) => 700 * (10 ** (mel / 2595) - 1);
