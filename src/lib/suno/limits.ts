/**
 * Límites reales de los campos de Suno.
 *
 * Fuente: `docs/knowledge/ingenieria-prompts-suno6.md` (§2, arquitectura
 * tri-campo de SUNO v6) y `shared/limits.json` del motor original. Es la única
 * fuente de verdad: la interfaz, el compositor y el proxy de IA leen de aquí,
 * así que nunca pueden discrepar.
 *
 * © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 */
export const SUNO_LIMITS = {
  /* Campo de letras: el manual de v6 fija 5.000 caracteres. */
  lyricsMaxChars: 5000,
  lyricsTargetChars: 4200,
  lyricsWarnChars: 4600,
  /* Campo de estilo: 1.000 caracteres. */
  styleMaxChars: 1000,
  styleTargetMinChars: 180,
  styleTargetMaxChars: 320,
  /* Campo de exclusión: el manual de v6 fija 1.000 caracteres. */
  excludeMaxChars: 1000,
  titleMaxChars: 80,
  promptMinChars: 3,
  promptMaxChars: 8000,
} as const;

export type SunoLimits = typeof SUNO_LIMITS;

/**
 * Parámetros algorítmicos recomendados por el manual de Suno v6 (§3).
 * El compositor los expone como valores por defecto y el pack los incluye.
 */
export const SUNO_RECOMMENDED = {
  /** Variety reescribe el prompt: con briefs detallados debe ir a cero. */
  variety: 0,
  styleInfluenceMin: 70,
  styleInfluenceMax: 90,
  weirdnessMin: 30,
  weirdnessMax: 50,
  /** Max Mode duplica el cómputo; indicado en piezas de más de dos minutos. */
  maxModeFromSeconds: 120,
  /** Estribillo de 2 a 4 líneas: más allá se diluye el gancho. */
  chorusLinesMax: 4,
  /** Las estrofas admiten hasta 8 líneas antes de pedir cambio de tensión. */
  verseLinesMax: 8,
} as const;
