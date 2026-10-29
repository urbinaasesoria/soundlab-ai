/**
 * Límites reales de los campos de Suno.
 *
 * Portado de `shared/limits.json` del motor original (Moi-Suno). Es la única
 * fuente de verdad: la validación de la interfaz y las notas del informe leen
 * de aquí, así que nunca pueden discrepar.
 *
 * © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 */
export const SUNO_LIMITS = {
  lyricsMaxChars: 3000,
  lyricsTargetChars: 2800,
  lyricsWarnChars: 2500,
  styleMaxChars: 1000,
  styleTargetMinChars: 180,
  styleTargetMaxChars: 320,
  excludeMaxChars: 300,
  titleMaxChars: 80,
  promptMinChars: 3,
  promptMaxChars: 8000,
} as const;

export type SunoLimits = typeof SUNO_LIMITS;
