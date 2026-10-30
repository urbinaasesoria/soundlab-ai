/**
 * ============================================================================
 *  DEL ANÁLISIS AL PROMPT — puente entre el motor DSP y el compositor
 * ============================================================================
 *  © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 *
 *  Convierte un `AnalysisResult` (lo que el motor midió de una referencia) en
 *  decisiones de producción: BPM, tonalidad, emoción, instrumentación
 *  probable y preset de género sugerido.
 *
 *  Principio: **nada se inventa**. Cada valor sale de una medición concreta y
 *  se acompaña de su justificación, para que el productor pueda aceptarla o
 *  corregirla. Si una señal no está disponible, el campo se deja en blanco en
 *  lugar de rellenarse con una suposición.
 * ============================================================================
 */
import { KEY_SCALES } from "./composer";
import { SUNO_PRESETS, type SunoPreset } from "./presets";

export interface ReferenceDerivation {
  bpm: number | null;
  /** false cuando el tempo medido queda fuera de todos los presets. */
  bpmReliable: boolean;
  keyScale: string;
  moodId: string;
  productionKeywords: string[];
  presetId: string;
  presetName: string;
  rationale: string[];
  caveats: string[];
  missing: string[];
  /** Ficha compacta para mostrar en la interfaz. */
  measurements: { label: string; value: string }[];
}

/* --------------------------- acceso defensivo --------------------------- */

type Loose = Record<string, unknown>;

const pick = (source: unknown, path: string): unknown => {
  let current: unknown = source;
  for (const key of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Loose)[key];
  }
  return current;
};

const num = (source: unknown, path: string): number | null => {
  const value = pick(source, path);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const str = (source: unknown, path: string): string | null => {
  const value = pick(source, path);
  return typeof value === "string" && value.trim() ? value : null;
};

/* ----------------------------- tonalidad ------------------------------- */

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};

/** Normaliza «C# Major», «do mayor» o «F minor» al formato de la lista. */
export function normalizeKey(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/^\s*\[?|\]?\s*$/g, "").trim();
  const match = cleaned.match(/^([A-Ga-g][#b]?)\s*(major|minor|mayor|menor|maj|min)?/i);
  if (!match) return null;
  let note = match[1][0].toUpperCase() + (match[1][1] ?? "").toLowerCase();
  if (FLAT_TO_SHARP[note]) note = FLAT_TO_SHARP[note];
  if (!NOTE_NAMES.includes(note)) return null;
  const modeRaw = (match[2] ?? "").toLowerCase();
  const minor = modeRaw.startsWith("min") || modeRaw.startsWith("menor") || modeRaw === "";
  const candidate = `${note} ${minor ? "minor" : "major"}`;
  const exists = KEY_SCALES.some((k) => k.value.toLowerCase() === candidate.toLowerCase());
  return exists ? candidate : null;
}

/* ------------------------------ emoción -------------------------------- */

function deriveMood(lra: number | null, centroid: number | null, minor: boolean, hfRatio: number | null): {
  moodId: string;
  reason: string;
} {
  if (minor && lra !== null && lra < 6) {
    return { moodId: "dark", reason: `menor con LRA bajo (${lra.toFixed(1)} LU): suena cerrado y denso` };
  }
  if (minor && lra !== null && lra >= 6) {
    return { moodId: "melancholic", reason: `menor con dinámica amplia (${lra.toFixed(1)} LU): melancolía con recorrido` };
  }
  if (!minor && lra !== null && lra >= 10) {
    return { moodId: "uplifting", reason: `mayor con LRA alto (${lra.toFixed(1)} LU): sensación eufórica` };
  }
  if (centroid !== null && centroid > 3500 && (hfRatio ?? 0) > 0.02) {
    return { moodId: "ethereal", reason: `centroide alto (${Math.round(centroid)} Hz) con aire por encima de 16 kHz` };
  }
  if (centroid !== null && centroid < 1600) {
    return { moodId: "intimate", reason: `centroide bajo (${Math.round(centroid)} Hz): mezcla cercana y cálida` };
  }
  if (!minor) return { moodId: "nostalgic", reason: "modo mayor sin dinámica extrema: lectura neutra y cálida" };
  return { moodId: "dreamy", reason: "sin señales concluyentes: se propone la lectura más neutra" };
}

/* --------------------------- instrumentación ---------------------------- */

function deriveKeywords(params: {
  width: number | null;
  hfRatio: number | null;
  noiseFloor: number | null;
  centroid: number | null;
  lra: number | null;
}): { keywords: string[]; reasons: string[] } {
  const keywords: string[] = [];
  const reasons: string[] = [];
  const { width, hfRatio, noiseFloor, centroid, lra } = params;

  if (width !== null && width > 0.4) {
    keywords.push("wide stereo image");
    reasons.push(`imagen estéreo amplia (ancho ${width.toFixed(2)}): conviene conservar la amplitud`);
  }
  if (hfRatio !== null && hfRatio < 0.005) {
    keywords.push("analog warmth");
    reasons.push("casi sin contenido por encima de 16 kHz: textura cálida o banda limitada");
  }
  if (noiseFloor !== null && noiseFloor < -65) {
    keywords.push("dry mix");
    reasons.push(`piso de ruido muy bajo (${noiseFloor.toFixed(0)} dBFS): mezcla limpia y seca`);
  }
  if (centroid !== null && centroid < 1400) {
    keywords.push("lo-fi texture");
    reasons.push(`centroide bajo (${Math.round(centroid)} Hz): timbre oscuro, propio de lo-fi`);
  }
  if (lra !== null && lra < 4) {
    keywords.push("punchy drums");
    reasons.push(`LRA de ${lra.toFixed(1)} LU: material comprimido, los golpes mandan`);
  }
  return { keywords: keywords.slice(0, 3), reasons };
}

/* ------------------------- sugerencia de preset ------------------------- */

function derivePreset(
  bpm: number | null,
  hfRatio: number | null,
  minor: boolean,
): { preset: SunoPreset; reason: string } {
  const scored = SUNO_PRESETS.map((preset) => {
    let score = 0;
    const center = (preset.bpmMin + preset.bpmMax) / 2;
    if (bpm !== null) {
      if (bpm >= preset.bpmMin && bpm <= preset.bpmMax) score += 100;
      score -= Math.min(40, Math.abs(bpm - center) / 2);
    }
    // Los géneros digitales toleran agudos muy extendidos; los acústicos, no.
    const isDigital = /urbano|pop|rock|jazz/i.test(preset.group);
    if (hfRatio !== null) {
      if (hfRatio > 0.02 && isDigital) score += 6;
      if (hfRatio < 0.006 && !isDigital) score += 6;
    }
    if (minor && /bolero|balada|vals|blues|rock/i.test(preset.name)) score += 3;
    return { preset, score };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  const bpmText = bpm !== null ? `${Math.round(bpm)} BPM` : "sin BPM medible";
  return {
    preset: best.preset,
    reason: `${bpmText} encaja con «${best.preset.name}» (${best.preset.bpmLabel} BPM)`,
  };
}

/* ------------------------------- API ----------------------------------- */

/**
 * Deriva decisiones de composición a partir de un `AnalysisResult`.
 * Se acepta `unknown` para no acoplar este módulo al contrato interno del
 * analizador: cualquier campo ausente se declara en `missing`.
 */
export function deriveFromAnalysis(result: unknown): ReferenceDerivation {
  const rationale: string[] = [];
  const caveats: string[] = [];
  const missing: string[] = [];

  const bpmRaw = num(result, "rhythm.bpm");
  const bpmMeasured = bpmRaw !== null && bpmRaw >= 45 && bpmRaw <= 210 ? Math.round(bpmRaw) : null;
  if (bpmMeasured) rationale.push(`tempo medido: ${bpmMeasured} BPM`);
  else missing.push("BPM");

  const keyRaw = str(result, "tonal.key");
  const keyScale = normalizeKey(keyRaw);
  if (keyScale) rationale.push(`tonalidad detectada: ${keyRaw} → ${keyScale}`);
  else missing.push("tonalidad");

  const minor = /minor|menor/i.test(keyRaw ?? "");

  const lra = num(result, "loudness.lra");
  const centroid = num(result, "features.centroid");
  const hfRatio = num(result, "features.hfAbove16kRatio");
  const width = num(result, "stereo.width");
  const noiseFloor = num(result, "loudness.noiseFloor");

  const mood = deriveMood(lra, centroid, minor, hfRatio);
  rationale.push(`emoción propuesta: ${mood.reason}`);

  const { keywords, reasons } = deriveKeywords({ width, hfRatio, noiseFloor, centroid, lra });
  rationale.push(...reasons);

  const presetPick = derivePreset(bpmMeasured, hfRatio, minor);
  rationale.push(presetPick.reason);

  /* El tempo se valida contra los rangos reales de los presets: si queda fuera
     de todos, no es fiable y se propone el centro del preset más cercano. */
  let bpm = bpmMeasured;
  let bpmReliable = bpmMeasured !== null;
  if (bpmMeasured !== null) {
    const inSomeRange = SUNO_PRESETS.some((x) => bpmMeasured >= x.bpmMin && bpmMeasured <= x.bpmMax);
    if (!inSomeRange) {
      bpmReliable = false;
      bpm = Math.round((presetPick.preset.bpmMin + presetPick.preset.bpmMax) / 2);
      caveats.push(
        `El tempo medido (${bpmMeasured} BPM) no encaja en el rango de ningún preset: se propone ${bpm} BPM. ` +
          "En material con microtiming fuerte, confirma el tempo a oído antes de darlo por bueno.",
      );
    }
  }

  const measurements: { label: string; value: string }[] = [];
  const push = (label: string, value: string | null) => {
    if (value !== null) measurements.push({ label, value });
  };
  push("Tempo", bpmMeasured ? `${bpmMeasured} BPM${bpmReliable ? "" : " (dudoso)"}` : null);
  push("Tonalidad", keyRaw);
  push("LRA", lra !== null ? `${lra.toFixed(1)} LU` : null);
  push("Ancho estéreo", width !== null ? width.toFixed(2) : null);
  push("Centroide", centroid !== null ? `${Math.round(centroid)} Hz` : null);
  push("Aire >16 kHz", hfRatio !== null ? `${(hfRatio * 100).toFixed(2)} %` : null);
  push("Piso de ruido", noiseFloor !== null ? `${noiseFloor.toFixed(0)} dBFS` : null);

  return {
    bpm,
    bpmReliable,
    keyScale: keyScale ?? "",
    moodId: mood.moodId,
    productionKeywords: keywords,
    presetId: presetPick.preset.id,
    presetName: presetPick.preset.name,
    rationale,
    caveats,
    missing,
    measurements,
  };
}
