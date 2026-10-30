/* ============================================================
   WAV encoder + DSP del Humanizador y Coverizador
   Todo local, sin servidores. 24-bit PCM para no degradar el master.
   ============================================================ */

export interface HumanizeParams {
  /** 0–1 intensidad global */
  intensity: number;
  /** 0–1 deriva de velocidad (wow & flutter) */
  wow: number;
  /** 0–1 suelo de ruido analógico */
  noise: number;
  /** 0–1 saturación de cinta */
  saturation: number;
  /** 0–1 apertura estéreo */
  width: number;
  /** 0–1 aire por encima de 8 kHz */
  air: number;
  /** 0–1 realce de transitorios */
  transient: number;
}

export const DEFAULT_HUMANIZE: HumanizeParams = {
  intensity: 0.55,
  wow: 0.35,
  noise: 0.28,
  saturation: 0.3,
  width: 0.35,
  air: 0.3,
  transient: 0.35,
};

export type CoverStyle = "acustico" | "lofi" | "club";

export const COVER_STYLES: { id: CoverStyle; name: string; blurb: string }[] = [
  { id: "acustico", name: "Acústico", blurb: "Graves contenidos, medios presentes y aire suave." },
  { id: "lofi", name: "Lo-fi", blurb: "Cinta, wow & flutter y ruido de sala." },
  { id: "club", name: "Club", blurb: "Punch, subcontrolado y estéreo amplio." },
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* ------------------------- WAV ------------------------- */

function writeString(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}

export function encodeWav(channels: Float32Array[], sampleRate: number, bitDepth: 16 | 24 = 24): Blob {
  const numChannels = channels.length;
  const bytesPerSample = bitDepth / 8;
  const length = channels[0]?.length ?? 0;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  if (bitDepth === 24) {
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < numChannels; c++) {
        const s = clamp(channels[c][i] ?? 0, -1, 1);
        const v = Math.round(s < 0 ? s * 0x800000 : s * 0x7fffff);
        view.setUint8(offset, v & 0xff);
        view.setUint8(offset + 1, (v >> 8) & 0xff);
        view.setUint8(offset + 2, (v >> 16) & 0xff);
        offset += 3;
      }
    }
  } else {
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < numChannels; c++) {
        const s = clamp(channels[c][i] ?? 0, -1, 1);
        view.setInt16(offset, Math.round(s < 0 ? s * 0x8000 : s * 0x7fff), true);
        offset += 2;
      }
    }
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/* ---------------------- procesadores ---------------------- */

function makeNoise(seed: number) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967295) * 2 - 1;
  };
}

function peakOf(channels: Float32Array[]): number {
  let peak = 0;
  for (const ch of channels) {
    for (let i = 0; i < ch.length; i += 2) {
      const a = Math.abs(ch[i]);
      if (a > peak) peak = a;
    }
  }
  return peak;
}

function normalize(channels: Float32Array[], ceilingDb = -1) {
  const peak = peakOf(channels);
  const target = 10 ** (ceilingDb / 20);
  if (peak <= 0) return;
  const gain = Math.min(1.6, target / peak);
  if (Math.abs(gain - 1) < 0.005) return;
  for (const ch of channels) {
    for (let i = 0; i < ch.length; i++) ch[i] *= gain;
  }
}

/* Wow & flutter: línea de retardo modulada (misma deriva en ambos canales para no romper la fase). */
function wowAndFlutter(channels: Float32Array[], sampleRate: number, amount: number) {
  if (amount <= 0.001) return;
  const depthSlow = 0.0016 * sampleRate * amount; // ~1.6 ms
  const depthFast = 0.00016 * sampleRate * amount; // ~0.16 ms
  const base = Math.ceil(depthSlow + depthFast + 4);
  const noise = makeNoise(0x9e3779b9);
  let drift = 0;

  for (let c = 0; c < channels.length; c++) {
    const input = channels[c];
    const out = new Float32Array(input.length);
    const line = new Float32Array(base + 1);
    let write = 0;
    for (let i = 0; i < input.length; i++) {
      line[write] = input[i];
      const t = i / sampleRate;
      drift += (noise() * 0.02 - drift) * 0.00035;
      const mod =
        Math.sin(2 * Math.PI * 0.53 * t) * depthSlow +
        Math.sin(2 * Math.PI * 6.31 * t) * depthFast +
        drift * depthSlow * 2;
      const delay = clamp(base + mod, 0, base - 1);
      const read = write - delay;
      const i0 = Math.floor(read + base) % base;
      const i1 = (i0 + 1) % base;
      const frac = read - Math.floor(read);
      out[i] = line[i0] * (1 - frac) + line[i1] * frac;
      write = (write + 1) % base;
    }
    channels[c] = out;
  }
}

/* Saturador de cinta suave con compensación de ganancia. */
function saturate(channels: Float32Array[], amount: number) {
  if (amount <= 0.001) return;
  const drive = 1 + amount * 2.6;
  const compensation = 1 / Math.tanh(drive * 0.7);
  for (const ch of channels) {
    for (let i = 0; i < ch.length; i++) {
      const x = ch[i] * drive;
      // tanh + un toque de segundo armónico
      ch[i] = (Math.tanh(x) + 0.06 * Math.tanh(x * 2)) * compensation * 0.62;
    }
  }
}

/* Shaper de transitorios: diferencia entre envolvente rápida y lenta. */
function shapeTransients(channels: Float32Array[], sampleRate: number, amount: number) {
  if (amount <= 0.001) return;
  const fast = Math.exp(-1 / (0.004 * sampleRate));
  const slow = Math.exp(-1 / (0.09 * sampleRate));
  const gains = new Float32Array(channels[0]?.length ?? 0);
  let envFast = 0;
  let envSlow = 0;
  const primary = channels[0];
  for (let i = 0; i < primary.length; i++) {
    const a = Math.abs(primary[i]);
    envFast = Math.max(a, envFast * fast);
    envSlow = Math.max(a, envSlow * slow);
    const ratio = envSlow > 1e-5 ? envFast / envSlow : 1;
    gains[i] = 1 + clamp(ratio - 1, -0.6, 2.5) * amount * 0.55;
  }
  for (const ch of channels) {
    for (let i = 0; i < ch.length; i++) ch[i] *= gains[i];
  }
}

/* Aire: paso alto de un polo sumado a la señal. */
function addAir(channels: Float32Array[], sampleRate: number, amount: number) {
  if (amount <= 0.001) return;
  const alpha = Math.exp((-2 * Math.PI * 7800) / sampleRate);
  const gain = amount * 0.42;
  for (const ch of channels) {
    let prevIn = 0;
    let lp = 0;
    for (let i = 0; i < ch.length; i++) {
      const x = ch[i];
      lp = lp * alpha + x * (1 - alpha);
      ch[i] = x + (x - lp) * gain;
      prevIn = x;
    }
    void prevIn;
  }
}

/* Anchura M/S. 0 = mono, 0.5 ≈ natural, 1 = muy ancho. */
function setWidth(channels: Float32Array[], amount: number) {
  if (channels.length < 2) return;
  const factor = 0.35 + amount * 1.6;
  const L = channels[0];
  const R = channels[1];
  for (let i = 0; i < L.length; i++) {
    const m = (L[i] + R[i]) * 0.5;
    const s = (L[i] - R[i]) * 0.5 * factor;
    L[i] = m + s;
    R[i] = m - s;
  }
}

/* Ruido analógico filtrado, decorrelacionado entre canales. */
function addNoise(channels: Float32Array[], sampleRate: number, amount: number) {
  if (amount <= 0.001) return;
  const db = -82 + amount * 34; // -82 → -48 dBFS
  const amp = 10 ** (db / 20);
  const alpha = Math.exp((-2 * Math.PI * 5200) / sampleRate);
  channels.forEach((ch, idx) => {
    const rnd = makeNoise(0x1234 + idx * 7919);
    let lp = 0;
    for (let i = 0; i < ch.length; i++) {
      lp = lp * alpha + rnd() * (1 - alpha);
      ch[i] += lp * amp * 2.2;
    }
  });
}

function highPassDc(channels: Float32Array[], sampleRate: number) {
  const r = Math.exp((-2 * Math.PI * 18) / sampleRate);
  for (const ch of channels) {
    let x1 = 0;
    let y1 = 0;
    for (let i = 0; i < ch.length; i++) {
      const x = ch[i];
      const y = x - x1 + r * y1;
      ch[i] = y;
      x1 = x;
      y1 = y;
    }
  }
}

export interface RenderOptions {
  onProgress?: (pct: number, stage: string) => void;
}

/** Copia profunda de los canales para no mutar el audio original. */
export function cloneChannels(channels: Float32Array[]): Float32Array[] {
  return channels.map((ch) => ch.slice());
}

export async function renderHumanized(
  source: Float32Array[],
  sampleRate: number,
  params: HumanizeParams,
  options: RenderOptions = {},
): Promise<Float32Array[]> {
  const { onProgress } = options;
  const channels = cloneChannels(source);
  const report = (pct: number, stage: string) => onProgress?.(pct, stage);
  const k = clamp(params.intensity, 0, 1);

  report(8, "Bloqueando DC");
  highPassDc(channels, sampleRate);
  await tick();

  report(24, "Aplicando wow & flutter");
  wowAndFlutter(channels, sampleRate, params.wow * k);
  await tick();

  report(42, "Modelando transitorios");
  shapeTransients(channels, sampleRate, params.transient * k);
  await tick();

  report(58, "Saturando cinta");
  saturate(channels, params.saturation * k);
  await tick();

  report(74, "Abriendo campo estéreo");
  setWidth(channels, params.width * k);
  await tick();

  report(86, "Añadiendo aire y sala");
  addAir(channels, sampleRate, params.air * k);
  addNoise(channels, sampleRate, params.noise * k);
  await tick();

  report(96, "Normalizando pico");
  normalize(channels, -1);
  report(100, "Listo");
  return channels;
}

export async function renderCoverStyle(
  source: Float32Array[],
  sampleRate: number,
  style: CoverStyle,
  options: RenderOptions = {},
): Promise<Float32Array[]> {
  const { onProgress } = options;
  const channels = cloneChannels(source);
  const report = (pct: number, stage: string) => onProgress?.(pct, stage);
  report(10, "Preparando versión");
  highPassDc(channels, sampleRate);
  await tick();

  if (style === "acustico") {
    report(35, "Recortando graves y suavizando");
    // Paso bajo suave de 2 polos + realce de medios
    const alpha = Math.exp((-2 * Math.PI * 11000) / sampleRate);
    for (const ch of channels) {
      let lp = 0;
      for (let i = 0; i < ch.length; i++) {
        lp = lp * alpha + ch[i] * (1 - alpha);
        ch[i] = lp;
      }
    }
    setWidth(channels, 0.18);
    addNoise(channels, sampleRate, 0.12);
    await tick();
    report(80, "Aire natural");
    addAir(channels, sampleRate, 0.18);
  } else if (style === "lofi") {
    report(30, "Cinta y deriva");
    wowAndFlutter(channels, sampleRate, 0.55);
    await tick();
    report(55, "Filtro y saturación");
    const alpha = Math.exp((-2 * Math.PI * 6200) / sampleRate);
    for (const ch of channels) {
      let lp = 0;
      for (let i = 0; i < ch.length; i++) {
        lp = lp * alpha + ch[i] * (1 - alpha);
        ch[i] = lp;
      }
    }
    saturate(channels, 0.55);
    setWidth(channels, 0.15);
    await tick();
    report(85, "Ruido de sala");
    addNoise(channels, sampleRate, 0.5);
  } else {
    report(30, "Control de sub y punch");
    // Paso alto de 32 Hz para limpiar sub
    const r = Math.exp((-2 * Math.PI * 32) / sampleRate);
    for (const ch of channels) {
      let x1 = 0;
      let y1 = 0;
      for (let i = 0; i < ch.length; i++) {
        const x = ch[i];
        const y = x - x1 + r * y1;
        ch[i] = y;
        x1 = x;
        y1 = y;
      }
    }
    shapeTransients(channels, sampleRate, 0.5);
    setWidth(channels, 0.55);
    await tick();
    report(80, "Saturación de bus");
    saturate(channels, 0.28);
    addAir(channels, sampleRate, 0.25);
  }

  report(97, "Normalizando");
  normalize(channels, -1);
  report(100, "Listo");
  return channels;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

/**
 * Carácter creativo adicional para el coverizador.
 * Se aplica DESPUÉS de la cadena del estilo: no la sustituye, la colorea.
 */
export interface CoverCharacter {
  /** 0–1 saturación armónica (drive) */
  drive: number;
  /** 0–1 reducción de bits (bitcrush) */
  crush: number;
  /** 0–1 deriva de velocidad (wow & flutter) */
  wow: number;
  /** −1 (oscuro) a 1 (brillante) */
  tilt: number;
  /** 0–1 anchura estéreo extra */
  width: number;
}

export const DEFAULT_CHARACTER: CoverCharacter = {
  drive: 0.25,
  crush: 0,
  wow: 0.15,
  tilt: 0,
  width: 0.2,
};

export const NEUTRAL_CHARACTER: CoverCharacter = { drive: 0, crush: 0, wow: 0, tilt: 0, width: 0 };

/**
 * Colorea las tres reinterpretaciones con el carácter elegido.
 * Todo se aplica en el dominio del tiempo y termina en un limitador suave con
 * pico objetivo −1 dBFS: el WAV resultante siempre es seguro para subir.
 */
export function applyCharacter(
  channels: Float32Array[],
  sampleRate: number,
  character: CoverCharacter,
): Float32Array[] {
  const out = channels.map((ch) => ch.slice());
  const { drive, crush, wow, tilt, width } = character;

  /* --- saturación (drive) --- */
  if (drive > 0.001) {
    const pre = 1 + drive * 6;
    const post = 1 / Math.tanh(pre);
    for (const ch of out) {
      for (let i = 0; i < ch.length; i++) {
        const shaped = Math.tanh(ch[i] * pre) * post;
        ch[i] = shaped * (1 - drive * 0.35) + ch[i] * (drive * 0.35);
      }
    }
  }

  /* --- bitcrush --- */
  if (crush > 0.001) {
    const bits = Math.max(4, Math.round(16 - crush * 11));
    const levels = Math.pow(2, bits - 1);
    for (const ch of out) {
      for (let i = 0; i < ch.length; i++) ch[i] = Math.round(ch[i] * levels) / levels;
    }
  }

  /* --- wow & flutter (deriva de velocidad) --- */
  if (wow > 0.001 && out.length > 0) {
    const depth = wow * 0.004 * sampleRate; // hasta 4 ms de desviación
    const rate = 0.6 + wow * 1.4;
    for (const ch of out) {
      const source = ch.slice();
      for (let i = 0; i < ch.length; i++) {
        const t = (i / sampleRate) * Math.PI * 2 * rate;
        const offset = Math.sin(t) * depth + Math.sin(t * 4.7) * depth * 0.25;
        const pos = i + offset;
        const i0 = Math.floor(pos);
        const frac = pos - i0;
        const a = source[Math.max(0, Math.min(source.length - 1, i0))];
        const b = source[Math.max(0, Math.min(source.length - 1, i0 + 1))];
        ch[i] = a + (b - a) * frac;
      }
    }
  }

  /* --- tilt tonal: una sola banda, sin filtros largos --- */
  if (Math.abs(tilt) > 0.02) {
    const coefficient = tilt > 0 ? 0.25 : 0.06;
    for (const ch of out) {
      let low = 0;
      for (let i = 0; i < ch.length; i++) {
        low += coefficient * (ch[i] - low);
        const high = ch[i] - low;
        ch[i] = tilt > 0 ? ch[i] + high * tilt * 0.9 : ch[i] + low * tilt * 0.9;
      }
    }
  }

  /* --- anchura estéreo (M/S) --- */
  if (width > 0.001 && out.length === 2) {
    const [left, right] = out;
    for (let i = 0; i < left.length; i++) {
      const mid = (left[i] + right[i]) * 0.5;
      const side = (left[i] - right[i]) * 0.5 * (1 + width);
      left[i] = mid + side;
      right[i] = mid - side;
    }
  }

  /* --- limitador suave para garantizar compatibilidad de subida --- */
  let peak = 0;
  for (const ch of out) for (let i = 0; i < ch.length; i++) peak = Math.max(peak, Math.abs(ch[i]));
  const target = 0.891; // ≈ −1 dBFS
  if (peak > target) {
    const gain = target / peak;
    for (const ch of out) for (let i = 0; i < ch.length; i++) ch[i] = Math.tanh(ch[i] * gain * 1.05) * 0.98;
  }

  return out;
}

export function blobToWavUrl(channels: Float32Array[], sampleRate: number): string {
  return URL.createObjectURL(encodeWav(channels, sampleRate));
}
