/**
 * ============================================================================
 *  MOTOR DE ANÁLISIS LOCAL — orquestación
 * ============================================================================
 *  © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 *
 *  Une la extracción de características (`features.ts`) con el modelo
 *  explicable (`model.ts`) y produce el `AnalysisResult` que consumen todas
 *  las pantallas y el informe imprimible.
 *
 *  Todo se ejecuta en el dispositivo: ningún audio abandona el navegador.
 *  Desde la v2 se ejecuta en un Web Worker (ver `analyzeClient.ts`) para no
 *  bloquear el hilo de interfaz.
 * ============================================================================
 */
import { ENGINE_NAME } from "../brand";
import { BANDS, extractFeatures, type AudioFeatures, type Section } from "./features";
import { evaluate, MODEL_META, type ModelOutput, type SignalContribution } from "./model";

export type RiskZone = "optimo" | "seguro" | "riesgo" | "peligro";

export interface SpectrumBand {
  label: string;
  low: number;
  high: number;
  /** dB relativo al máximo, normalizado 0..100 para visualización. */
  value: number;
}

export interface AnalysisModule {
  id: string;
  name: string;
  /** 0-100: lectura de la señal (más alto = más apariencia generativa). */
  score: number;
  weight: number;
  detail: string;
  advice: string;
}

export interface Recommendation {
  title: string;
  detail: string;
  impact: "alto" | "medio" | "bajo";
  area: string;
}

export type { Section };

export interface AnalysisResult {
  version: string;
  engine: string;
  createdAt: string;
  /** true cuando el registro es una muestra de interfaz y no un análisis real. */
  isDemo?: boolean;
  file: {
    name: string;
    size: number;
    mime: string;
    duration: number;
    sampleRate: number;
    channels: number;
  };
  ai: {
    probability: number;
    authScore: number;
    zone: RiskZone;
    confidence: "alta" | "media" | "baja";
    signals: { id: string; label: string; value: number; weight: number }[];
    /** v2: versión del modelo y si está calibrado con datos reales. */
    modelVersion: string;
    calibrated: boolean;
    /** v2: señales que más empujan el resultado, con impacto firmado. */
    drivers: { id: string; label: string; impact: number; evidence: string }[];
  };
  loudness: {
    lufs: number;
    truePeak: number;
    lra: number;
    crest: number;
    plr: number;
    rms: number;
    peak: number;
    clipping: number;
    dcOffset: number;
    /** v2: piso de ruido real (percentil 5 del RMS en ventanas de 50 ms). */
    noiseFloor: number;
    /** v2: proporción de silencio digital (0..1). */
    silenceRatio: number;
  };
  stereo: {
    correlation: number;
    width: number;
    balance: number;
    isMono: boolean;
    /** v2: correlación en agudos (1 = canales idénticos). */
    hfCorrelation: number;
    /** v2: diferencia de nivel entre canales (dB). */
    channelLevelDiffDb: number;
  };
  rhythm: {
    bpm: number;
    bpmConfidence: number;
    onsetDensity: number;
    ioiCv: number;
    regularity: number;
    /** v2: desviación media de los ataques respecto a la rejilla (ms). */
    jitterMs: number;
    /** v2: ajuste a la rejilla (0..1). */
    gridLock: number;
    /** v2: variación de intensidad de los ataques (0..1). */
    velocityVariation: number;
  };
  tonal: {
    key: string;
    keyConfidence: number;
    centroid: number;
    flatness: number;
    rolloff: number;
    hfCutoff: number;
    sparkle: number;
    contrast: number;
    /** v2: entropía del croma (0..1). */
    chromaEntropy: number;
  };
  spectrum: SpectrumBand[];
  waveform: { peaks: number[]; rms: number[] };
  spectrogram: { bands: number; frames: number[] };
  sections: Section[];
  hook: { start: number; end: number };
  modules: AnalysisModule[];
  recommendations: Recommendation[];
  /** Métricas crudas indexables (compatibilidad con informes anteriores). */
  features: Record<string, number>;
}

export const ZONE_LABEL: Record<RiskZone, string> = {
  optimo: "ZONA ÓPTIMA",
  seguro: "ZONA SEGURA",
  riesgo: "ZONA DE RIESGO",
  peligro: "ZONA DE PELIGRO",
};

export const zoneFromProbability = (p: number): RiskZone =>
  p <= 30 ? "optimo" : p <= 50 ? "seguro" : p <= 70 ? "riesgo" : "peligro";

export interface DecodedTrack {
  name: string;
  size: number;
  mime: string;
  duration: number;
  sampleRate: number;
  channels: Float32Array[];
  numberOfChannels: number;
}

export interface AnalysisProgress {
  pct: number;
  stage: string;
}

/* ---------------------- recomendaciones por señal ----------------------- */

const RECO: Record<string, { title: string; area: string }> = {
  timing: { title: "Humaniza los ataques", area: "Ritmo" },
  hfEdge: { title: "Recupera la extensión de agudos", area: "Entrega" },
  noiseFloor: { title: "Añade aire de sala real", area: "Mezcla" },
  stereo: { title: "Asimetriza el campo estéreo", area: "Mezcla" },
  velocity: { title: "Varía la intensidad de los golpes", area: "Ritmo" },
  flux: { title: "Introduce variación de textura", area: "Arreglos" },
  dynamics: { title: "Recupera rango dinámico", area: "Master" },
  flatness: { title: "Rompe la uniformidad espectral", area: "Mezcla" },
  structure: { title: "Rompe la repetición de estructura", area: "Arreglos" },
};

/* --------------------------- construcción ------------------------------- */

const round = (v: number, d = 2) => {
  const f = 10 ** d;
  return Number.isFinite(v) ? Math.round(v * f) / f : 0;
};

/** Convierte una señal del modelo en módulo de informe. */
function toModule(c: SignalContribution): AnalysisModule {
  return {
    id: c.id,
    name: c.label,
    score: Math.round(c.value),
    weight: c.weight,
    detail: c.evidence,
    advice: c.advice || "Sin acción concreta recomendada para este audio.",
  };
}

/** Construye recomendaciones a partir de las señales que más empujan. */
function buildRecommendations(model: ModelOutput): Recommendation[] {
  const candidates = model.contributions
    .filter((c) => c.applicable && c.value >= 45)
    .slice()
    .sort((a, b) => b.value * b.weight - a.value * a.weight)
    .slice(0, 5);

  return candidates.map((c) => {
    const meta = RECO[c.id] ?? { title: c.label, area: "Mezcla" };
    const impact: Recommendation["impact"] = c.value >= 75 ? "alto" : c.value >= 58 ? "medio" : "bajo";
    return {
      title: meta.title,
      detail: `${c.detail} ${c.advice}`.trim(),
      impact,
      area: meta.area,
    };
  });
}

/** Orquesta la extracción de características y la inferencia del modelo. */
export async function analyzeTrack(
  track: DecodedTrack,
  onProgress?: (p: AnalysisProgress) => void,
  options?: { fftSize?: number; hopSize?: number },
): Promise<AnalysisResult> {
  const report = (pct: number, stage: string) => onProgress?.({ pct, stage });

  const features: AudioFeatures = await extractFeatures(
    {
      name: track.name,
      size: track.size,
      mime: track.mime,
      duration: track.duration,
      sampleRate: track.sampleRate,
      channels: track.channels,
      numberOfChannels: track.numberOfChannels,
    },
    { fftSize: options?.fftSize, hopSize: options?.hopSize, onProgress: (pct, stage) => report(pct, stage) },
  );

  report(98, "Calculando índice explicable");
  const model = evaluate(features);

  const zone = zoneFromProbability(model.probability);
  const contrast = Math.max(...features.bandDb) - Math.min(...features.bandDb);

  const spectrum: SpectrumBand[] = BANDS.map((band, i) => {
    const rel = features.bandDb[i] ?? -60;
    const max = Math.max(...features.bandDb, 1e-9);
    return {
      label: band.label,
      low: band.low,
      high: band.high,
      value: Math.round(Math.max(0, Math.min(100, ((rel - Math.min(...features.bandDb)) / Math.max(max - Math.min(...features.bandDb), 1e-9)) * 100)) * 10) / 10,
    };
  });

  report(100, "Listo");

  return {
    version: "2.0.0",
    engine: ENGINE_NAME,
    createdAt: new Date().toISOString(),
    file: {
      name: track.name,
      size: track.size,
      mime: track.mime,
      duration: features.durationSec,
      sampleRate: features.sampleRate,
      channels: features.channelCount,
    },
    ai: {
      probability: model.probability,
      authScore: model.authScore,
      zone,
      confidence: model.confidence,
      signals: model.contributions.map((c) => ({
        id: c.id,
        label: c.label,
        value: c.applicable ? c.value : 0,
        weight: c.weight,
      })),
      modelVersion: model.meta.version,
      calibrated: model.meta.calibrated,
      drivers: model.drivers.slice(0, 4).map((c) => ({
        id: c.id,
        label: c.label,
        impact: c.impact,
        evidence: c.evidence,
      })),
    },
    loudness: {
      lufs: round(features.lufs, 1),
      truePeak: round(features.truePeakDbtp, 2),
      lra: round(features.lra, 1),
      crest: round(features.crestDb, 1),
      plr: round(features.plr, 1),
      rms: round(features.rmsDb, 1),
      peak: round(features.peakDb, 1),
      clipping: features.clippingSamples,
      dcOffset: round(features.dcOffset, 5),
      noiseFloor: round(features.noiseFloorDbfs, 1),
      silenceRatio: round(features.silenceRatio, 3),
    },
    stereo: {
      correlation: round(features.correlation, 2),
      width: round(features.width, 2),
      balance: round(features.balance, 2),
      isMono: features.isMono,
      hfCorrelation: round(features.hfDecorrelation, 3),
      channelLevelDiffDb: round(features.channelLevelDiffDb, 2),
    },
    rhythm: {
      bpm: round(features.bpm, 1),
      bpmConfidence: Math.round(features.bpmConfidence * 100),
      onsetDensity: round(features.onsetDensity, 2),
      ioiCv: round(features.ioiCv, 2),
      regularity: round(features.regularity, 2),
      jitterMs: round(features.transientJitterMs, 1),
      gridLock: round(features.gridLock, 2),
      velocityVariation: round(features.velocityVariation, 2),
    },
    tonal: {
      key: features.key,
      keyConfidence: Math.round(features.keyConfidence * 100),
      centroid: Math.round(features.centroidMean),
      flatness: round(features.flatnessMean, 4),
      rolloff: Math.round(features.rolloff85),
      hfCutoff: Math.round(features.spectralEdgeHz),
      sparkle: round(features.airRatio, 4),
      contrast: round(contrast, 1),
      chromaEntropy: round(features.chromaEntropy, 2),
    },
    spectrum,
    waveform: features.waveform,
    spectrogram: features.spectrogram,
    sections: features.sections,
    hook: features.hook,
    modules: model.contributions.map(toModule),
    recommendations: buildRecommendations(model),
    features: {
      centroid: Math.round(features.centroidMean),
      centroidStd: Math.round(features.centroidStd),
      flatness: round(features.flatnessMean, 4),
      flatnessStd: round(features.flatnessStd, 4),
      rolloff85: Math.round(features.rolloff85),
      fluxCv: round(features.fluxCv, 2),
      zcr: round(features.zcrMean, 4),
      spectralEdgeHz: Math.round(features.spectralEdgeHz),
      hfSlopeDbOct: round(features.hfSlopeDbOct, 1),
      hfAbove16kRatio: round(features.hfAbove16kRatio, 4),
      airRatio: round(features.airRatio, 4),
      noiseFloorDbfs: round(features.noiseFloorDbfs, 1),
      silenceRatio: round(features.silenceRatio, 3),
      transientJitterMs: round(features.transientJitterMs, 1),
      gridLock: round(features.gridLock, 2),
      velocityVariation: round(features.velocityVariation, 2),
      bpm: round(features.bpm, 1),
      onsetCount: Math.round(features.onsetDensity * features.durationSec),
      sections: features.sections.length,
      logit: model.logit,
      modelVersion: Number.NaN,
    },
  };
}

/** Metadatos del modelo activo, para mostrar en la interfaz. */
export const ACTIVE_MODEL = MODEL_META;
