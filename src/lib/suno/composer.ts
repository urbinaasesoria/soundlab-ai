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
}

/* ---------------------------- catálogos --------------------------------- */

export const MOODS = [
  { id: "dreamy", es: "Onírico", en: "dreamy, hazy and floating" },
  { id: "dark", es: "Oscuro y denso", en: "dark, brooding and heavy" },
  { id: "uplifting", es: "Eufórico", en: "uplifting and euphoric" },
  { id: "nostalgic", es: "Nostálgico", en: "nostalgic and bittersweet" },
  { id: "aggressive", es: "Agresivo", en: "aggressive and confrontational" },
  { id: "ethereal", es: "Etéreo", en: "ethereal and weightless" },
  { id: "intimate", es: "Íntimo", en: "intimate and close-miked" },
  { id: "melancholic", es: "Melancólico", en: "melancholic and restrained" },
] as const;

export const KEY_SCALES = [
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
  { value: "B minor", label: "B menor" },
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

export const VOCAL_TECHNIQUES = [
  "breathy, airy delivery",
  "powerful belting",
  "raspy, textured tone",
  "falsetto with soft head voice",
  "spoken-word intimacy",
  "layered harmonies",
  "chopped and pitched",
  "clean and forward",
] as const;

export const VOCAL_ATTITUDES = [
  "confident",
  "vulnerable",
  "aggressive",
  "dreamy",
  "detached",
  "playful",
  "solemn",
] as const;

export const PRODUCTION_KEYWORDS = [
  "808 sub",
  "punchy drums",
  "dry mix",
  "reverb heavy",
  "sidechain compression",
  "tape saturation",
  "wide stereo image",
  "cinematic production",
  "lo-fi texture",
  "gated reverb",
  "analog warmth",
  "acoustic instruments",
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
      weirdness: 12,
      styleInfluence: 92,
      terms: ["transparent bus compression", "gentle tape saturation"],
      note: "Perfil fiel: máxima obediencia al style prompt. Ideal cuando ya tienes claro el sonido.",
    },
    equilibrado: {
      weirdness: 28,
      styleInfluence: 80,
      terms: ["sidechain compression", "wide stereo image"],
      note: "Perfil equilibrado: respeta el estilo y deja margen creativo al modelo.",
    },
    experimental: {
      weirdness: 58,
      styleInfluence: 62,
      terms: ["creative bus distortion", "generative modulation"],
      note: "Perfil experimental: más libertad del modelo. Útil para buscar ángulos nuevos.",
    },
  };

/* ---------------------------- utilidades -------------------------------- */

const firstPreset = SUNO_PRESETS[0];

export const EMPTY_FORM: CompositorForm = {
  idea: "",
  presetId: firstPreset.id,
  customGenre: "",
  bpm: "",
  keyScale: "A minor",
  musicalMode: "",
  moodId: "dreamy",
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
  profile: "equilibrado",
  weirdness: 28,
  styleInfluence: 80,
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

/* ----------------------------- compilación ------------------------------ */

/** Ensambla un set de producción completo a partir del formulario. */
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
  const mood = MOODS.find((m) => m.id === form.moodId);
  const cinematic = form.cinematic.trim();
  decisions.push({
    step: "2 · Emoción",
    detail: `${mood?.es ?? "—"}${cinematic ? ` · contexto: “${cinematic}”` : ""}`,
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
  }
  decisions.push({ step: "4 · Voz", detail: vocal || "no especificada · el modelo decide" });

  /* ---- Paso 5: metadatos técnicos ---- */
  const bpmValue = form.bpm.trim() || String(presetBpm(preset));
  const technical = unique([
    `${bpmValue} BPM`,
    form.keyScale,
    form.musicalMode,
    ...profile.terms.slice(0, 2),
  ]).join(", ");
  decisions.push({ step: "5 · Técnica", detail: technical });

  /* ---- Ensamblado sobre el style prompt del preset ---- */
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
  if (mood) parts.push(mood.en);
  if (extraInstruments.length) parts.push(extraInstruments.join(", "));
  if (vocal) parts.push(vocal);
  if (cinematic) parts.push(`evoking ${cinematic}`);
  parts.push(technical);

  const stylePrompt = fitParts(parts, SUNO_LIMITS.styleMaxChars);

  /* ---- exclusiones: las del preset + las elegidas ---- */
  const excludeIds = unique([...preset.defaultExclusions, ...form.exclude]);
  const excludes = excludeIds
    .map((id) => EXCLUSIONS.find((e) => e.id === id)?.en)
    .filter((v): v is (typeof EXCLUSIONS)[number]["en"] => typeof v === "string");
  const excludeStyles = fitParts(excludes, SUNO_LIMITS.excludeMaxChars);

  /* ---- letra ---- */
  const scaffold = [
    "[Intro]",
    `(instrumental · ${preset.instruments.slice(0, 2).join(" y ")})`,
    "",
    "[Verse 1]",
    "(pega aquí tu primera estrofa)",
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
    form.instrumentalBridge ? `[Bridge: ${preset.instruments[0]} Solo]` : "[Bridge]",
    form.instrumentalBridge ? "(solo instrumental, sin voz)" : "(cambio de perspectiva o de armonía)",
    "",
    "[Chorus]",
    "",
    "[Outro]",
    `(${preset.structureHint})`,
  ].join("\n");

  let lyrics = form.lyrics.trim() ? form.lyrics : scaffold;
  if (!form.lyrics.trim()) {
    notes.push(`Esqueleto basado en ${preset.name}: ${preset.structureHint}`);
  } else if (!/\[(intro|verso|verse|coro|chorus|estribillo)/i.test(lyrics)) {
    lyrics = `[Verse 1]\n${lyrics}`;
    notes.push("Tu letra no tenía etiquetas de estructura: se añadió [Verse 1] al principio. Revisa el resto.");
  }

  if (form.vocalEntryHack && !lyrics.startsWith("[***]")) {
    lyrics = `[***]\n[start_on_through]\n\n${lyrics}`;
  }

  /* ---- notas de ingeniería ---- */
  const engineerNotes = [
    profile.note,
    `Estilo base del preset «${preset.name}»: ${preset.instruments.join(", ")}. BPM de referencia ${preset.bpmLabel}.`,
    preset.structureHint,
    "El campo style va en inglés y admite 1000 caracteres; la densidad técnica importa más que la longitud. La letra va aparte.",
    "Nunca escribas nombres de artistas reales en los campos de Suno: el modelo los ignora y puede contaminar el estilo.",
    form.maxMode
      ? "MAX MODE añade los bloques de acondicionamiento: úsalo solo cuando necesites fidelidad de instrumento real."
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
    title: slugTitle(form.idea || `${preset.name} ${mood?.es ?? ""}`),
    stylePrompt,
    excludeStyles,
    lyrics,
    weirdness: form.weirdness,
    styleInfluence: form.styleInfluence,
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
    `STYLE PROMPT (${set.checks.styleChars}/${set.checks.styleLimit} caracteres):`,
    set.stylePrompt,
    "",
    "EXCLUDE STYLES:",
    set.excludeStyles || "(ninguno)",
    "",
    `WEIRDNESS: ${set.weirdness}   |   STYLE INFLUENCE: ${set.styleInfluence}`,
    "",
    `LETRA (${set.checks.lyricsChars}/${set.checks.lyricsLimit} caracteres):`,
    set.lyrics,
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
