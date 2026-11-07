/**
 * ============================================================================
 *  DEL ANÁLISIS AL PROMPT — puente multidimensional entre el motor DSP y Suno
 * ============================================================================
 *  © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 *
 *  Convierte un `AnalysisResult` completo en decisiones de producción:
 *  - BPM con corrección de octava rítmica (half-time / double-time / ternario)
 *  - Tonalidad y modo musical
 *  - Dirección emocional (mood) basada en espectro, dinámica, crest y modo
 *  - Etiquetas de producción y perfil vocal sugerido
 *  - Clasificación de género multi-señal (espectro de 7 bandas, entropía de
 *    croma, densidad de ataques, microtiming/gridLock, rango dinámico LRA/crest,
 *    planitud espectral, ZCR y pistas semánticas del archivo).
 * ============================================================================
 */
import { KEY_SCALES, type VocalGender } from "./composer";
import { SUNO_PRESETS, type SunoPreset } from "./presets";

export interface PresetCandidate {
  presetId: string;
  presetName: string;
  confidence: number;
  reason: string;
}

export interface ReferenceDerivation {
  bpm: number | null;
  bpmReliable: boolean;
  keyScale: string;
  musicalMode?: string;
  moodId: string;
  productionKeywords: string[];
  vocalGender?: VocalGender;
  vocalTechnique?: string;
  vocalAttitude?: string;
  presetId: string;
  presetName: string;
  candidates: PresetCandidate[];
  rationale: string[];
  caveats: string[];
  missing: string[];
  /** Ficha compacta para mostrar en la interfaz. */
  measurements: { label: string; value: string }[];
  /** Indica si el diagnóstico fue enriquecido por el musicólogo IA. */
  aiRefined?: boolean;
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

interface BandMap {
  sub: number;
  low: number;
  lowMid: number;
  mid: number;
  highMid: number;
  high: number;
  air: number;
}

function extractBands(result: unknown): BandMap | null {
  const raw = pick(result, "spectrum");
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const get = (label: string, fallback = 50): number => {
    const found = raw.find(
      (b) => b && typeof b === "object" && String((b as Loose).label ?? "").toUpperCase() === label,
    ) as Loose | undefined;
    return typeof found?.value === "number" && Number.isFinite(found.value) ? found.value : fallback;
  };
  return {
    sub: get("SUB", 40),
    low: get("LOW", 70),
    lowMid: get("LOW-MID", 70),
    mid: get("MID", 75),
    highMid: get("HIGH-MID", 60),
    high: get("HIGH", 45),
    air: get("AIR", 25),
  };
}

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

/* ------------------ corrección de octava rítmica (BPM) ------------------ */

function resolveTrueBpm(params: {
  bpmRaw: number | null;
  onsetDensity: number | null;
  lra: number | null;
  crest: number | null;
  gridLock: number | null;
  bands: BandMap | null;
}): { bpm: number | null; note: string | null } {
  const { bpmRaw, onsetDensity, lra, crest, gridLock, bands } = params;
  if (bpmRaw === null || bpmRaw < 40 || bpmRaw > 220) return { bpm: null, note: null };

  const density = onsetDensity ?? 3.0;
  const dynRange = lra ?? 6.0;
  const crestDb = crest ?? 10.0;
  const sub = bands?.sub ?? 50;
  const lock = gridLock ?? 0.65;

  // Caso 1: Balada / Bolero / Vals / Blues lento medido a doble tiempo (132–176 BPM)
  // porque el detector enganchó las corcheas del arpegio o charles.
  if (bpmRaw >= 132 && density < 2.9 && (dynRange >= 6.2 || crestDb >= 11.5) && sub < 72) {
    const half = Math.round(bpmRaw / 2);
    if (half >= 64 && half <= 88) {
      return {
        bpm: half,
        note: `tempo ajustado de ${Math.round(bpmRaw)} a ${half} BPM (pulso real lento; ${Math.round(bpmRaw)} correspondía a la subdivisión de corcheas)`,
      };
    }
  }

  // Caso 2: Trap / Urbano medido a mitad de tiempo (68–82 BPM) con subgrave 808 fuerte y rejilla rígida
  if (bpmRaw >= 68 && bpmRaw <= 82 && sub >= 74 && lock >= 0.72 && density >= 3.2) {
    const dbl = Math.round(bpmRaw * 2);
    return {
      bpm: dbl,
      note: `tempo urbano en doble tiempo: ${dbl} BPM (pulso base half-time a ${Math.round(bpmRaw)} BPM)`,
    };
  }

  return { bpm: Math.round(bpmRaw), note: null };
}

/* ------------------------------ emoción -------------------------------- */

function deriveMood(params: {
  lra: number | null;
  crest: number | null;
  centroid: number | null;
  minor: boolean;
  hfRatio: number | null;
  onsetDensity: number | null;
  flatness: number | null;
  bands: BandMap | null;
}): { moodId: string; reason: string } {
  const { lra, crest, centroid, minor, hfRatio, onsetDensity, flatness, bands } = params;
  const density = onsetDensity ?? 3.0;
  const highMid = bands?.highMid ?? 60;
  const sub = bands?.sub ?? 45;

  // Agresivo: alta densidad de ataques, compresión fuerte (LRA bajo) y presencia en medios-altos/ruido
  if (density >= 4.2 && (lra ?? 6) < 5.5 && (highMid >= 68 || (flatness ?? 0) > 0.045)) {
    return {
      moodId: "aggressive",
      reason: `alta energía transitoria (${density.toFixed(1)} ataques/s) y compresión densa`,
    };
  }

  // Oscuro y denso: modo menor con subgraves/graves prominentes o centroide sombrío y LRA contenido
  if (minor && ((lra !== null && lra < 5.8) || (sub >= 70 && (centroid ?? 2000) < 2200))) {
    return {
      moodId: "dark",
      reason: `tonalidad menor con grave profundo y mezcla compacta (${(lra ?? 5).toFixed(1)} LU)`,
    };
  }

  // Íntimo: centroide cálido, baja densidad de ataques y rango dinámico natural
  if ((centroid !== null && centroid < 1750 && density < 3.0) || ((crest ?? 10) > 13 && density < 2.4)) {
    return {
      moodId: "intimate",
      reason: `timbre cálido (${Math.round(centroid ?? 1500)} Hz) y articulación cercana con espacio dinámico`,
    };
  }

  // Eufórico: modo mayor con buen empuje rítmico o brillo superior
  if (!minor && (density >= 3.1 || (centroid ?? 2000) >= 2100)) {
    return {
      moodId: "uplifting",
      reason: `modo mayor luminoso con pulso activo (${density.toFixed(1)} ataques/s)`,
    };
  }

  // Etéreo: gran extensión de aire en agudos y baja percusión
  if ((centroid !== null && centroid > 2900 && (hfRatio ?? 0) > 0.015) && density < 3.2) {
    return {
      moodId: "ethereal",
      reason: `espectro cristalino (${Math.round(centroid)} Hz) con aire extendido en agudos`,
    };
  }

  // Melancólico: modo menor con rango dinámico expresivo
  if (minor && (lra === null || lra >= 5.8)) {
    return {
      moodId: "melancholic",
      reason: `modo menor con dinámica respirada (${(lra ?? 7).toFixed(1)} LU): carácter emotivo y reflexivo`,
    };
  }

  // Nostálgico: modo mayor templado o recorte vintage en agudos
  if (!minor) {
    return {
      moodId: "nostalgic",
      reason: "modo mayor de tempo y brillo moderados: carácter cálido y evocador",
    };
  }

  return {
    moodId: "dreamy",
    reason: "textura envolvente y balance espectral suave",
  };
}

/* ----------------------- instrumentación y voz -------------------------- */

function deriveKeywordsAndVocal(params: {
  width: number | null;
  hfRatio: number | null;
  noiseFloor: number | null;
  centroid: number | null;
  lra: number | null;
  crest: number | null;
  gridLock: number | null;
  jitterMs: number | null;
  onsetDensity: number | null;
  bands: BandMap | null;
}): {
  keywords: string[];
  vocalTechnique: string;
  vocalAttitude: string;
  reasons: string[];
} {
  const keywords: string[] = [];
  const reasons: string[] = [];
  const { width, hfRatio, noiseFloor, centroid, lra, crest, gridLock, jitterMs, onsetDensity, bands } = params;

  // 1. Batería con pegada vs instrumentos acústicos
  if ((lra !== null && lra < 4.8 && (onsetDensity ?? 0) >= 3.2) || ((bands?.low ?? 0) > 82 && (gridLock ?? 0) > 0.72)) {
    keywords.push("punchy drums");
    reasons.push("golpes rítmicos firmes y cuantizados: se activa «Batería con pegada»");
  } else if (((jitterMs ?? 0) > 6.5 || (gridLock ?? 1) < 0.72) && (bands?.sub ?? 80) < 62) {
    keywords.push("acoustic instruments");
    reasons.push("microtiming humano y grave natural sin sub-808: se activa «Instrumentos acústicos orgánicos»");
  }

  // 2. Imagen estéreo vs mezcla seca
  if (width !== null && width > 0.44) {
    keywords.push("wide stereo image");
    reasons.push(`campo estéreo amplio (${width.toFixed(2)}): se activa «Imagen estéreo amplia»`);
  } else if (noiseFloor !== null && noiseFloor < -64 && (width ?? 0.3) < 0.28) {
    keywords.push("dry mix");
    reasons.push(`piso de ruido limpio (${noiseFloor.toFixed(0)} dBFS) y foco central: «Mezcla seca y directa»`);
  }

  // 3. Calidez analógica / saturación / reverb
  if (hfRatio !== null && hfRatio < 0.006 && (centroid ?? 2000) < 2200) {
    keywords.push("analog warmth");
    reasons.push("caída suave en agudos extremos: «Calidez armónica analógica»");
  } else if ((lra ?? 5) >= 7.5 && (width ?? 0) >= 0.35) {
    keywords.push("cinematic production");
    reasons.push(`rango dinámico amplio (${(lra ?? 8).toFixed(1)} LU) y espacialidad: «Producción cinematográfica»`);
  } else if (centroid !== null && centroid < 1450) {
    keywords.push("lo-fi texture");
    reasons.push(`centroide oscuro (${Math.round(centroid)} Hz): «Textura Lo-Fi y vintage»`);
  }

  // Sugerencia de técnica y actitud vocal según dinámica y brillo
  let vocalTechnique = "clean and forward";
  let vocalAttitude = "confident";

  if ((lra ?? 6) >= 7.5 && (bands?.highMid ?? 50) >= 65) {
    vocalTechnique = "powerful belting";
    vocalAttitude = "confident";
  } else if ((centroid ?? 2000) < 1750 && (onsetDensity ?? 3) < 2.8) {
    vocalTechnique = "breathy, airy delivery";
    vocalAttitude = "vulnerable";
  } else if ((bands?.highMid ?? 50) >= 72 && (lra ?? 6) < 5.0) {
    vocalTechnique = "raspy, textured tone";
    vocalAttitude = "aggressive";
  }

  return {
    keywords: Array.from(new Set(keywords)).slice(0, 3),
    vocalTechnique,
    vocalAttitude,
    reasons,
  };
}

/* ---------------- clasificador acústico de 8 dimensiones ---------------- */

const FILENAME_HINTS: Record<string, string[]> = {
  "cumbia-peruana": ["chicha", "psicodelic", "destellos", "mirlos", "shapis", "cumbia peruana"],
  "cumbia-sanjuanera": ["sanjuanera", "piura", "corazon serrano", "sensual karicia"],
  "cumbia-nortena": ["nortena", "norteña", "grupo 5", "agua marina", "armonia 10", "maroyu"],
  "cumbia-limena": ["limena", "limeña", "cumbia"],
  rock: ["rock", "alternativ", "indie", "punk", "grunge"],
  "rock-latino": ["rock latino", "soda", "enanitos", "mana", "caifanes", "prisioneros"],
  vals: ["vals", "criollo", "jarana", "chabuca", "zambo", "cajon", "cajón"],
  bolero: ["bolero", "trio", "trío", "requinto", "panchos", "armando manzanero"],
  balada: ["balada", "power ballad", "jose jose", "camilo sesto", "nino bravo", "raphael"],
  "balada-pop": ["balada pop", "romantica", "romántica", "sin bandera", "reik", "camila", "pablo alboran"],
  ranchera: ["ranchera", "mariachi", "vicente", "infante", "negrete", "nodal"],
  "jazz-smooth": ["smooth jazz", "kenny g", "rhodes", "lounge"],
  "jazz-latin": ["latin jazz", "afro cuban", "montuno", "poncho sanchez", "tito puente"],
  "jazz-bossa": ["bossa", "jobim", "gilberto", "ipanema", "samba"],
  "jazz-swing": ["swing", "big band", "sinatra", "fitzgerald", "basie"],
  "jazz-classic": ["jazz", "bebop", "miles davis", "coltrane", "bill evans"],
  urban: ["trap", "urbano", "reggaeton", "regueton", "808", "dembow", "bad bunny", "feid"],
  "pop-latino": ["pop latino", "latin pop", "shakira", "luis fonsi", "sebastian yatra", "pop"],
  "blues-classic": ["blues", "bb king", "clapton", "shuffle", "12 bar"],
  "soul-classic": ["soul", "motown", "stax", "aretha", "marvin gaye", "otis", "gospel", "r&b"],
};

function classifyPresets(params: {
  bpm: number | null;
  rawBpm: number | null;
  minor: boolean;
  centroid: number | null;
  flatness: number | null;
  rolloff: number | null;
  hfRatio: number | null;
  chromaEntropy: number | null;
  onsetDensity: number | null;
  regularity: number | null;
  gridLock: number | null;
  jitterMs: number | null;
  velocityVariation: number | null;
  lra: number | null;
  crest: number | null;
  width: number | null;
  zcr: number | null;
  bands: BandMap | null;
  fileName: string;
}): PresetCandidate[] {
  const {
    bpm,
    rawBpm,
    minor,
    centroid,
    flatness,
    rolloff,
    hfRatio,
    chromaEntropy,
    onsetDensity,
    regularity,
    gridLock,
    jitterMs,
    velocityVariation,
    lra,
    crest,
    width,
    zcr,
    bands,
    fileName,
  } = params;

  const cleanName = fileName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const sub = bands?.sub ?? 45;
  const low = bands?.low ?? 70;
  const lowMid = bands?.lowMid ?? 70;
  const mid = bands?.mid ?? 75;
  const highMid = bands?.highMid ?? 60;
  const high = bands?.high ?? 45;
  const air = bands?.air ?? 25;

  const density = onsetDensity ?? 3.0;
  const lock = gridLock ?? 0.65;
  const jitter = jitterMs ?? 6.0;
  const entropy = chromaEntropy ?? 0.75;
  const dynLra = lra ?? 6.0;
  const crestDb = crest ?? 10.5;
  const cent = centroid ?? 2000;
  const flat = flatness ?? 0.03;
  const velVar = velocityVariation ?? 0.25;

  const scored = SUNO_PRESETS.map((preset) => {
    let score = 0;
    const reasons: string[] = [];
    const id = preset.id;

    // 1. Pista semántica en el nombre del archivo (si existe)
    const hints = FILENAME_HINTS[id] ?? [];
    for (const h of hints) {
      if (cleanName.includes(h)) {
        score += 42;
        reasons.push(`referencia identificada («${h}»)`);
        break;
      }
    }

    // 2. Ajuste de Tempo (considerando BPM corregido y equivalentes de octava ×0.5 / ×2)
    // Peso moderado (máx 28 pts) para que el BPM NUNCA imponga un género por sí solo.
    const center = (preset.bpmMin + preset.bpmMax) / 2;
    const halfSpan = Math.max(8, (preset.bpmMax - preset.bpmMin) / 2);
    if (bpm !== null) {
      const candidatesBpm = [
        { val: bpm, weight: 1.0 },
        { val: rawBpm ?? bpm, weight: 0.9 },
        { val: bpm / 2, weight: 0.72 },
        { val: bpm * 2, weight: 0.72 },
      ];
      let bestTempoScore = -12;
      let matchedBpm = bpm;
      for (const c of candidatesBpm) {
        if (c.val < 45 || c.val > 210) continue;
        const dist = Math.abs(c.val - center);
        if (c.val >= preset.bpmMin && c.val <= preset.bpmMax) {
          const s = (28 - (dist / halfSpan) * 6) * c.weight;
          if (s > bestTempoScore) {
            bestTempoScore = s;
            matchedBpm = Math.round(c.val);
          }
        } else if (dist <= 18) {
          const s = (16 - dist * 0.8) * c.weight;
          if (s > bestTempoScore) {
            bestTempoScore = s;
            matchedBpm = Math.round(c.val);
          }
        }
      }
      score += bestTempoScore;
      if (bestTempoScore >= 14) {
        reasons.push(`pulso compatible (${matchedBpm} BPM en rango ${preset.bpmLabel})`);
      }
    }

    // 3. Firma Espectral de 7 Bandas + Dinámica + Microtiming + Armonía (hasta 75 pts)
    switch (id) {
      case "urban": {
        if (sub >= 68) {
          score += 24;
          reasons.push("subgrave 808 dominante (20–60 Hz)");
        } else if (sub < 50) {
          score -= 18;
        }
        if (high >= 50 || air >= 35 || (hfRatio ?? 0) > 0.015) {
          score += 12;
          reasons.push("brillo de hi-hats en agudos");
        }
        if (lock >= 0.74) score += 12;
        if (dynLra < 6.0) score += 8;
        break;
      }

      case "pop-latino": {
        if (low >= 72 && mid >= 70 && high >= 48) {
          score += 20;
          reasons.push("balance comercial moderno (bajo firme + medios claros + brillo)");
        }
        if (lock >= 0.7 && dynLra >= 3.0 && dynLra <= 6.8) {
          score += 15;
          reasons.push("producción pulida y cuantizada para radio");
        }
        if (cent >= 1900 && cent <= 3200) score += 10;
        if (entropy < 0.82) score += 6;
        break;
      }

      case "rock":
      case "rock-latino": {
        // El rock tiene energía densa en LOW-MID, MID y HIGH-MID (guitarras + caja + platos)
        if (lowMid >= 68 && mid >= 75 && highMid >= 62) {
          score += 22;
          reasons.push("muro de guitarras y presencia en medios/medios-altos");
        }
        if (flat >= 0.032 || (zcr ?? 0) >= 0.055) {
          score += 14;
          reasons.push("textura saturada y ataque de batería acústica");
        }
        if (density >= 3.0 && dynLra < 7.5) score += 10;
        if (id === "rock-latino" && velVar >= 0.24 && (regularity ?? 0.5) >= 0.52) {
          score += 8;
          reasons.push("variación dinámica de percusión latina");
        }
        break;
      }

      case "balada":
      case "balada-pop": {
        if (dynLra >= 6.0 || crestDb >= 11.5) {
          score += 22;
          reasons.push(`amplio recorrido dinámico (${dynLra.toFixed(1)} LU) propio de balada`);
        }
        if (mid >= 74 && lowMid >= 65 && sub < 65) {
          score += 16;
          reasons.push("protagonismo vocal, piano y cuerdas en rango medio");
        }
        if (density < 3.1) {
          score += 12;
          reasons.push("fraseo pausado y expresivo");
        }
        if (id === "balada" && (width ?? 0.3) >= 0.35 && dynLra >= 7.2) {
          score += 8;
          reasons.push("apertura orquestal");
        }
        if (id === "balada-pop" && lock >= 0.65 && dynLra < 8.5) {
          score += 8;
        }
        break;
      }

      case "bolero":
      case "vals": {
        if (sub < 58 && lowMid >= 66 && mid >= 72) {
          score += 20;
          reasons.push("timbre acústico cálido (guitarras, requinto y madera sin subgraves sintéticos)");
        }
        if (jitter >= 5.5 || lock < 0.74) {
          score += 15;
          reasons.push("microtiming humano y expresivo");
        }
        if ((rolloff ?? 4000) < 5200 && flat < 0.038) {
          score += 10;
        }
        if (id === "vals" && velVar >= 0.28) {
          score += 8;
          reasons.push("acentuación rítmica de cajón y compás ternario");
        }
        if (id === "bolero" && density < 3.0 && cent < 2200) {
          score += 8;
          reasons.push("intimidad de bolero clásico");
        }
        break;
      }

      case "cumbia-peruana":
      case "cumbia-sanjuanera":
      case "cumbia-nortena":
      case "cumbia-limena": {
        // Cumbia exige: densidad percusiva constante (güiro/congas/timbal), bajo en LOW (no en SUB 808)
        // y presencia brillante en HIGH-MID (vientos / acordeón / guitarra eléctrica).
        const hasCumbiaGroove =
          density >= 3.2 &&
          density <= 5.8 &&
          (regularity ?? 0.5) >= 0.55 &&
          low >= sub + 12 &&
          highMid >= 58;

        if (hasCumbiaGroove) {
          score += 18;
          reasons.push("patrón percusivo tropical constante con bajo melódico y brillo en medios-altos");
        } else {
          // Penalizar para que las cumbias no ganen por defecto solo por estar al inicio de la lista
          score -= 14;
        }

        if (id === "cumbia-peruana" && minor && cent >= 1800 && cent <= 2900) {
          score += 7;
        }
        if (id === "cumbia-sanjuanera" && !minor && cent >= 2200) {
          score += 7;
        }
        if (id === "cumbia-nortena" && highMid >= 66 && dynLra < 6.5) {
          score += 7;
        }
        if (id === "cumbia-limena" && !minor && dynLra >= 5.0) {
          score += 6;
        }
        break;
      }

      case "ranchera": {
        if (mid >= 76 && highMid >= 64 && sub < 55 && crestDb >= 11.0) {
          score += 22;
          reasons.push("proyección acústica de metales, cuerdas y voz con alto factor de cresta");
        }
        if (jitter >= 5.5 && !minor) score += 10;
        break;
      }

      case "jazz-smooth":
      case "jazz-latin":
      case "jazz-bossa":
      case "jazz-swing":
      case "jazz-classic": {
        // El Jazz destaca por alta entropía armónica (acordes de 7ª/9ª/13ª y cromatismo) y dinámica viva
        if (entropy >= 0.79) {
          score += 22;
          reasons.push(`riqueza armónica elevada (entropía cromática ${(entropy * 100).toFixed(0)} %)`);
        } else if (entropy < 0.71) {
          score -= 10;
        }
        if (crestDb >= 11.5 || dynLra >= 6.5) {
          score += 12;
          reasons.push("dinámica acústica sin sobrecompresión");
        }
        if (velVar >= 0.25) score += 8;

        if (id === "jazz-smooth" && cent < 2200 && flat < 0.03) score += 8;
        if (id === "jazz-bossa" && density >= 2.2 && density <= 3.6 && sub < 58 && cent < 2100) score += 10;
        if (id === "jazz-latin" && density >= 3.5 && highMid >= 62) score += 10;
        if (id === "jazz-swing" && density >= 3.4 && jitter >= 5.0) score += 8;
        if (id === "jazz-classic" && jitter >= 6.0 && velVar >= 0.3) score += 9;
        break;
      }

      case "blues-classic": {
        if (lowMid >= 68 && mid >= 72 && jitter >= 5.5 && crestDb >= 11.0) {
          score += 22;
          reasons.push("rango medio expresivo, microtiming de shuffle y dinámica cruda");
        }
        if (entropy >= 0.74 && entropy <= 0.86) score += 10;
        if (minor) score += 6;
        break;
      }

      case "soul-classic": {
        if (low >= 70 && lowMid >= 70 && mid >= 75 && sub < 65) {
          score += 22;
          reasons.push("calidez de bajo eléctrico vintage, sección de metales y presencia vocal");
        }
        if (velVar >= 0.24 && crestDb >= 10.5) score += 12;
        break;
      }
    }

    return {
      preset,
      score,
      reason:
        reasons.length > 0
          ? `${preset.name}: ${reasons.slice(0, 2).join(" + ")}`
          : `${preset.name} (${preset.bpmLabel} BPM)`,
    };
  }).sort((a, b) => b.score - a.score);

  const maxScore = Math.max(scored[0]?.score ?? 1, 1);
  return scored.slice(0, 3).map((item, idx) => {
    const rawConf = Math.min(96, Math.max(42, Math.round(52 + item.score * 0.65 - idx * 8)));
    void maxScore;
    return {
      presetId: item.preset.id,
      presetName: item.preset.name,
      confidence: rawConf,
      reason: item.reason,
    };
  });
}

/* ------------------------------- API ----------------------------------- */

/**
 * Deriva decisiones de composición a partir de un `AnalysisResult`.
 */
export function deriveFromAnalysis(result: unknown): ReferenceDerivation {
  const rationale: string[] = [];
  const caveats: string[] = [];
  const missing: string[] = [];

  const fileName = str(result, "file.name") ?? "";
  const bpmRaw = num(result, "rhythm.bpm") ?? num(result, "features.bpm");
  const onsetDensity = num(result, "rhythm.onsetDensity");
  const regularity = num(result, "rhythm.regularity");
  const gridLock = num(result, "rhythm.gridLock") ?? num(result, "features.gridLock");
  const jitterMs = num(result, "rhythm.jitterMs") ?? num(result, "features.transientJitterMs");
  const velocityVariation =
    num(result, "rhythm.velocityVariation") ?? num(result, "features.velocityVariation");

  const lra = num(result, "loudness.lra");
  const crest = num(result, "loudness.crest");
  const noiseFloor = num(result, "loudness.noiseFloor") ?? num(result, "features.noiseFloorDbfs");
  const width = num(result, "stereo.width");

  const centroid = num(result, "tonal.centroid") ?? num(result, "features.centroid");
  const flatness = num(result, "tonal.flatness") ?? num(result, "features.flatness");
  const rolloff = num(result, "tonal.rolloff") ?? num(result, "features.rolloff85");
  const chromaEntropy = num(result, "tonal.chromaEntropy");
  const hfRatio = num(result, "features.hfAbove16kRatio") ?? num(result, "tonal.sparkle");
  const zcr = num(result, "features.zcr");

  const bands = extractBands(result);

  // 1. Resolver BPM real corrigiendo subdivisiones de octava (half-time / double-time)
  const bpmResolved = resolveTrueBpm({
    bpmRaw,
    onsetDensity,
    lra,
    crest,
    gridLock,
    bands,
  });

  const bpmMeasured = bpmResolved.bpm;
  if (bpmMeasured) {
    rationale.push(
      bpmResolved.note ??
        `tempo medido: ${bpmMeasured} BPM${onsetDensity ? ` (${onsetDensity.toFixed(1)} ataques/s)` : ""}`,
    );
  } else {
    missing.push("BPM");
  }

  // 2. Tonalidad
  const keyRaw = str(result, "tonal.key");
  const keyConfidence = num(result, "tonal.keyConfidence");
  const keyScale = normalizeKey(keyRaw);
  if (keyScale) {
    rationale.push(
      `tonalidad detectada por perfil armónico: ${keyScale}${keyConfidence ? ` (confianza ${keyConfidence} %)` : ""}`,
    );
  } else {
    missing.push("tonalidad");
  }

  const minor = /minor|menor/i.test(keyScale ?? keyRaw ?? "");

  // 3. Emoción (Mood)
  const mood = deriveMood({
    lra,
    crest,
    centroid,
    minor,
    hfRatio,
    onsetDensity,
    flatness,
    bands,
  });
  rationale.push(`dirección emocional: ${mood.reason}`);

  // 4. Etiquetas de producción y voz
  const { keywords, vocalTechnique, vocalAttitude, reasons } = deriveKeywordsAndVocal({
    width,
    hfRatio,
    noiseFloor,
    centroid,
    lra,
    crest,
    gridLock,
    jitterMs,
    onsetDensity,
    bands,
  });
  rationale.push(...reasons);

  // 5. Clasificación multidimensional de género (Top 3 candidatos)
  const candidates = classifyPresets({
    bpm: bpmMeasured,
    rawBpm: bpmRaw !== null ? Math.round(bpmRaw) : null,
    minor,
    centroid,
    flatness,
    rolloff,
    hfRatio,
    chromaEntropy,
    onsetDensity,
    regularity,
    gridLock,
    jitterMs,
    velocityVariation,
    lra,
    crest,
    width,
    zcr,
    bands,
    fileName,
  });

  const bestCandidate = candidates[0];
  const bestPreset = SUNO_PRESETS.find((p) => p.id === bestCandidate.presetId) ?? SUNO_PRESETS[0];
  rationale.push(`género inferido: ${bestCandidate.reason}`);

  // Si el BPM medido es múltiplo exacto del rango del género ganador, ajustar al pulso del género
  let finalBpm = bpmMeasured;
  let bpmReliable = bpmMeasured !== null;
  if (bpmMeasured !== null) {
    if (bpmMeasured < bestPreset.bpmMin && bpmMeasured * 2 >= bestPreset.bpmMin && bpmMeasured * 2 <= bestPreset.bpmMax) {
      finalBpm = bpmMeasured * 2;
      rationale.push(`pulso adaptado al compás de ${bestPreset.name}: ${finalBpm} BPM`);
    } else if (
      bpmMeasured > bestPreset.bpmMax &&
      Math.round(bpmMeasured / 2) >= bestPreset.bpmMin &&
      Math.round(bpmMeasured / 2) <= bestPreset.bpmMax
    ) {
      finalBpm = Math.round(bpmMeasured / 2);
      rationale.push(`pulso adaptado al compás de ${bestPreset.name}: ${finalBpm} BPM`);
    }
  }

  const measurements: { label: string; value: string }[] = [];
  const push = (label: string, value: string | null) => {
    if (value !== null) measurements.push({ label, value });
  };
  push("Tempo", finalBpm ? `${finalBpm} BPM` : null);
  push("Tonalidad", keyScale || keyRaw);
  push("Armonía", chromaEntropy !== null ? `${Math.round(chromaEntropy * 100)} %` : null);
  push("Dinámica LRA", lra !== null ? `${lra.toFixed(1)} LU` : null);
  push("Cresta", crest !== null ? `${crest.toFixed(1)} dB` : null);
  push("Cuantización", gridLock !== null ? `${Math.round(gridLock * 100)} %` : null);
  push("Centroide", centroid !== null ? `${Math.round(centroid)} Hz` : null);
  push("Ancho estéreo", width !== null ? width.toFixed(2) : null);

  return {
    bpm: finalBpm,
    bpmReliable,
    keyScale: keyScale ?? "",
    moodId: mood.moodId,
    productionKeywords: keywords,
    vocalTechnique,
    vocalAttitude,
    presetId: bestPreset.id,
    presetName: bestPreset.name,
    candidates,
    rationale,
    caveats,
    missing,
    measurements,
  };
}
