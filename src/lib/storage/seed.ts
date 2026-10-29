import type { AnalysisResult } from "../audio/analyzer";
import type { Prefs, Project, ScanRecord } from "./types";
import { BRAND } from "../brand";

/* ============================================================
   Semilla DEMO — permite explorar la interfaz sin subir audio.
   ADVERTENCIA DE INTEGRIDAD: este registro NO procede de ningún
   análisis real. Va marcado con `isDemo: true` y el motor se
   identifica como DEMO para que la interfaz lo muestre siempre.
   © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
   ============================================================ */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const DEMO_PROJECT_ID = `${BRAND.storage.db}-demo-project`;

export function buildDemoResult(duration = 214.5): AnalysisResult {
  const rand = rng(90210);
  const peaks: number[] = [];
  const rms: number[] = [];
  for (let i = 0; i < 900; i++) {
    const t = (i / 900) * duration;
    const section =
      t < 22 ? 0.3 : t < 58 ? 0.62 : t < 96 ? 0.95 : t < 128 ? 0.7 : t < 166 ? 1 : t < 186 ? 0.54 : 0.32;
    const beat = 0.82 + 0.18 * Math.sin((t / 60) * 122 * Math.PI);
    const p = Math.min(1, section * beat * (0.72 + rand() * 0.38));
    peaks.push(Math.round(p * 1000) / 1000);
    rms.push(Math.round(p * (0.45 + rand() * 0.18) * 1000) / 1000);
  }

  const bands = [100, 78, 62, 71, 54, 38, 27];
  const spectrum = [
    { label: "SUB", low: 20, high: 60, value: bands[0] },
    { label: "LOW", low: 60, high: 250, value: bands[1] },
    { label: "LOW-MID", low: 250, high: 500, value: bands[2] },
    { label: "MID", low: 500, high: 2000, value: bands[3] },
    { label: "HIGH-MID", low: 2000, high: 6000, value: bands[4] },
    { label: "HIGH", low: 6000, high: 12000, value: bands[5] },
    { label: "AIR", low: 12000, high: 20000, value: bands[6] },
  ];

  const logBands = 72;
  const rows = 230;
  const spectrogram: number[] = [];
  for (let y = 0; y < rows; y++) {
    const t = (y / rows) * duration;
    const section = t < 22 ? 0.42 : t < 58 ? 0.7 : t < 96 ? 1 : t < 128 ? 0.78 : t < 166 ? 0.98 : t < 186 ? 0.6 : 0.36;
    for (let b = 0; b < logBands; b++) {
      const tilt = Math.exp(-b / 26);
      const texture = 0.55 + rand() * 0.45;
      const shape = 0.5 + 0.5 * Math.sin(b * 0.42 + y * 0.09);
      spectrogram.push(Math.round(255 * section * tilt * texture * (0.7 + 0.3 * shape)));
    }
  }

  const signals = [
    { id: "timing", label: "Microtiming y rejilla", value: 12, weight: 0.18 },
    { id: "hfEdge", label: "Extensión de agudos", value: 8, weight: 0.15 },
    { id: "noiseFloor", label: "Piso de ruido y silencios", value: 6, weight: 0.13 },
    { id: "stereo", label: "Campo estéreo", value: 20, weight: 0.1 },
    { id: "velocity", label: "Uniformidad de intensidad", value: 14, weight: 0.1 },
    { id: "flux", label: "Estabilidad de la textura", value: 18, weight: 0.09 },
    { id: "dynamics", label: "Rango dinámico", value: 22, weight: 0.09 },
    { id: "flatness", label: "Textura espectral atípica", value: 10, weight: 0.08 },
    { id: "structure", label: "Estructura y repetición", value: 16, weight: 0.08 },
  ];

  const modules = signals.map((s) => ({
    id: s.id,
    name: s.label,
    score: s.value,
    weight: s.weight,
    detail: "Dato de ejemplo · sin audio analizado",
    advice: "Este módulo es una muestra de la interfaz. Analiza tu propio track para obtener lecturas reales.",
  }));

  return {
    version: "2.0.0-demo",
    engine: "DEMO · datos de ejemplo, sin audio analizado",
    createdAt: "2026-10-28T13:33:00.000Z",
    isDemo: true,
    file: {
      name: "PruebaAnalitica.wav",
      size: 37_860_000,
      mime: "audio/wav",
      duration,
      sampleRate: 44100,
      channels: 2,
    },
    ai: {
      probability: 4.5,
      authScore: 95.5,
      zone: "optimo",
      confidence: "alta",
      signals,
      modelVersion: "demo",
      calibrated: false,
      drivers: [
        { id: "timing", label: "Microtiming y rejilla", impact: -0.068, evidence: "dato de ejemplo" },
        { id: "hfEdge", label: "Extensión de agudos", impact: -0.063, evidence: "dato de ejemplo" },
        { id: "noiseFloor", label: "Piso de ruido y silencios", impact: -0.057, evidence: "dato de ejemplo" },
      ],
    },
    loudness: {
      lufs: -9.4,
      truePeak: -0.8,
      lra: 6.8,
      crest: 11.2,
      plr: 8.6,
      rms: -12.1,
      peak: -0.4,
      clipping: 0,
      dcOffset: 0.00002,
      noiseFloor: -71.3,
      silenceRatio: 0,
    },
    stereo: {
      correlation: 0.42,
      width: 0.38,
      balance: -0.02,
      isMono: false,
      hfCorrelation: 0.61,
      channelLevelDiffDb: 0.4,
    },
    rhythm: {
      bpm: 122,
      bpmConfidence: 78,
      onsetDensity: 3.14,
      ioiCv: 0.24,
      regularity: 0.52,
      jitterMs: 6.4,
      gridLock: 0.48,
      velocityVariation: 0.21,
    },
    tonal: {
      key: "F# Minor",
      keyConfidence: 74,
      centroid: 2184,
      flatness: 0.0382,
      rolloff: 6240,
      hfCutoff: 17800,
      sparkle: 0.042,
      contrast: 16.4,
      chromaEntropy: 0.81,
    },
    spectrum,
    waveform: { peaks, rms },
    spectrogram: { bands: logBands, frames: spectrogram },
    sections: [
      { start: 0, end: 22, label: "Intro", energy: 0.32 },
      { start: 22, end: 58, label: "Verso", energy: 0.62 },
      { start: 58, end: 96, label: "Drop / Coro", energy: 0.96 },
      { start: 96, end: 128, label: "Verso", energy: 0.71 },
      { start: 128, end: 166, label: "Drop / Coro", energy: 1 },
      { start: 166, end: 186, label: "Puente", energy: 0.55 },
      { start: 186, end: 214, label: "Outro", energy: 0.34 },
    ],
    hook: { start: 58, end: 76 },
    modules,
    recommendations: [
      {
        title: "Ajusta el loudness de entrega",
        detail:
          "Estás en −9,4 LUFS. Para distribuidoras apunta a −14 LUFS integrados con pico real ≤ −1 dBTP y evita limitar dos veces.",
        impact: "alto",
        area: "Master",
      },
      {
        title: "Cuida la transición del puente",
        detail:
          "El puente baja al 55 % de energía. Añade una capa nueva o un silencio intencional para que el último coro golpee con más fuerza.",
        impact: "medio",
        area: "Arreglos",
      },
    ],
    features: {
      centroid: 2184,
      centroidStd: 610,
      flatness: 0.0382,
      flatnessStd: 0.012,
      rolloff85: 6240,
      fluxCv: 0.41,
      zcr: 0.082,
      spectralEdgeHz: 17800,
      hfSlopeDbOct: -6.2,
      hfAbove16kRatio: 0.012,
      airRatio: 0.042,
      noiseFloorDbfs: -71.3,
      silenceRatio: 0,
      transientJitterMs: 6.4,
      gridLock: 0.48,
      velocityVariation: 0.21,
      bpm: 122,
      onsetCount: 674,
      sections: 7,
      logit: -3.057,
      modelVersion: Number.NaN,
    },
  };
}

export function buildDemoSeed(artistName: string): { project: Project; scan: ScanRecord } {
  const project: Project = {
    id: DEMO_PROJECT_ID,
    trackName: "Prueba Analítica",
    artistName,
    createdAt: Date.now() - 1000 * 60 * 60 * 26,
    isDemo: true,
    accent: "#f2ca50",
  };
  const scan: ScanRecord = {
    id: `${BRAND.storage.db}-demo-scan`,
    projectId: project.id,
    createdAt: project.createdAt,
    source: "scan",
    tier: "rapido",
    label: "Ejemplo de interfaz · sin audio",
    result: buildDemoResult(),
  };
  return { project, scan };
}

export const DEFAULT_PREFS: Prefs = {
  theme: "dark",
  credits: 1850,
  plan: "free",
  fullName: "Artista",
  artistName: "Artista",
  email: "artista@urbina.studio",
  country: "Perú",
  phone: "",
  birthDate: "",
  memberSince: "2026-10-28",
  socials: { instagram: "", tiktok: "", spotify: "" },
  notifications: true,
  tutorialScan: true,
  reduceMotion: false,
};
