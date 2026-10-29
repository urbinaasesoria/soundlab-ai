/**
 * Fixtures acústicos de perfil conocido para verificar el motor.
 * Cada generador es determinista (semilla fija) para que los tests sean estables.
 *
 *  - makeSynthetic: rejilla exacta de negras, intensidad constante, canales
 *    idénticos, banda limitada a 12 kHz, silencio digital al inicio.
 *  - makeHuman: microtiming, intensidad variable, sala con ruido, canales
 *    asimétricos, banda completa, dinámica por secciones.
 *
 * Ambos suenan a música (armónicos, bombo, caja y charles con contenido
 * broadband) para no medir un caso de laboratorio irreal.
 *
 * © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 */
import type { DecodedTrack } from "../src/lib/audio/analyzer.ts";

const SR = 44100;
const TAU = 2 * Math.PI;

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967295) * 2 - 1;
  };
}

/** Cascada de one-pole para simular un corte de banda duro. */
function lowpassCascade(input: Float32Array, cutoffHz: number, poles: number) {
  const out = new Float32Array(input.length);
  out.set(input);
  const a = Math.exp((-TAU * cutoffHz) / SR);
  for (let p = 0; p < poles; p++) {
    let state = 0;
    for (let i = 0; i < out.length; i++) {
      state = state * a + out[i] * (1 - a);
      out[i] = state;
    }
  }
  return out;
}

/** Onda con armónicos (más parecida a un instrumento que un seno puro). */
function harmonicWave(freq: number, t: number, harmonics: number, tilt = 1.6) {
  let v = 0;
  for (let h = 1; h <= harmonics; h++) {
    v += Math.sin(TAU * freq * h * t) / h ** tilt;
  }
  return v;
}

function track(channels: Float32Array[], name: string): DecodedTrack {
  return {
    name,
    size: channels[0].length * channels.length * 2,
    mime: "audio/wav",
    duration: channels[0].length / SR,
    sampleRate: SR,
    channels,
    numberOfChannels: channels.length,
  };
}

/* ------------------------- perfil generativo ---------------------------- */

/**
 * Patrón perfectamente cuantizado: bombo en cada negra y caja en los tiempos
 * 2 y 4, siempre con la misma amplitud. Sin ruido, sin microtiming, con los
 * dos canales idénticos y la banda cortada a 12 kHz.
 */
export function makeSynthetic(seconds = 30, seed = 1): DecodedTrack {
  const n = SR * seconds;
  const left = new Float32Array(n);
  const rnd = seeded(seed);
  const bpm = 120;
  const beat = 60 / bpm;
  const bar = beat * 4;
  const roots = [110, 98, 87.31, 98];
  const startOffset = 0.5;

  for (let i = 0; i < n; i++) {
    const t = i / SR;
    if (t < startOffset) {
      left[i] = 0;
      continue;
    }
    const tt = t - startOffset;
    const barIndex = Math.floor(tt / bar);
    const inBar = tt - barIndex * bar;
    const root = roots[barIndex % roots.length];

    let v = 0.028 * harmonicWave(root, tt, 6, 1.5) + 0.02 * harmonicWave(root * 1.5, tt, 4, 1.8);

    // Bombo exactamente en la rejilla.
    const tb = inBar % beat;
    if (tb < 0.12) v += 0.42 * Math.sin(TAU * 55 * tb) * Math.exp(-tb * 36);
    // Caja en los tiempos 2 y 4.
    const beatIndex = Math.floor(inBar / beat);
    if (beatIndex % 2 === 1) {
      const ts = inBar - beatIndex * beat;
      if (ts < 0.09) v += 0.26 * (rnd() * 0.2 + Math.sin(TAU * 190 * ts)) * Math.exp(-ts * 45);
    }

    left[i] = v * 0.82;
  }

  const bandLimited = lowpassCascade(left, 12000, 8);
  return track([bandLimited, bandLimited.slice()], "synthetic-120bpm.wav");
}

/* --------------------------- perfil humano ------------------------------ */

/**
 * Interpretación con microtiming (±9 ms), intensidad variable, sala con ruido,
 * canales asimétricos, banda completa y dinámica por secciones.
 */
export function makeHuman(seconds = 30, seed = 7): DecodedTrack {
  const n = SR * seconds;
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const rnd = seeded(seed);
  const bpm = 120 + (rnd() + 1) * 1.8;
  const beat = 60 / bpm;
  const bar = beat * 4;
  const roots = [110, 98, 87.31, 98];

  type Hit = { t: number; kind: "kick" | "snare" | "hat"; vel: number };
  const hits: Hit[] = [];
  const startOffset = 0.35;
  for (let b = 0; ; b++) {
    const t = startOffset + b * beat + (rnd() * 9) / 1000;
    if (t > seconds - 0.5) break;
    const beatIndex = b % 4;
    hits.push({ t, kind: "kick", vel: 0.34 + 0.1 * (0.5 + 0.5 * Math.sin(b * 1.7)) });
    if (beatIndex % 2 === 1) {
      hits.push({ t: t + (rnd() * 4) / 1000, kind: "snare", vel: 0.22 + 0.08 * rnd() });
    }
  }

  const room = seeded(seed + 99);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const tt = Math.max(0, t - startOffset);
    const barIndex = Math.floor(tt / bar);
    const root = roots[barIndex % roots.length];

    const section =
      t < seconds * 0.12 ? 0.55 : t < seconds * 0.42 ? 0.85 : t < seconds * 0.68 ? 1 : t < seconds * 0.85 ? 0.72 : 0.5;

    const drift = 1 + Math.sin(t * 0.31) * 0.0018;
    let v =
      section *
      (0.04 * harmonicWave(root * drift, tt, 6, 1.5) + 0.026 * harmonicWave(root * 1.5 * drift, tt, 4, 1.8));

    for (const h of hits) {
      const dt = t - h.t;
      if (dt < 0 || dt > 0.16) continue;
      if (h.kind === "kick") {
        v += section * h.vel * Math.sin(TAU * (52 + (h.vel - 0.34) * 60) * dt) * Math.exp(-dt * 30);
      } else if (h.kind === "snare") {
        v += section * h.vel * (0.6 * room() + 0.5 * Math.sin(TAU * 195 * dt)) * Math.exp(-dt * 32);
      } else {
        v += section * h.vel * room() * Math.exp(-dt * 70);
      }
      break;
    }

    const roomNoise = room() * 0.0011;
    left[i] = v + roomNoise;
    right[i] = v * 0.95 + roomNoise * 0.72 + room() * 0.0009 + 0.012 * Math.sin(TAU * 0.13 * t);
  }

  return track([left, right], "human-120bpm.wav");
}

/* ----------------------- casos concretos aislados ----------------------- */

/** Click-track perfecto a `bpm` para verificar la estimación de tempo. */
export function makeClickTrack(bpm: number, seconds = 24): DecodedTrack {
  const n = SR * seconds;
  const out = new Float32Array(n);
  const period = 60 / bpm;
  for (let t = 0.2; t < seconds - 0.2; t += period) {
    const start = Math.floor(t * SR);
    for (let i = 0; i < SR * 0.04 && start + i < n; i++) {
      out[start + i] += Math.sin((TAU * 1000 * i) / SR) * Math.exp(-i / (SR * 0.004)) * 0.8;
    }
  }
  return track([out, out.slice()], `click-${bpm}.wav`);
}

/** Ruido blanco a un nivel RMS conocido (dBFS). */
export function makeNoise(rmsDbfs: number, seconds = 6, seed = 3): DecodedTrack {
  const n = SR * seconds;
  const rnd = seeded(seed);
  const amp = 10 ** (rmsDbfs / 20);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = rnd() * amp * Math.sqrt(3);
  return track([out, out.slice()], `noise-${rmsDbfs}dB.wav`);
}

/** Mitad ruido, mitad silencio digital. */
export function makeHalfSilence(seconds = 6): DecodedTrack {
  const n = SR * seconds;
  const rnd = seeded(5);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = i < n / 2 ? rnd() * 0.2 : 0;
  return track([out, out.slice()], "half-silence.wav");
}

/** Tono puro de banda completa (referencia de "muy tonal, sin ruido"). */
export function makePureTone(freq = 440, seconds = 10): DecodedTrack {
  const n = SR * seconds;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = 0.5 * Math.sin((TAU * freq * i) / SR);
  return track([out, out.slice()], "pure-440.wav");
}

export { SR as FIXTURE_SAMPLE_RATE };
