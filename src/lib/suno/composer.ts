/**
 * ============================================================================
 *  COMPOSITOR DE PRODUCCIÓN PARA SUNO — motor determinista v2
 * ============================================================================
 *  © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 *
 *  Metodología **PRO FLOW de 5 pasos** (portada del motor original Moi-Suno)
 *  sin depender de modelos generativos. Novedades v2:
 *
 *   · Parte del **preset de género** de la casa (20 presets con style prompt ya
 *     optimizado) en lugar de recomponer el género desde cero. Así el
 *     conocimiento de cada género se conserva y el usuario solo ajusta matices.
 *   · Acepta un **análisis de audio** como referencia: BPM, tonalidad, emoción
 *     e instrumentación se derivan de lo medido, no de una suposición.
 *   · Separación estricta entre *problemas* (warnings) y *sugerencias* (notes).
 *
 *  Es determinista: la misma entrada produce siempre el mismo set. No inventa
 *  letras: si el usuario no aporta la suya, devuelve un esqueleto de estructura.
 * ============================================================================
 */
import { BRAND } from "../brand";
import { SUNO_LIMITS } from "./limits";
import { findPreset, presetBpm, SUNO_PRESETS, type SunoPreset } from "./presets";

/* ------------------------------- tipos ---------------------------------- */

export type VocalGender = "" | "female" | "male" | "duet" | "instrumental";
export type CreativeProfile = "fiel" | "equilibrado" | "experimental";

export interface CompositorForm {
  idea: string;
  /** Idioma de la letra (los metatags siempre van en inglés). */
  language: string;
  /** Punto de vista narrativo de la letra. */
  pov: string;
  /** Id del preset de género de la casa. */
  presetId: string;
  /** Matiz libre sobre el preset (opcional). */
  customGenre: string;
  bpm: string;
  keyScale: string;
  musicalMode: string;
  moodId: string;
  cinematic: string;
  vocalGender: VocalGender;
  vocalTechnique: string;
  vocalAttitude: string;
  productionKeywords: string[];
  exclude: string[];
  maxMode: boolean;
  vocalEntryHack: boolean;
  instrumentalBridge: boolean;
  keepLyrics: boolean;
  lyrics: string;
  /** Matiz estilístico adicional generado por la IA o escrito a mano; se integra dinámicamente al set. */
  styleOverride: string;
  profile: CreativeProfile;
  weirdness: number;
  styleInfluence: number;
}

export interface PackChecks {
  styleChars: number;
  styleLimit: number;
  styleDense: boolean;
  lyricsChars: number;
  lyricsLimit: number;
  excludeChars: number;
  fitsSuno: boolean;
  warnings: string[];
  notes: string[];
}

export interface Decision {
  step: string;
  detail: string;
}

export interface ProductionSet {
  title: string;
  stylePrompt: string;
  excludeStyles: string;
  lyrics: string;
  weirdness: number;
  styleInfluence: number;
  engineerNotes: string[];
  checks: PackChecks;
  decisions: Decision[];
  presetName: string;
  bpm: string;
  keyScale: string;
  effectiveMoodId?: string;
  paramsRationale?: string;
}

/* ---------------------------- catálogos --------------------------------- */

export interface MoodDefinition {
  readonly id: string;
  readonly es: string;
  readonly en: string;
  readonly description: string;
  readonly reference: string;
}

export const MOODS: readonly MoodDefinition[] = [
  {
    id: "auto",
    es: "✨ Elegido por la IA",
    en: "",
    description:
      "El motor y la IA analizan la historia, la letra, el género y el tempo para determinar automáticamente la dirección emocional más coherente.",
    reference: "Adaptación inteligente según la temática y el subgénero elegido",
  },
  {
    id: "dreamy",
    es: "Onírico",
    en: "dreamy, hazy and floating",
    description:
      "Atmósfera flotante, hipnótica y envolvente con colas de reverb largas, acordes suspendidos y transientes suaves que evocan un sueño.",
    reference: "Refs: Beach House («Space Song»), Gustavo Cerati («Bocanada»), Mazzy Star («Fade Into You»)",
  },
  {
    id: "dark",
    es: "Oscuro y denso",
    en: "dark, brooding and heavy",
    description:
      "Tensión grave, subgraves profundos, armónicos sombríos y espacialidad nocturna e introspectiva con peso dramático.",
    reference: "Refs: The Weeknd («After Hours»), Massive Attack («Teardrop»), Depeche Mode («Enjoy the Silence»)",
  },
  {
    id: "uplifting",
    es: "Eufórico",
    en: "uplifting and euphoric",
    description:
      "Energía luminosa, progresiones ascendentes, brillo en agudos y percusión contagiosa que impulsa hacia un estribillo expansivo y festivo.",
    reference: "Refs: Coldplay («Viva La Vida»), Grupo 5 («El Ritmo de Mi Corazón»), Dua Lipa («Levitating»)",
  },
  {
    id: "nostalgic",
    es: "Nostálgico",
    en: "nostalgic and bittersweet",
    description:
      "Calidez agridulce con saturación de cinta analógica, cadencias de añoranza y melodías que combinan recuerdo cálido con melancolía sutil.",
    reference: "Refs: Soda Stereo («De Música Ligera»), Natalia Lafourcade («Hasta la Raíz»), Los Ángeles Negros",
  },
  {
    id: "aggressive",
    es: "Agresivo",
    en: "aggressive and confrontational",
    description:
      "Ataque frontal, compresión intensa, distorsión armónica marcada y articulación rítmica contundente sin concesiones.",
    reference: "Refs: Rage Against the Machine («Killing in the Name»), Rosalía («SAOKO»), Linkin Park («Faint»)",
  },
  {
    id: "ethereal",
    es: "Etéreo",
    en: "ethereal and weightless",
    description:
      "Textura cristalina e ingrávida, registro agudo aireado, pads celestiales y mínima densidad percusiva que parece flotar en el aire.",
    reference: "Refs: Cocteau Twins, Enya («Orinoco Flow»), Sigur Rós («Hoppípolla»)",
  },
  {
    id: "intimate",
    es: "Íntimo",
    en: "intimate and close-miked",
    description:
      "Grabación cercana al micrófono (close-miked), dinámica contenida, respiración audible y cercanía acústica de confesión en sala pequeña.",
    reference: "Refs: Billie Eilish («when the party's over»), Silvio Rodríguez («Óleo de una mujer con sombrero»), Chabuca Granda",
  },
  {
    id: "melancholic",
    es: "Melancólico",
    en: "melancholic and restrained",
    description:
      "Dolor contenido, armonías en tonalidad menor, tempo pausado y fraseo expresivo cargado de desgarro contenido y reflexión.",
    reference: "Refs: Adele («Someone Like You»),José José («El Triste»), Radiohead («No Surprises»)",
  },
] as const;

export const KEY_SCALES = [
  { value: "", label: "Sin definir (La IA la determina)" },
  { value: "C minor", label: "C menor (oscuro)" },
  { value: "C# minor", label: "C# menor" },
  { value: "D minor", label: "D menor (serio)" },
  { value: "D# minor", label: "D# menor" },
  { value: "E minor", label: "E menor" },
  { value: "F minor", label: "F menor" },
  { value: "F# minor", label: "F# menor (tensión)" },
  { value: "G minor", label: "G menor" },
  { value: "G# minor", label: "G# menor" },
  { value: "A minor", label: "A menor (melancólico)" },
  { value: "A# minor", label: "A# menor" },
  { value: "B minor", label: "B minor" },
  { value: "C major", label: "C mayor" },
  { value: "C# major", label: "C# mayor" },
  { value: "D major", label: "D mayor (eufórico)" },
  { value: "D# major", label: "D# mayor" },
  { value: "E major", label: "E mayor" },
  { value: "F major", label: "F mayor" },
  { value: "F# major", label: "F# mayor" },
  { value: "G major", label: "G mayor (cálido)" },
  { value: "G# major", label: "G# mayor" },
  { value: "A major", label: "A mayor" },
  { value: "A# major", label: "A# mayor" },
  { value: "B major", label: "B mayor" },
] as const;

export const MUSICAL_MODES = [
  { value: "", label: "Sin modo especial" },
  { value: "Dorian mode", label: "Dórico (groove oscuro)" },
  { value: "Phrygian mode", label: "Frigio (flamenco)" },
  { value: "Lydian mode", label: "Lidio (onírico)" },
  { value: "Mixolydian mode", label: "Mixolidio (blues/funk)" },
  { value: "Locrian mode", label: "Locrio (tensión extrema)" },
] as const;

export interface KeywordOption {
  readonly value: string;
  readonly label: string;
}

export const VOCAL_TECHNIQUES: readonly KeywordOption[] = [
  { value: "breathy, airy delivery", label: "Voz aireada y suave (Breathy)" },
  { value: "powerful belting", label: "Belting potente con proyección" },
  { value: "raspy, textured tone", label: "Tono rasgado y texturizado (Raspy)" },
  { value: "falsetto with soft head voice", label: "Falsete y voz de cabeza suave" },
  { value: "spoken-word intimacy", label: "Hablado íntimo (Spoken Word)" },
  { value: "layered harmonies", label: "Armonías en capas (Harmonies)" },
  { value: "chopped and pitched", label: "Vocal chops y pitched" },
  { value: "clean and forward", label: "Limpia y al frente (Clean)" },
] as const;

export const VOCAL_ATTITUDES: readonly KeywordOption[] = [
  { value: "confident", label: "Segura y con confianza" },
  { value: "vulnerable", label: "Vulnerable y sensible" },
  { value: "aggressive", label: "Agresiva y con fuerza" },
  { value: "dreamy", label: "Soñadora y etérea" },
  { value: "detached", label: "Distante y reflexiva" },
  { value: "playful", label: "Juguetona y alegre" },
  { value: "solemn", label: "Solemne y profunda" },
] as const;

/** Idiomas admitidos para la letra. Los metatags siguen en inglés. */
export const LYRIC_LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
  { value: "pt", label: "Portugués" },
  { value: "es-en", label: "Spanglish (español con estribillo en inglés)" },
] as const;

/** Punto de vista narrativo. */
export const LYRIC_POVS = [
  { value: "primera", label: "Primera persona (yo)" },
  { value: "segunda", label: "Segunda persona (tú, tú y yo)" },
  { value: "tercera", label: "Tercera persona (él / ella)" },
  { value: "observador", label: "Observador externo (como una cámara)" },
  { value: "colectivo", label: "Colectivo (nosotros)" },
] as const;

export const PRODUCTION_KEYWORDS: readonly KeywordOption[] = [
  { value: "punchy drums", label: "Batería con pegada (Punchy)" },
  { value: "dry mix", label: "Mezcla seca y directa" },
  { value: "reverb heavy", label: "Reverb amplia y profunda" },
  { value: "sidechain compression", label: "Compresión sidechain (bombeo)" },
  { value: "tape saturation", label: "Saturación de cinta analógica" },
  { value: "wide stereo image", label: "Imagen estéreo amplia" },
  { value: "cinematic production", label: "Producción cinematográfica" },
  { value: "lo-fi texture", label: "Textura Lo-Fi y vintage" },
  { value: "gated reverb", label: "Reverb con compuerta (Gated)" },
  { value: "analog warmth", label: "Calidez armónica analógica" },
  { value: "acoustic instruments", label: "Instrumentos acústicos orgánicos" },
] as const;

export const EXCLUSIONS = [
  { id: "edm", label: "Nada de EDM", en: "edm, four-on-the-floor" },
  { id: "trap", label: "Nada de trap", en: "trap, hi-hat rolls" },
  { id: "metal", label: "Nada de metal", en: "metal, distorted guitars" },
  { id: "autotune", label: "Sin autotune", en: "autotune, vocal pitch correction" },
  { id: "orchestral", label: "Sin orquesta", en: "orchestral, cinematic strings" },
  { id: "acoustic", label: "Sin acústicos", en: "acoustic guitar, organic instruments" },
  { id: "loud", label: "Sin sobrecompresión", en: "overcompressed master, clipped drums" },
] as const;

const PROFILES: Record<CreativeProfile, { weirdness: number; styleInfluence: number; terms: string[]; note: string }> =
  {
    fiel: {
      weirdness: 30,
      styleInfluence: 90,
      terms: ["transparent bus compression", "gentle tape saturation"],
      note: "Perfil fiel (manual SUNO 6.0: Style Influence 70–90 %, Weirdness 30–50). Máxima obediencia al brief.",
    },
    equilibrado: {
      weirdness: 40,
      styleInfluence: 80,
      terms: ["sidechain compression", "wide stereo image"],
      note: "Perfil equilibrado: respeta el estilo y deja margen creativo dentro del rango recomendado por el manual.",
    },
    experimental: {
      weirdness: 55,
      styleInfluence: 62,
      terms: ["creative bus distortion", "generative modulation"],
      note: "Perfil experimental: por encima de Weirdness 50 el manual advierte dispersión tímbrica y artefactos.",
    },
  };

/* ---------------------------- utilidades -------------------------------- */

const firstPreset = SUNO_PRESETS[0];

/**
 * Infiere la emoción (mood) más coherente cuando el usuario elige "auto" ("Elegido por la IA")
 * analizando el texto de la idea/letra, actitud vocal y preset de género.
 */
export function resolveEffectiveMood(form: {
  moodId?: string;
  idea?: string;
  lyrics?: string;
  cinematic?: string;
  presetId?: string;
  vocalAttitude?: string;
}): MoodDefinition {
  if (form.moodId && form.moodId !== "auto") {
    const found = MOODS.find((m) => m.id === form.moodId);
    if (found) return found;
  }

  const text = `${form.idea ?? ""} ${form.lyrics ?? ""} ${form.cinematic ?? ""}`.toLowerCase();
  const presetId = form.presetId ?? firstPreset.id;

  if (/(furia|rabia|guerra|fuego|romper|grito|pelea|odio|destruir|rebeld|caos)/i.test(text) || form.vocalAttitude === "aggressive") {
    return MOODS.find((m) => m.id === "aggressive")!;
  }
  if (/(noche|sombra|oscur|abismo|miedo|oculto|silencio|frio|frío|veneno|secreto)/i.test(text) || presetId === "trap-oscuro") {
    return MOODS.find((m) => m.id === "dark")!;
  }
  if (/(llorar|lágrima|lagrima|adiós|adios|despedida|soledad|dolor|triste|olvido|ausencia|herida)/i.test(text)) {
    return MOODS.find((m) => m.id === "melancholic")!;
  }
  if (/(recuerdo|ayer|infancia|antes|volver|tiempo|memoria|viejo|aquel|nostalgia)/i.test(text)) {
    return MOODS.find((m) => m.id === "nostalgic")!;
  }
  if (/(fiesta|bailar|celebrar|sol|brillar|alegr|gozar|carnaval|arriba|victoria)/i.test(text) || form.vocalAttitude === "playful") {
    return MOODS.find((m) => m.id === "uplifting")!;
  }
  if (/(susurro|cerca|piel|habitación|habitacion|cama|confesión|confesion|secreto|calma)/i.test(text) || form.vocalAttitude === "vulnerable") {
    return MOODS.find((m) => m.id === "intimate")!;
  }
  if (/(cielo|ángel|angel|cosmos|estrella|vuelo|luz|etére|etere|nube)/i.test(text)) {
    return MOODS.find((m) => m.id === "ethereal")!;
  }

  // Fallback según naturaleza del género
  if (presetId.includes("cumbia-nortena") || presetId === "salsa-clasica" || presetId === "merengue" || presetId === "caporales" || presetId === "festejo") {
    return MOODS.find((m) => m.id === "uplifting")!;
  }
  if (presetId === "bolero-nocturno" || presetId === "vals-criollo" || presetId === "balada-pop") {
    return MOODS.find((m) => m.id === "nostalgic")!;
  }
  if (presetId === "huayno-andino" || presetId === "cumbia-surena") {
    return MOODS.find((m) => m.id === "melancholic")!;
  }
  if (presetId === "rock-alternativo") {
    return MOODS.find((m) => m.id === "dark")!;
  }
  if (presetId === "bossa-jazz") {
    return MOODS.find((m) => m.id === "intimate")!;
  }

  return MOODS.find((m) => m.id === "dreamy")!;
}

/**
 * Determina la tonalidad óptima cuando el usuario deja "Sin definir" (""),
 * combinando el subgénero, la dirección emocional y el registro vocal.
 */
export function inferDefaultKey(form: {
  keyScale?: string;
  presetId?: string;
  moodId?: string;
  vocalGender?: VocalGender;
  idea?: string;
  lyrics?: string;
}): { keyScale: string; autoSelected: boolean } {
  if (form.keyScale && form.keyScale.trim()) {
    return { keyScale: form.keyScale.trim(), autoSelected: false };
  }

  const effectiveMood = resolveEffectiveMood(form);
  const presetId = form.presetId ?? firstPreset.id;
  const isFemale = form.vocalGender === "female";

  if (effectiveMood.id === "uplifting") {
    if (presetId.includes("cumbia") || presetId === "salsa-clasica" || presetId === "merengue") {
      return { keyScale: isFemale ? "D major" : "C major", autoSelected: true };
    }
    return { keyScale: isFemale ? "G major" : "D major", autoSelected: true };
  }
  if (effectiveMood.id === "dark" || effectiveMood.id === "aggressive") {
    if (presetId === "trap-oscuro" || presetId === "reggaeton-perreo") {
      return { keyScale: "C minor", autoSelected: true };
    }
    return { keyScale: isFemale ? "F# minor" : "D minor", autoSelected: true };
  }
  if (effectiveMood.id === "intimate") {
    if (presetId === "bossa-jazz" || presetId === "bolero-nocturno") {
      return { keyScale: isFemale ? "F major" : "D minor", autoSelected: true };
    }
    return { keyScale: isFemale ? "E minor" : "A minor", autoSelected: true };
  }
  if (effectiveMood.id === "nostalgic" || effectiveMood.id === "melancholic") {
    if (presetId === "vals-criollo" || presetId === "bolero-nocturno") {
      return { keyScale: "D minor", autoSelected: true };
    }
    return { keyScale: isFemale ? "B minor" : "A minor", autoSelected: true };
  }

  // Dreamy / Ethereal
  return { keyScale: isFemale ? "E minor" : "A minor", autoSelected: true };
}

export interface DynamicParamResult {
  weirdness: number;
  styleInfluence: number;
  rationale: string;
}

/**
 * Calcula los parámetros óptimos (Weirdness y Style Influence) de forma dinámica
 * en función del género (preset), emoción (mood), palabras clave de producción,
 * perfil creativo y acondicionamiento técnico (SUNO 6.0).
 */
export function calculateDynamicParameters(form: {
  presetId?: string;
  moodId?: string;
  productionKeywords?: string[];
  profile?: CreativeProfile;
  maxMode?: boolean;
  idea?: string;
  lyrics?: string;
}): DynamicParamResult {
  const presetId = form.presetId ?? firstPreset.id;
  const preset = findPreset(presetId) ?? firstPreset;
  const group = preset?.group?.toLowerCase() ?? "";

  // Base según la naturaleza armónica y rítmica del género
  let weirdness = 36;
  let influence = 82;
  const reasons: string[] = [];

  if (group.includes("tradicional") || presetId.includes("vals") || presetId.includes("bolero") || presetId.includes("ranchera")) {
    weirdness = 22;
    influence = 90;
    reasons.push(`${preset.name}: fidelidad armónica alta y baja dispersión rítmica`);
  } else if (group.includes("tropical") || presetId.includes("cumbia")) {
    if (presetId === "cumbia-peruana") {
      weirdness = 44;
      influence = 80;
      reasons.push("Chicha psicodélica: apertura para wah-wah, delays y sintetizador Farfisa");
    } else {
      weirdness = 26;
      influence = 88;
      reasons.push("Cumbia tropical: base rítmica comercial estricta con timbales sincronizados");
    }
  } else if (presetId.includes("rock") || presetId.includes("pop")) {
    weirdness = 32;
    influence = 85;
    reasons.push("Pop-Rock: estructura comercial definida con guitarras al frente");
  } else if (presetId.includes("jazz") || presetId.includes("blues") || presetId.includes("bossa")) {
    weirdness = 48;
    influence = 74;
    reasons.push("Jazz / Bossa: mayor margen de improvisación armónica y modulación");
  } else if (presetId.includes("cinematic") || presetId.includes("ambient") || presetId.includes("lofi")) {
    weirdness = 54;
    influence = 70;
    reasons.push("Cinemático / Textural: texturas etéreas y apertura sonora envolvente");
  } else {
    reasons.push(`${preset.name}: balance dinámico de género`);
  }

  // Modulación por Mood (incluyendo resolución automática si está en 'auto')
  const effectiveMood = resolveEffectiveMood(form);
  const mood = effectiveMood.id;
  if (mood === "dreamy" || mood === "ethereal") {
    weirdness += 8;
    influence -= 4;
    reasons.push("Atmósfera onírica (+8 Weirdness, -4 Influence)");
  } else if (mood === "dark" || mood === "aggressive") {
    weirdness += 4;
    influence += 4;
    reasons.push("Tensión oscura (+4 Influence)");
  } else if (mood === "intimate" || mood === "melancholic") {
    weirdness -= 4;
    influence += 2;
    reasons.push("Intimidad acústica (-4 Weirdness)");
  } else if (mood === "uplifting") {
    weirdness -= 2;
    influence += 4;
    reasons.push("Euforia rítmica (+4 Influence)");
  }

  // Modulación por Etiquetas de Producción
  const kws = form.productionKeywords ?? [];
  if (kws.includes("lo-fi texture")) {
    weirdness += 6;
    reasons.push("Textura Lo-Fi vintage");
  }
  if (kws.includes("cinematic production") || kws.includes("reverb heavy")) {
    weirdness += 4;
    influence -= 2;
  }
  if (kws.includes("punchy drums") || kws.includes("dry mix") || kws.includes("sidechain compression")) {
    influence += 4;
    weirdness -= 4;
    reasons.push("Pegada rítmica tight");
  }

  // Modulación por Perfil Creativo
  const profile = form.profile ?? "equilibrado";
  if (profile === "fiel") {
    weirdness -= 6;
    influence += 8;
    reasons.push("Perfil fiel (+8 Influence, -6 Weirdness)");
  } else if (profile === "experimental") {
    weirdness += 14;
    influence -= 12;
    reasons.push("Perfil experimental (+14 Weirdness, -12 Influence)");
  }

  if (form.maxMode) {
    influence += 3;
    reasons.push("Max Mode (+3 Influence)");
  }

  // Límites recomendados por el manual de SUNO 6.0 (Weirdness 12–74, Influence 55–95)
  const finalWeirdness = Math.max(12, Math.min(74, Math.round(weirdness)));
  const finalInfluence = Math.max(55, Math.min(95, Math.round(influence)));

  return {
    weirdness: finalWeirdness,
    styleInfluence: finalInfluence,
    rationale: reasons.join(" · "),
  };
}

const defaultInitParams = calculateDynamicParameters({
  presetId: firstPreset.id,
  moodId: "auto",
  productionKeywords: [],
  profile: "equilibrado",
});

export const EMPTY_FORM: CompositorForm = {
  idea: "",
  language: "es",
  pov: "primera",
  presetId: firstPreset.id,
  customGenre: "",
  bpm: "",
  keyScale: "",
  musicalMode: "",
  moodId: "auto",
  cinematic: "",
  vocalGender: "",
  vocalTechnique: "",
  vocalAttitude: "",
  productionKeywords: [],
  exclude: [...firstPreset.defaultExclusions],
  maxMode: false,
  vocalEntryHack: false,
  instrumentalBridge: false,
  keepLyrics: false,
  lyrics: "",
  styleOverride: "",
  profile: "equilibrado",
  weirdness: defaultInitParams.weirdness,
  styleInfluence: defaultInitParams.styleInfluence,
};

/** Formulario inicial derivado de un preset concreto. */
export function formForPreset(presetId: string): CompositorForm {
  const preset = findPreset(presetId) ?? firstPreset;
  return {
    ...EMPTY_FORM,
    presetId: preset.id,
    bpm: String(presetBpm(preset)),
    exclude: [...preset.defaultExclusions],
  };
}

function slugTitle(text: string): string {
  const clean = text.replace(/\s+/g, " ").replace(/[^\p{L}\p{N} ]/gu, "").trim();
  if (!clean) return "Sin título";
  return clean.split(" ").slice(0, 6).join(" ").slice(0, SUNO_LIMITS.titleMaxChars);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

/** Recorta partes hasta caber en un límite, sin cortar una parte por la mitad. */
function fitParts(parts: string[], limit: number): string {
  const kept: string[] = [];
  for (const part of parts) {
    const candidate = [...kept, part].join(", ");
    if (candidate.length <= limit) kept.push(part);
  }
  return kept.join(", ");
}

const hasTerm = (text: string, term: string) => text.toLowerCase().includes(term.toLowerCase());

/**
 * Limpia el matiz estilístico de la IA (`styleOverride`) eliminando tokens de BPM,
 * tonalidad, modo, bloques Max Mode, voz o frases idénticas al preset para que
 * cuando el usuario cambie cualquier parámetro en el formulario el `stylePrompt`
 * se actualice en tiempo real sin quedar congelado.
 */
function extractReactiveNuance(rawOverride: string, currentParts: string[]): string {
  if (!rawOverride.trim()) return "";
  const existingLower = currentParts.join(", ").toLowerCase();

  const segments = rawOverride
    .replace(/\[[^\]]+\]/g, "") // quita bloques [is_mode_max], etc.
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const filtered = segments.filter((seg) => {
    const lower = seg.toLowerCase();
    if (/\b\d{2,3}\s*bpm\b/i.test(lower)) return false;
    if (/^[a-g](#|b)?\s+(major|minor)$/i.test(lower)) return false;
    if (/\b(dorian|phrygian|lydian|mixolydian|locrian)\s+mode\b/i.test(lower)) return false;
    if (/\b(female|male|duet)\s+vocals\b/i.test(lower)) return false;
    if (/\binstrumental,\s*no vocals\b/i.test(lower)) return false;
    // Evita duplicar cláusulas que ya están en las partes activas del formulario
    if (existingLower.includes(lower)) return false;
    // Evita repetir cláusulas de otros moods si el usuario acaba de cambiar el mood
    for (const m of MOODS) {
      if (m.en && lower === m.en.toLowerCase()) return false;
    }
    return true;
  });

  return filtered.slice(0, 4).join(", ");
}

/* ----------------------------- compilación ------------------------------ */

/** Ensambla un set de producción completo a partir del formulario en tiempo real. */
export function compileSet(form: CompositorForm): ProductionSet {
  const decisions: Decision[] = [];
  const warnings: string[] = [];
  const notes: string[] = [];

  const preset: SunoPreset = findPreset(form.presetId) ?? firstPreset;
  const profile = PROFILES[form.profile];

  /* ---- Paso 1: género (preset de la casa como base) ---- */
  const refine = form.customGenre.trim();
  decisions.push({
    step: "1 · Género",
    detail: `${preset.name} · ${preset.bpmLabel} BPM${refine ? ` · matiz: “${refine}”` : ""}`,
  });

  /* ---- Paso 2: emoción y contexto ---- */
  const isAutoMood = !form.moodId || form.moodId === "auto";
  const effectiveMood = resolveEffectiveMood(form);
  const cinematic = form.cinematic.trim();
  decisions.push({
    step: "2 · Emoción",
    detail: `${effectiveMood.es}${isAutoMood ? " (elegido automáticamente según el tema/género)" : ""}${
      cinematic ? ` · contexto: “${cinematic}”` : ""
    }`,
  });

  /* ---- Paso 3: instrumentación ---- */
  const extraInstruments = form.productionKeywords.filter((k) => !hasTerm(preset.styleBase, k));
  decisions.push({
    step: "3 · Instrumentación",
    detail: extraInstruments.length
      ? `${preset.instruments.slice(0, 3).join(", ")} + ${extraInstruments.join(", ")}`
      : preset.instruments.slice(0, 4).join(", "),
  });

  /* ---- Paso 4: voz ---- */
  let vocal = "";
  if (form.vocalGender === "instrumental") {
    vocal = "instrumental, no vocals";
  } else if (form.vocalGender) {
    vocal = [
      form.vocalGender === "duet" ? "duet, male and female vocals" : `${form.vocalGender} vocals`,
      form.vocalTechnique,
      form.vocalAttitude ? `${form.vocalAttitude} delivery` : "",
    ]
      .filter(Boolean)
      .join(", ");
  } else if (form.vocalTechnique || form.vocalAttitude) {
    vocal = [form.vocalTechnique, form.vocalAttitude ? `${form.vocalAttitude} delivery` : ""]
      .filter(Boolean)
      .join(", ");
  }
  decisions.push({ step: "4 · Voz", detail: vocal || "no especificada · el modelo decide" });

  /* ---- Paso 5: metadatos técnicos ---- */
  const bpmValue = form.bpm.trim() || String(presetBpm(preset));
  const resolvedKey = inferDefaultKey(form);
  const effectiveKeyScale = resolvedKey.keyScale;
  const technical = unique([
    `${bpmValue} BPM`,
    effectiveKeyScale,
    form.musicalMode,
    ...profile.terms.slice(0, 2),
  ]).join(", ");
  decisions.push({
    step: "5 · Técnica",
    detail: `${technical}${resolvedKey.autoSelected ? " (tonalidad determinada por el motor)" : ""}`,
  });

  const dyn = calculateDynamicParameters(form);
  const finalWeirdness = typeof form.weirdness === "number" ? form.weirdness : dyn.weirdness;
  const finalInfluence = typeof form.styleInfluence === "number" ? form.styleInfluence : dyn.styleInfluence;
  decisions.push({
    step: "Parámetros SUNO 6.0",
    detail: `Weirdness ${finalWeirdness} · Style Influence ${finalInfluence} % (${dyn.rationale}) · Variety 0 (Off)`,
  });

  /* ---- Ensamblado reactivo sobre el style prompt del preset ---- */
  const parts: string[] = [];
  if (form.maxMode) {
    const synthetic = /urbano|trap|edm|electronic/i.test(preset.group);
    const block = ["[is_mode_max]", "[quality_max_max]", "[realness_max_max]"];
    if (!synthetic) block.push("[real_instrument_max_max]");
    parts.push(block.join(" "));
    decisions.push({
      step: "MAX MODE",
      detail: `bloque de acondicionamiento${synthetic ? " (sin real_instrument por ser género sintético)" : ""}`,
    });
  }

  parts.push(preset.styleBase);
  if (refine) parts.push(refine);
  if (effectiveMood.en) parts.push(effectiveMood.en);
  if (extraInstruments.length) parts.push(extraInstruments.join(", "));
  if (vocal) parts.push(vocal);
  if (cinematic) parts.push(`evoking ${cinematic}`);

  const aiNuance = extractReactiveNuance(form.styleOverride, parts);
  if (aiNuance) {
    parts.push(aiNuance);
    decisions.push({
      step: "Matiz IA",
      detail: aiNuance,
    });
  }

  parts.push(technical);

  const stylePrompt = fitParts(parts, SUNO_LIMITS.styleMaxChars);

  /* ---- exclusiones: las del preset + las elegidas ---- */
  const excludeIds = unique([...preset.defaultExclusions, ...form.exclude]);
  const excludes = excludeIds
    .map((id) => EXCLUSIONS.find((e) => e.id === id)?.en)
    .filter((v): v is (typeof EXCLUSIONS)[number]["en"] => typeof v === "string");
  const excludeStyles = fitParts(excludes, SUNO_LIMITS.excludeMaxChars);

  /* ---- letra (reactiva a Puente Instrumental y Entrada Vocal Inmediata) ---- */
  const bridgeTag = form.instrumentalBridge ? `[Bridge: ${preset.instruments[0]} Solo]` : "[Bridge]";
  const scaffold = [
    "[Intro]",
    `(instrumental · ${preset.instruments.slice(0, 2).join(" y ")})`,
    "",
    "[Verse 1]",
    "(pega aquí tu primera estrofa o genera el pack con IA al final del formulario)",
    "",
    "[Pre-Chorus]",
    "(sube la tensión: filtro que abre, armonía que asciende)",
    "",
    "[Chorus]",
    "(el gancho: una sola idea, repetible, sin adjetivos de más)",
    "",
    "[Verse 2]",
    "(cuenta un detalle concreto, no repitas la primera estrofa)",
    "",
    bridgeTag,
    form.instrumentalBridge ? "(solo instrumental, sin voz)" : "(cambio de perspectiva o de armonía)",
    "",
    "[Chorus]",
    "",
    "[Outro]",
    `(${preset.structureHint})`,
    "",
    "[End]",
  ].join("\n");

  let lyrics = form.lyrics.trim() ? form.lyrics.trim() : scaffold;
  if (!form.lyrics.trim()) {
    notes.push(`Esqueleto basado en ${preset.name}: ${preset.structureHint}`);
  } else {
    if (!/\[(intro|verso|verse|coro|chorus|estribillo)/i.test(lyrics)) {
      lyrics = `[Verse 1]\n${lyrics}`;
      notes.push("Tu letra no tenía etiquetas de estructura: se añadió [Verse 1] al principio. Revisa el resto.");
    }
    // Sincronización reactiva del puente instrumental sobre letras ya generadas
    if (form.instrumentalBridge) {
      if (/\[Bridge\]/i.test(lyrics)) {
        lyrics = lyrics.replace(/\[Bridge\]/gi, bridgeTag);
      }
    } else if (/\[Bridge:\s*[^\]]*Solo\]/i.test(lyrics)) {
      lyrics = lyrics.replace(/\[Bridge:\s*[^\]]*Solo\]/gi, "[Bridge]");
    }
  }

  // Sincronización reactiva de Entrada Vocal Inmediata [***]
  const strippedHack = lyrics.replace(/^\[\*\*\*\]\s*(\[start_on_through\]\s*)?/i, "").trim();
  if (form.vocalEntryHack) {
    lyrics = `[***]\n[start_on_through]\n\n${strippedHack}`;
  } else {
    lyrics = strippedHack;
  }

  /* ---- notas de ingeniería ---- */
  const engineerNotes = [
    profile.note,
    `Estilo base del preset «${preset.name}»: ${preset.instruments.join(", ")}. BPM de referencia ${preset.bpmLabel}.`,
    preset.structureHint,
    "Variety a 0 (Off): el manual de SUNO 6.0 confirma que con cualquier otro valor el sistema reescribe el brief antes de generar y deja de respetarlo.",
    `Style Influence ${finalInfluence} % y Weirdness ${finalWeirdness}: ajustados dinámicamente según género, emoción y etiquetas.`,
    "Cierra la letra con [End] para impedir que el motor añada relleno instrumental tras el final natural.",
    "Nada de negaciones en el campo Style («no drums», «without autotune»): se procesan como atención positiva. Van en Exclude Styles.",
    "El campo style va en inglés y admite 1000 caracteres; la densidad técnica importa más que la longitud. La letra va aparte.",
    "Nunca escribas nombres de artistas reales en los campos de Suno: el modelo los ignora y puede contaminar el estilo.",
    form.maxMode
      ? "MAX MODE añade los bloques de acondicionamiento: el manual lo indica en piezas de más de 2 minutos, transferencias de estilo y renders finales."
      : "Si el resultado suena genérico, sube Weirdness en pasos de 10 antes de reescribir el prompt.",
  ];

  /* ---- validación ---- */
  const styleChars = stylePrompt.length;
  const lyricsChars = lyrics.length;
  const excludeChars = excludeStyles.length;
  const styleDense = styleChars > SUNO_LIMITS.styleTargetMaxChars;

  if (styleChars > SUNO_LIMITS.styleMaxChars) {
    warnings.push(`El style prompt (${styleChars}) supera el máximo de Suno (${SUNO_LIMITS.styleMaxChars}).`);
  } else if (styleDense) {
    notes.push(
      `El style prompt tiene ${styleChars} caracteres. El rango óptimo es ${SUNO_LIMITS.styleTargetMinChars}–${SUNO_LIMITS.styleTargetMaxChars}; Suno acepta hasta ${SUNO_LIMITS.styleMaxChars}, pero diluir el estilo suele empeorar el resultado.`,
    );
  }
  if (styleChars < SUNO_LIMITS.styleTargetMinChars) {
    notes.push("El style prompt es muy corto: añade un matiz de género o instrumentación.");
  }
  if (lyricsChars > SUNO_LIMITS.lyricsMaxChars) {
    warnings.push(`La letra tiene ${lyricsChars} caracteres y supera el máximo de ${SUNO_LIMITS.lyricsMaxChars}.`);
  } else if (lyricsChars > SUNO_LIMITS.lyricsWarnChars) {
    notes.push(`La letra está cerca del límite (${lyricsChars}/${SUNO_LIMITS.lyricsMaxChars}).`);
  }
  if (!form.vocalGender) {
    notes.push("No has definido el perfil vocal: el modelo tomará una decisión por su cuenta.");
  }
  if (excludeChars > SUNO_LIMITS.excludeMaxChars) {
    warnings.push("Exclude styles supera la longitud recomendada y Suno puede ignorarlo.");
  }

  const fitsSuno =
    styleChars > 0 &&
    styleChars <= SUNO_LIMITS.styleMaxChars &&
    lyricsChars > 0 &&
    lyricsChars <= SUNO_LIMITS.lyricsMaxChars &&
    excludeChars <= SUNO_LIMITS.excludeMaxChars;

  return {
    title: slugTitle(form.idea || `${preset.name} ${effectiveMood.es}`),
    stylePrompt,
    excludeStyles,
    lyrics,
    weirdness: finalWeirdness,
    styleInfluence: finalInfluence,
    bpm: bpmValue,
    keyScale: effectiveKeyScale,
    effectiveMoodId: effectiveMood.id,
    paramsRationale: dyn.rationale,
    engineerNotes,
    presetName: preset.name,
    decisions,
    checks: {
      styleChars,
      styleLimit: SUNO_LIMITS.styleMaxChars,
      styleDense,
      lyricsChars,
      lyricsLimit: SUNO_LIMITS.lyricsMaxChars,
      excludeChars,
      fitsSuno,
      warnings,
      notes,
    },
  };
}

/* ----------------------------- exportación ------------------------------ */

export interface SunoPack {
  format: "soundlab.sunopack";
  version: 2;
  exportedAt: string;
  owner: string;
  preset: string;
  title: string;
  stylePrompt: string;
  excludeStyles: string;
  lyrics: string;
  weirdness: number;
  styleInfluence: number;
  /** El manual de SUNO 6.0 exige Variety en 0 con briefs detallados. */
  variety: number;
  engineerNotes: string[];
  checks: PackChecks;
}

export function buildPack(set: ProductionSet): SunoPack {
  return {
    format: "soundlab.sunopack",
    version: 2,
    exportedAt: new Date().toISOString(),
    owner: BRAND.legalName,
    preset: set.presetName,
    title: set.title,
    stylePrompt: set.stylePrompt,
    excludeStyles: set.excludeStyles,
    lyrics: set.lyrics,
    weirdness: set.weirdness,
    styleInfluence: set.styleInfluence,
    variety: 0,
    engineerNotes: set.engineerNotes,
    checks: set.checks,
  };
}

export function formatPlainText(set: ProductionSet): string {
  return [
    `${BRAND.full.toUpperCase()} · SET DE PRODUCCIÓN`,
    `PRESET: ${set.presetName}`,
    "",
    `TÍTULO: ${set.title}`,
    "",
    `LYRICS (${set.checks.lyricsChars}/${set.checks.lyricsLimit} caracteres):`,
    set.lyrics,
    "",
    `STYLE PROMPT (${set.checks.styleChars}/${set.checks.styleLimit} caracteres):`,
    set.stylePrompt,
    "",
    "EXCLUDE STYLES:",
    set.excludeStyles || "(ninguno)",
    "",
    `VARIETY: 0 (Off)   |   WEIRDNESS: ${set.weirdness}   |   STYLE INFLUENCE: ${set.styleInfluence}`,
    "",
    "NOTAS DE INGENIERÍA:",
    ...set.engineerNotes.map((n) => `· ${n}`),
  ].join("\n");
}

export function packFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${slug || "tema"}.sunopack.json`;
}
