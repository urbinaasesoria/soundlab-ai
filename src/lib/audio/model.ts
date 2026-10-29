/**
 * ============================================================================
 *  MODELO DE DECISIÓN — capa interpretable v2
 * ============================================================================
 *  © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 *
 *  QUÉ ES: un índice heurístico explicable. Combina 9 señales acústicas
 *  medidas y normalizadas, cada una con dirección documentada, y produce una
 *  probabilidad 0–100 junto con la contribución exacta de cada señal.
 *
 *  QUÉ NO ES: un clasificador entrenado. `calibrated: false` significa que los
 *  pesos provienen de criterio de ingeniería, no de un ajuste sobre datos
 *  etiquetados. Para activar un modelo entrenado hay que ejecutar
 *  `npm run dataset:make` y `npm run model:train`, validar AUC ≥ 0,85 sobre
 *  audio real y sustituir `MODEL_META.calibrated`.
 *
 *  Este índice evalúa cómo de "generativa" parece la señal según rasgos
 *  físicos medibles. No predice el clasificador de ninguna plataforma.
 * ============================================================================
 */
import type { AudioFeatures } from "./features";

export interface ModelMeta {
  version: string;
  calibrated: boolean;
  trainedOn: string;
  updatedAt: string;
  bias: number;
  /** Escala del logit: cuánto pesa una señal en el extremo. */
  scale: number;
  note: string;
}

export const MODEL_META: ModelMeta = {
  version: "2.0-prior",
  calibrated: false,
  trainedOn: "criterio de ingeniería (pesos documentados, sin ajuste supervisado)",
  updatedAt: "2026-10-29",
  bias: -0.85,
  scale: 6,
  note:
    "Índice heurístico local sobre rasgos acústicos medibles. Requiere recalibración con audio real " +
    "etiquetado antes de presentarse como detector validado.",
};

export interface SignalContribution {
  id: string;
  label: string;
  /** Peso declarado (0..1). Los pesos activos se renormalizan solos. */
  weight: number;
  /** Lectura 0..100 donde 100 = máxima apariencia generativa. */
  value: number;
  /** Medida en unidades físicas que respalda la lectura. */
  evidence: string;
  /** Explicación legible de la lectura. */
  detail: string;
  /** Qué hacer para mejorar el track. */
  advice: string;
  /** false cuando el audio no permite medirla (p. ej. estéreo en mono). */
  applicable: boolean;
  /** Contribución firmada al logit: negativa empuja a "humano". */
  impact: number;
}

export interface ModelOutput {
  probability: number;
  authScore: number;
  logit: number;
  confidence: "alta" | "media" | "baja";
  contributions: SignalContribution[];
  drivers: SignalContribution[];
  meta: ModelMeta;
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/* ------------------------- definición de señales ------------------------ */

interface SignalSpec {
  id: string;
  label: string;
  weight: number;
  /** Devuelve null si no es medible para este audio. */
  score: (f: AudioFeatures) => { value: number; evidence: string; detail: string; advice: string } | null;
}

const SIGNALS: SignalSpec[] = [
  {
    id: "timing",
    label: "Microtiming y rejilla",
    weight: 0.26,
    score: (f) => {
      if (f.onsetDensity < 0.35 || f.bpm <= 0) return null;
      const lock = clamp01((f.gridLock - 0.55) / 0.4);
      const jitter = clamp01(1 - f.transientJitterMs / 8);
      const value = clamp01(lock * 0.6 + jitter * 0.4);
      return {
        value,
        evidence: `jitter ${f.transientJitterMs.toFixed(1)} ms · rejilla ${Math.round(f.gridLock * 100)}%`,
        detail:
          value > 0.6
            ? "Los ataques caen sobre la rejilla con una precisión poco habitual en una interpretación humana."
            : "Los ataques se desvían de la rejilla de forma compatible con una interpretación real.",
        advice:
          "Desplaza bombos y snares entre 5 y 20 ms respecto a la rejilla, varía la velocity ±8 y alterna muestras de percusión en lugar de repetir el mismo loop.",
      };
    },
  },
  {
    id: "hfEdge",
    label: "Extensión de agudos",
    weight: 0.22,
    score: (f) => {
      const edge = clamp01((19000 - f.spectralEdgeHz) / 5000);
      const above16 = clamp01((0.02 - f.hfAbove16kRatio) / 0.02);
      const steep = clamp01((-f.hfSlopeDbOct - 12) / 18);
      const value = clamp01(edge * 0.5 + above16 * 0.35 + steep * 0.15);
      return {
        value,
        evidence: `borde ${Math.round(f.spectralEdgeHz)} Hz · >16 kHz ${(f.hfAbove16kRatio * 100).toFixed(2)}% · pendiente ${f.hfSlopeDbOct.toFixed(1)} dB/oct`,
        detail:
          value > 0.6
            ? "El contenido por encima de 16 kHz está muy atenuado o cortado: es la huella típica de un códec con pérdida o de un limitador de pared."
            : "La extensión de agudos es coherente con un máster de banda completa.",
        advice:
          "Exporta en WAV/FLAC de 24 bits desde el máster original y evita reencodear MP3/AAC. Revisa que el limitador de pared no esté recortando por encima de 16 kHz.",
      };
    },
  },
  {
    id: "noiseFloor",
    label: "Piso de ruido y silencios",
    weight: 0.07,
    score: (f) => {
      const selfNoise = clamp01((-55 - f.noiseFloorDbfs) / 40);
      const digital = clamp01(f.silenceRatio / 0.12);
      const value = clamp01(selfNoise * 0.75 + digital * 0.25);
      return {
        value,
        evidence: `piso ${f.noiseFloorDbfs.toFixed(1)} dBFS · silencio digital ${(f.silenceRatio * 100).toFixed(1)}%`,
        detail:
          value > 0.62
            ? "El piso de ruido es extremadamente bajo o hay silencios digitales absolutos, algo poco frecuente en una grabación con sala."
            : "El piso de ruido tiene una textura compatible con grabación real o con un render que conserva aire.",
        advice:
          "Mezcla una pista de sala o un ruido analógico muy leve entre −62 y −70 dBFS. El silencio digital absoluto entre frases delata un render en el ordenador.",
      };
    },
  },
  {
    id: "stereo",
    label: "Campo estéreo",
    weight: 0.16,
    score: (f) => {
      if (f.isMono) return null;
      const identity = clamp01((f.hfDecorrelation - 0.975) / 0.025);
      const widthOdd = clamp01(Math.abs(f.width - 0.3) / 0.35);
      const value = clamp01(identity * 0.55 + widthOdd * 0.45);
      return {
        value,
        evidence: `correlación HF ${f.hfDecorrelation.toFixed(3)} · anchura ${f.width.toFixed(2)} · balance ${f.balance.toFixed(2)}`,
        detail:
          value > 0.6
            ? "Los canales son casi idénticos también en agudos, o la anchura es extrema: un campo estéreo perfectamente simétrico sugiere origen sintético."
            : "El campo estéreo presenta asimetrías naturales entre canales.",
        advice:
          "Automatiza paneos, usa dobles con pequeñas diferencias de tiempo y reverbs con pre-delay irregular. Comprueba la suma en mono y evita anchuras idénticas en todos los elementos.",
      };
    },
  },
  {
    id: "velocity",
    label: "Uniformidad de intensidad",
    weight: 0.05,
    score: (f) => {
      if (f.onsetDensity < 0.3) return null;
      const value = clamp01(1 - f.velocityVariation / 0.3);
      return {
        value,
        evidence: `variación de ataques ${(f.velocityVariation * 100).toFixed(1)}%`,
        detail:
          value > 0.6
            ? "Todos los ataques tienen una intensidad casi idéntica; una interpretación real rara vez es tan uniforme."
            : "La intensidad de los ataques varía de forma orgánica.",
        advice:
          "Varía la velocity de cada golpe, alterna muestras y deja que algunos ataques suenen más suaves que otros.",
      };
    },
  },
  {
    id: "flux",
    label: "Estabilidad tímbrica",
    weight: 0.04,
    score: (f) => {
      // Un material construido por bloques mantiene el centroide casi inmóvil;
      // una interpretación real lo mueve al cambiar de sección e instrumentos.
      const value = clamp01(1 - f.centroidStd / 1500);
      return {
        value,
        evidence: `desviación del centroide ${Math.round(f.centroidStd)} Hz`,
        detail:
          value > 0.6
            ? "El brillo del material apenas cambia entre tramas: la textura parece repetirse bloque a bloque."
            : "El brillo evoluciona a lo largo del track, como corresponde a un arreglo con cambios.",
        advice:
          "Cambia la instrumentación cada 8–16 compases y automatiza filtros y envíos para que el brillo respire entre secciones.",
      };
    },
  },
  {
    id: "dynamics",
    label: "Rango dinámico",
    weight: 0.16,
    score: (f) => {
      const flat = clamp01((6 - f.lra) / 6);
      return {
        value: flat,
        evidence: `LRA ${f.lra.toFixed(1)} LU · crest ${f.crestDb.toFixed(1)} dB · PLR ${f.plr.toFixed(1)} dB`,
        detail:
          flat > 0.6
            ? "El rango de loudness es muy estrecho: el track suena igual de fuerte de principio a fin."
            : "El rango dinámico deja respirar al material.",
        advice:
          "Baja 1–2 dB la reducción del bus de master y recupera 1 LU de rango en el estribillo; apunta a 6–9 LU sin perder loudness percibida.",
      };
    },
  },
  {
    id: "structure",
    label: "Estructura y repetición",
    weight: 0.04,
    score: (f) => {
      if (f.durationSec < 20) return null;
      const few = clamp01((4 - f.sections.length) / 3);
      const hookCover =
        f.durationSec > 0 ? clamp01((f.hook.end - f.hook.start) / f.durationSec / 0.5) : 0;
      const value = clamp01(few * 0.7 + hookCover * 0.3);
      return {
        value,
        evidence: `${f.sections.length} secciones · hook ${f.hook.start}s–${f.hook.end}s`,
        detail:
          value > 0.6
            ? "La estructura se resuelve en muy pocas secciones con material muy repetido."
            : "La estructura presenta suficientes cambios como para sonar construida.",
        advice:
          "Añade un puente con instrumentación nueva y varía el arreglo entre estrofas para romper la repetición de bloques idénticos.",
      };
    },
  },
];

/* ------------------------------ inferencia ------------------------------ */

/**
 * Evalúa el índice explicable sobre un vector de características.
 * Los pesos se renormalizan sobre las señales medibles para que un archivo
 * mono o sin pulsos claros no quede artificialmente penalizado.
 */
export function evaluate(f: AudioFeatures): ModelOutput {
  const raw: SignalContribution[] = SIGNALS.map((spec) => {
    const result = spec.score(f);
    return {
      id: spec.id,
      label: spec.label,
      weight: spec.weight,
      value: result ? Math.round(result.value * 1000) / 10 : 0,
      evidence: result?.evidence ?? "no medible en este audio",
      detail: result?.detail ?? "Señal no aplicable a este archivo.",
      advice: result?.advice ?? "",
      applicable: result !== null,
      impact: 0,
    };
  });

  const active = raw.filter((c) => c.applicable);
  const weightSum = active.reduce((a, c) => a + c.weight, 0) || 1;

  let logit = MODEL_META.bias;
  for (const c of raw) {
    if (!c.applicable) continue;
    const normalized = c.value / 100;
    const impact = MODEL_META.scale * (c.weight / weightSum) * (normalized - 0.5);
    c.impact = Math.round(impact * 1000) / 1000;
    logit += impact;
  }

  const probability = Math.round(clamp01(sigmoid(logit)) * 1000) / 10;
  const drivers = raw
    .filter((c) => c.applicable)
    .slice()
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  const confidence: ModelOutput["confidence"] =
    f.durationSec >= 60 && !f.isMono && f.onsetDensity > 0.4
      ? "alta"
      : f.durationSec >= 20
        ? "media"
        : "baja";

  return {
    probability,
    authScore: Math.round((100 - probability) * 100) / 100,
    logit: Math.round(logit * 1000) / 1000,
    confidence,
    contributions: raw,
    drivers,
    meta: MODEL_META,
  };
}

/**
 * Compara dos evaluaciones y devuelve la mejora (positiva = menos aparente
 * como generativo). Se usa para verificar automáticamente el humanizador.
 */
export function compareOutputs(before: ModelOutput, after: ModelOutput) {
  return {
    deltaProbability: Math.round((after.probability - before.probability) * 10) / 10,
    improved: after.probability < before.probability,
    improvedBy: Math.round((before.probability - after.probability) * 10) / 10,
  };
}
