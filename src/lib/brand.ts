/**
 * ============================================================================
 *  IDENTIDAD DE MARCA — FUENTE ÚNICA DE VERDAD
 * ============================================================================
 *  PROPIEDAD EXCLUSIVA DE URBINA ASESORÍA E INVERSIONES S.A.C.
 *  © 2026 URBINA ASESORÍA E INVERSIONES S.A.C. Todos los derechos reservados.
 *
 *  Este archivo es el ÚNICO lugar del proyecto donde debe escribirse la marca.
 *  Para rebautizar el producto basta con cambiar `wordmark` y `full`.
 *  No escribas el nombre de la marca directamente en componentes o CSS.
 * ============================================================================
 */

const YEAR = new Date().getFullYear();

export const BRAND = {
  /** Razón social completa del titular. No abreviar. */
  legalName: "URBINA ASESORÍA E INVERSIONES S.A.C.",
  /** Marca verbal principal (se muestra en el logotipo). */
  wordmark: "URBINA",
  /** Línea secundaria bajo la marca verbal. */
  sub: "STUDIO",
  /** Nombre comercial completo. */
  full: "URBINA Studio",
  /** Descripción corta del producto. */
  tagline: "Laboratorio de audio: diagnóstico, corrección y trazabilidad en tu navegador.",
  /** Año de inicio de explotación comercial. */
  since: 2026,
  /** Identificador del motor de análisis local. */
  engine: "URBINA-AUDIO · Web Audio DSP v2",
  /** Aviso de copyright corto (pie de página). */
  copyrightShort: `© ${YEAR} ${"URBINA ASESORÍA E INVERSIONES S.A.C."}`,
  /** Aviso de copyright completo (páginas legales y documentos). */
  copyright: `© ${YEAR} URBINA ASESORÍA E INVERSIONES S.A.C. Todos los derechos reservados.`,
  /** Texto largo de titularidad para el informe y las páginas legales. */
  ownership:
    "Este software, su código fuente, su arquitectura, su interfaz gráfica, su motor de análisis de audio " +
    `"${"URBINA-AUDIO"}", su documentación y su marca son propiedad exclusiva de ` +
    "URBINA ASESORÍA E INVERSIONES S.A.C. Queda prohibida su reproducción, distribución, modificación " +
    "o uso comercial sin autorización expresa y por escrito del titular.",
  /** Dirección de contacto pública. Sustituir por la definitiva antes del lanzamiento. */
  email: "contacto@urbina.studio",
  /** Claves de almacenamiento local (IndexedDB y localStorage). */
  storage: {
    db: "urbina-studio",
    dbVersion: 1,
    prefs: "urbina.prefs.v1",
    seeded: "urbina.seeded.v1",
    sidebar: "urbina.sidebar.collapsed",
    model: "urbina.model.v2",
  },
} as const;

/** Nombre del motor en los informes. Mantiene compatibilidad con registros antiguos. */
export const ENGINE_NAME = BRAND.engine;
