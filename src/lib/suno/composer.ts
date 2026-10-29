/**
 * ============================================================================
 *  COMPOSITOR DE PRODUCCIÓN PARA SUNO — motor determinista
 * ============================================================================
 *  © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 *
 *  Implementa la metodología **PRO FLOW de 5 pasos** del motor original
 *  (Moi-Suno) sin depender de ningún modelo generativo:
 *
 *    1. Precisión de género (inglés, época y subgénero exactos)
 *    2. Dirección emocional y contexto cinematográfico
 *    3. Timbre e instrumentación dirigida (1–3 protagonistas)
 *    4. Arquitectura vocal (género, técnica, actitud) — sin citar artistas
 *    5. Metadatos técnicos (BPM, tonalidad y términos de ingeniería)
 *
 *  Es determinista: la misma entrada produce siempre el mismo set. Cada
 *  decisión se registra en `decisions` para que el resultado sea auditable y
 *  se pueda corregir a mano. No inventa letras: si el usuario no aporta la
 *  suya, devuelve un esqueleto de estructura, nunca versos falsos.
 * ============================================================================
 */
import { SUNO_GENRES, type SunoGenre } from "../data/suno";
import { BRAND } from "../brand";
import { SUNO_LIMITS } from "./limits";

/* ------------------------------- tipos ---------------------------------- */

export type VocalGender = "" | "female" | "male" | "duet" | "instrumental";
export type CreativeProfile = "fiel" | "equilibrado" | "experimental";

export interface CompositorForm {
  /** Idea, tema o letra de partida. */
  idea: string;
  genreId: string;
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
  lyricsChars: number;
  lyricsLimit: number;
  excludeChars: number;
  fitsSuno: boolean;
  warnings: string[];
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
  genreName: string;
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
  { value: "D minor", label: "D menor (serio)" },
  { value: "A minor", label: "A menor (melancólico)" },
  { value: "F# minor", label: "F# menor (tensión)" },
  { value: "E minor", label: "E menor" },
  { value: "G minor", label: "G menor" },
  { value: "G major", label: "G mayor (cálido)" },
  { value: "D major", label: "D mayor (eufórico)" },
  { value: "C major", label: "C mayor" },
  { value: "A major", label: "A mayor" },
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

const PROFILES: Record<CreativeProfile, { weirdness: number; styleInfluence: number; terms: string[]; note: string }> = {
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

/** Términos que identifican instrumentos dentro de las etiquetas del catálogo. */
const INSTRUMENT_HINTS = [
  "guitar",
  "guitars",
  "drums",
  "synth",
  "synths",
  "pads",
  "808",
  "bass",
  "piano",
  "strings",
  "sax",
  "trumpet",
  "organ",
  "arp",
  "arpeggio",
  "percussion",
  "brass",
  "vinyl",
  "brush",
  "tremolo",
  "supersaw",
];

/* ---------------------------- utilidades -------------------------------- */

export const EMPTY_FORM: CompositorForm = {
  idea: "",
  genreId: SUNO_GENRES[0]?.id ?? "",
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
  exclude: [],
  maxMode: false,
  vocalEntryHack: false,
  instrumentalBridge: false,
  keepLyrics: false,
  lyrics: "",
  profile: "equilibrado",
  weirdness: 28,
  styleInfluence: 80,
};

function slugTitle(text: string): string {
  const clean = text
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .trim();
  if (!clean) return "Sin título";
  const words = clean.split(" ").slice(0, 6).join(" ");
  return words.slice(0, SUNO_LIMITS.titleMaxChars);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

/** Recorta una lista de fragmentos hasta caber en un límite de caracteres. */
function fitParts(parts: string[], limit: number): string {
  const kept: string[] = [];
  for (const part of parts) {
    const candidate = [...kept, part].join(", ");
    if (candidate.length <= limit) kept.push(part);
  }
  return kept.join(", ");
}

/* ----------------------------- compilación ------------------------------ */

/** Ensambla un set de producción completo a partir del formulario. */
export function compileSet(form: CompositorForm): ProductionSet {
  const decisions: Decision[] = [];
  const warnings: string[] = [];

  /* ---- Paso 1: género ---- */
  const genre: SunoGenre | undefined = SUNO_GENRES.find((g) => g.id === form.genreId);
  const genreName = form.customGenre.trim() || genre?.name || "Pop";
  const genreTags = genre?.tags ?? [];
  const instrumentTags = genreTags.filter((t) => INSTRUMENT_HINTS.some((h) => t.includes(h))).slice(0, 2);
  const characterTags = genreTags.filter((t) => !instrumentTags.includes(t)).slice(0, 2);

  decisions.push({
    step: "1 · Género",
    detail: `${genreName}${genre ? ` (${genre.bpm})` : ""} · etiquetas: ${unique([...characterTags, ...instrumentTags]).join(", ") || "—"}`,
  });

  /* ---- Paso 2: emoción y contexto ---- */
  const mood = MOODS.find((m) => m.id === form.moodId);
  const emotional = mood ? mood.en : "";
  const cinematic = form.cinematic.trim();
  decisions.push({
    step: "2 · Emoción",
    detail: `${mood?.es ?? "—"}${cinematic ? ` · contexto: “${cinematic}”` : ""}`,
  });

  /* ---- Paso 3: instrumentación ---- */
  const instruments = unique([...instrumentTags, ...form.productionKeywords]).slice(0, 3);
  decisions.push({
    step: "3 · Instrumentación",
    detail: instruments.length ? instruments.join(", ") : "la del género",
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
  decisions.push({
    step: "4 · Voz",
    detail: vocal || "no especificada · el modelo decide",
  });

  /* ---- Paso 5: metadatos técnicos ---- */
  const bpmValue = form.bpm.trim() || (genre?.bpm ?? "").replace(/[^0-9–-]/g, "") || "";
  const profile = PROFILES[form.profile];
  const technical = unique([
    bpmValue ? `${bpmValue} BPM` : "",
    form.keyScale,
    form.musicalMode,
    ...profile.terms.slice(0, 2),
  ]).join(", ");
  decisions.push({
    step: "5 · Técnica",
    detail: technical,
  });

  /* ---- Ensamblado del stylePrompt ---- */
  const parts: string[] = [];
  if (form.maxMode) {
    const synthetic = /edm|electronic|techno|hyperpop|reggaeton|dembow|trap/i.test(genreName);
    const maxBlock = ["[is_mode_max]", "[quality_max_max]", "[realness_max_max]"];
    if (!synthetic) maxBlock.push("[real_instrument_max_max]");
    parts.push(maxBlock.join(" "));
    decisions.push({
      step: "MAX MODE",
      detail: `bloque de metadatos${synthetic ? " (sin real_instrument por ser género sintético)" : ""}`,
    });
  }

  parts.push(`${genreName.toLowerCase()}${characterTags.length ? `, ${characterTags.join(", ")}` : ""}`);
  if (emotional) parts.push(emotional);
  if (instruments.length) parts.push(instruments.join(", "));
  if (vocal) parts.push(vocal);
  if (cinematic) parts.push(`evoking ${cinematic}`);
  if (technical) parts.push(technical);

  const stylePrompt = fitParts(parts, SUNO_LIMITS.styleTargetMaxChars);

  /* ---- excludeStyles ---- */
  const excludes: string[] = form.exclude
    .map((id) => EXCLUSIONS.find((e) => e.id === id)?.en)
    .filter((v): v is (typeof EXCLUSIONS)[number]["en"] => typeof v === "string");
  const excludeStyles = fitParts(excludes, SUNO_LIMITS.excludeMaxChars);

  /* ---- Letra ---- */
  let lyrics = form.keepLyrics ? form.lyrics : form.lyrics;
  if (!lyrics.trim()) {
    lyrics = [
      "[Intro]",
      "(instrumental, define la atmósfera en 4 compases)",
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
      form.instrumentalBridge ? `[Bridge: ${instruments[0] ?? "guitar"} Solo]` : "[Bridge]",
      form.instrumentalBridge ? "(solo instrumental, sin voz)" : "(cambio de perspectiva o de armonía)",
      "",
      "[Chorus]",
      "",
      "[Outro]",
      "(cierre: deja que el último elemento resuene)",
    ].join("\n");
  } else if (!/\[(intro|verse|chorus|estribillo|verso)/i.test(lyrics)) {
    // El usuario aportó la letra sin etiquetas: se conserva intacta y solo se
    // le añade la primera marca de estructura.
    lyrics = `[Verse 1]\n${lyrics.trim()}`;
    warnings.push("Tu letra no tenía etiquetas de estructura: se ha añadido [Verse 1] al principio. Revisa el resto a mano.");
  }

  if (form.vocalEntryHack && !lyrics.startsWith("[***]")) {
    lyrics = `[***]\n[start_on_through]\n\n${lyrics}`;
  }

  if (form.instrumentalBridge && !/solo/i.test(lyrics)) {
    lyrics = lyrics.replace(/\[Chorus\]\n/i, `[Chorus]\n\n[Bridge: ${instruments[0] ?? "guitar"} Solo]\n`);
  }

  /* ---- Notas de ingeniería ---- */
  const engineerNotes = [
    profile.note,
    `Apunta a ${bpmValue ? `${bpmValue} BPM` : "el tempo de tu referencia"} y ${form.keyScale}: son los dos parámetros que Suno respeta con más consistencia.`,
    "El campo style va en inglés y admite 1000 caracteres; la densidad técnica importa más que la longitud. La letra va aparte.",
    "Nunca escribas nombres de artistas reales en los campos de Suno: el modelo los ignora y puede contaminar el estilo.",
    form.maxMode
      ? "MAX MODE añade los bloques de acondicionamiento: úsalo solo cuando necesites fidelidad de instrumento real."
      : "Si el resultado suena genérico, sube Weirdness en pasos de 10 antes de reescribir el prompt.",
  ];

  /* ---- Validación ---- */
  const styleChars = stylePrompt.length;
  const lyricsChars = lyrics.length;
  const excludeChars = excludeStyles.length;

  if (styleChars < SUNO_LIMITS.styleTargetMinChars) {
    warnings.push(
      `El style prompt tiene ${styleChars} caracteres; por debajo de ${SUNO_LIMITS.styleTargetMinChars} Suno suele producir resultados genéricos.`,
    );
  }
  if (styleChars > SUNO_LIMITS.styleMaxChars) warnings.push("El style prompt supera el máximo de Suno.");
  if (lyricsChars > SUNO_LIMITS.lyricsMaxChars) {
    warnings.push(`La letra tiene ${lyricsChars} caracteres y supera el máximo de ${SUNO_LIMITS.lyricsMaxChars}.`);
  } else if (lyricsChars > SUNO_LIMITS.lyricsWarnChars) {
    warnings.push(`La letra está cerca del límite (${lyricsChars}/${SUNO_LIMITS.lyricsMaxChars}).`);
  }
  if (!form.vocalGender) warnings.push("No has definido el perfil vocal: el modelo tomará una decisión por su cuenta.");

  const fitsSuno =
    styleChars > 0 &&
    styleChars <= SUNO_LIMITS.styleMaxChars &&
    lyricsChars > 0 &&
    lyricsChars <= SUNO_LIMITS.lyricsMaxChars &&
    excludeChars <= SUNO_LIMITS.excludeMaxChars;

  return {
    title: slugTitle(form.idea || `${genreName} ${mood?.es ?? ""}`),
    stylePrompt,
    excludeStyles,
    lyrics,
    weirdness: form.weirdness,
    styleInfluence: form.styleInfluence,
    engineerNotes,
    genreName,
    decisions,
    checks: {
      styleChars,
      styleLimit: SUNO_LIMITS.styleMaxChars,
      lyricsChars,
      lyricsLimit: SUNO_LIMITS.lyricsMaxChars,
      excludeChars,
      fitsSuno,
      warnings,
    },
  };
}

/* ----------------------------- exportación ------------------------------ */

export interface SunoPack {
  format: "soundlab.sunopack";
  version: 1;
  exportedAt: string;
  owner: string;
  title: string;
  stylePrompt: string;
  excludeStyles: string;
  lyrics: string;
  weirdness: number;
  styleInfluence: number;
  engineerNotes: string[];
  checks: PackChecks;
}

/** Empaqueta el set en un archivo portable para importar en el flujo propio. */
export function buildPack(set: ProductionSet): SunoPack {
  return {
    format: "soundlab.sunopack",
    version: 1,
    exportedAt: new Date().toISOString(),
    owner: BRAND.legalName,
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

/** Bloque de texto listo para pegar en Suno de una sola vez. */
export function formatPlainText(set: ProductionSet): string {
  return [
    `${BRAND.full.toUpperCase()} · SET DE PRODUCCIÓN`,
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
