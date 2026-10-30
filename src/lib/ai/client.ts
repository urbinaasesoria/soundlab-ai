/**
 * Cliente de IA — SoundLab AI
 * © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 *
 * REGLA: aquí NUNCA hay claves. El cliente solo conoce la URL del proxy, que
 * valida, limita y guarda el secreto en el servidor.
 *
 * Si `VITE_AI_PROXY` no está definido, todas las funciones devuelven
 * `{ available: false }` y la interfaz oculta la opción de IA: la app sigue
 * funcionando exactamente igual sin conexión y sin coste.
 */

const PROXY = (import.meta.env.VITE_AI_PROXY as string | undefined)?.replace(/\/$/, "") ?? "";

export interface AiSuggestion {
  stylePrompt: string;
  excludeStyles?: string;
  lyricsNotes?: string;
  rationale: string[];
  warnings?: string[];
  model?: string;
}

export interface AiResult {
  available: boolean;
  ok: boolean;
  suggestion?: AiSuggestion;
  error?: string;
}

export const aiConfigured = Boolean(PROXY);

export async function improveSet(input: {
  set: string;
  preset: string;
  extras?: string;
}): Promise<AiResult> {
  if (!PROXY) return { available: false, ok: false, error: "IA no configurada" };

  try {
    const response = await fetch(`${PROXY}/api/suggest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const detail = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      return { available: true, ok: false, error: detail.error ?? `HTTP ${response.status}` };
    }

    const data = (await response.json()) as AiSuggestion;
    if (typeof data.stylePrompt !== "string" || !data.stylePrompt.trim()) {
      return { available: true, ok: false, error: "respuesta vacía del modelo" };
    }
    return { available: true, ok: true, suggestion: { ...data, rationale: data.rationale ?? [] } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "error de red";
    return { available: true, ok: false, error: message };
  }
}

/* ------------------------- set completo con letra ----------------------- */

export interface AiComposeSuggestion extends AiSuggestion {
  title?: string;
  lyrics: string;
  lyricsNotes?: string;
}

export interface AiComposeResult {
  available: boolean;
  ok: boolean;
  suggestion?: AiComposeSuggestion;
  error?: string;
}

/**
 * Pide a la IA el set completo: estilo, exclusiones y letra original alineada
 * con el género, el BPM, la tonalidad y la emoción. Es lo que se usa cuando el
 * usuario solo aporta una idea o un verso.
 */
export async function composeSet(input: {
  idea: string;
  preset: string;
  set: string;
  stylePrompt: string;
  bpm: string;
  keyScale: string;
  mood: string;
  vocal: string;
  language?: string;
  existingLyrics?: string;
  mode?: "create" | "rewrite";
}): Promise<AiComposeResult> {
  if (!PROXY) return { available: false, ok: false, error: "IA no configurada" };

  try {
    const response = await fetch(`${PROXY}/api/compose`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      const detail = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      return { available: true, ok: false, error: detail.error ?? `HTTP ${response.status}` };
    }

    const data = (await response.json()) as AiComposeSuggestion;
    if (typeof data.lyrics !== "string" || data.lyrics.trim().length < 40) {
      return { available: true, ok: false, error: "la letra devuelta está vacía o es demasiado corta" };
    }
    return {
      available: true,
      ok: true,
      suggestion: { ...data, rationale: data.rationale ?? [] },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "error de red";
    return { available: true, ok: false, error: message };
  }
}
