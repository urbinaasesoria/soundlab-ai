/**
 * ============================================================================
 *  IDENTIDAD DE MARCA — FUENTE ÚNICA DE VERDAD
 * ============================================================================
 *  PRODUCTO:  SoundLab AI
 *  TITULAR:   URBINA ASESORÍA E INVERSIONES S.A.C.
 *  © 2026 URBINA ASESORÍA E INVERSIONES S.A.C. Todos los derechos reservados.
 *
 *  Este archivo es el ÚNICO lugar del proyecto donde debe escribirse la marca.
 *  Para rebautizar el producto basta con cambiar `wordmark`, `sub` y `full`.
 *  No escribas el nombre del producto directamente en componentes o CSS.
 *
 *  NOTA LEGAL: "SoundLab" es un término descriptivo y genérico; antes de
 *  registrar la marca conviene verificar su disponibilidad en INDECOPI
 *  (clases 9 y 42) y considerar añadir un distintivo propio.
 * ============================================================================
 */

const YEAR = new Date().getFullYear();

export const BRAND = {
  /** Razón social completa del titular. No abreviar. */
  legalName: "URBINA ASESORÍA E INVERSIONES S.A.C.",
  /** CEO y Representante Legal Oficial */
  ceo: "MOISES URBINA SOJO",
  /** Registro Único de Contribuyentes oficial (SUNAT / Perú). ÚNICO RUC VÁLIDO. */
  ruc: "20611424478",
  /** Marca verbal principal (se muestra en el logotipo). */
  wordmark: "SOUNDLAB",
  /** Línea secundaria bajo la marca verbal. */
  sub: "AI",
  /** Nombre comercial completo. */
  full: "SoundLab AI",
  /** Descripción corta del producto. */
  tagline:
    "Copiloto de producción musical asistida por IA: diagnóstico técnico, prompts de Suno y corrección con DSP, todo en tu navegador.",
  /** Año de inicio de explotación comercial. */
  since: 2026,
  /** Identificador del motor de análisis local. */
  engine: "SOUNDLAB-DSP · Web Audio v2",
  /** Aviso de copyright corto (pie de página). */
  copyrightShort: `© ${YEAR} URBINA ASESORÍA E INVERSIONES S.A.C.`,
  /** Aviso de copyright completo (páginas legales y documentos). */
  copyright: `© ${YEAR} URBINA ASESORÍA E INVERSIONES S.A.C. Todos los derechos reservados.`,
  /** Texto largo de titularidad para el informe y las páginas legales. */
  ownership:
    "Este software, su código fuente, su arquitectura, su interfaz gráfica, su motor de análisis de audio " +
    '"SOUNDLAB-DSP", su documentación y su marca son propiedad exclusiva de ' +
    "URBINA ASESORÍA E INVERSIONES S.A.C. Queda prohibida su reproducción, distribución, modificación " +
    "o uso comercial sin autorización expresa y por escrito del titular.",
  /** Dirección de contacto corporativa oficial. */
  email: "info@urbinaaei.com",
  supportEmail: "info@urbinaaei.com",
  companyAddress: "Lima, Perú",
  /** Claves de almacenamiento local (IndexedDB y localStorage). */
  storage: {
    db: "soundlab-ai",
    dbVersion: 1,
    prefs: "soundlab.prefs.v1",
    seeded: "soundlab.seeded.v1",
    sidebar: "soundlab.sidebar.collapsed",
    model: "soundlab.model.v2",
    sunoFavorites: "soundlab.suno.favorites.v1",
  },
} as const;

/** Nombre del motor en los informes. */
export const ENGINE_NAME = BRAND.engine;
