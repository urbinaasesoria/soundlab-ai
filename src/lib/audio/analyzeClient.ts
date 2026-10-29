/**
 * Cliente del motor de análisis.
 * Ejecuta el DSP en un Web Worker para no bloquear la interfaz y cae al hilo
 * principal si el navegador no soporta workers de módulo.
 * © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 */
import { analyzeTrack, type AnalysisProgress, type AnalysisResult, type DecodedTrack } from "./analyzer";
import type { ExtractOptions } from "./features";

export type AnalyzeTier = "rapido" | "profundo";

export interface AnalyzeOptions {
  tier?: AnalyzeTier;
  signal?: AbortSignal;
  onProgress?: (p: AnalysisProgress) => void;
}

/**
 * Resolución espectral por modo:
 *  - rápido:    FFT 2048 / hop 512  → ~43 Hz por bin, 4× más rápido.
 *  - profundo:  FFT 4096 / hop 512  → ~10.8 Hz por bin, mejor lectura de agudos.
 */
export function tierOptions(tier: AnalyzeTier = "rapido"): Pick<ExtractOptions, "fftSize" | "hopSize"> {
  return tier === "profundo" ? { fftSize: 4096, hopSize: 512 } : { fftSize: 2048, hopSize: 512 };
}

/**
 * Analiza un track en segundo plano. Devuelve una promesa que se resuelve con
 * el informe y se rechaza con `AbortError` si la señal se cancela.
 */
export function analyzeTrackAsync(track: DecodedTrack, options: AnalyzeOptions = {}): Promise<AnalysisResult> {
  const { tier = "rapido", signal, onProgress } = options;
  const featureOptions = tierOptions(tier);

  const supportsWorker = typeof Worker !== "undefined";
  if (!supportsWorker) {
    if (signal?.aborted) return Promise.reject(new DOMException("Cancelado", "AbortError"));
    return analyzeTrack(track, onProgress, featureOptions);
  }

  return new Promise<AnalysisResult>((resolve, reject) => {
    let worker: Worker | null = null;
    let settled = false;

    const cleanup = () => {
      if (worker) {
        worker.terminate();
        worker = null;
      }
      signal?.removeEventListener("abort", onAbort);
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const finish = (result: AnalysisResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };
    function onAbort() {
      fail(new DOMException("Análisis cancelado", "AbortError"));
    }

    if (signal?.aborted) {
      onAbort();
      return;
    }

    try {
      worker = new Worker(new URL("./analyzer.worker.ts", import.meta.url), { type: "module" });
    } catch {
      // Fallback: algunos navegadores bloquean workers de módulo.
      void analyzeTrack(track, onProgress, featureOptions).then(finish).catch(fail);
      return;
    }

    worker.onmessage = (event: MessageEvent<{ type: string; pct?: number; stage?: string; result?: AnalysisResult; message?: string }>) => {
      const msg = event.data;
      if (msg.type === "progress" && typeof msg.pct === "number") {
        onProgress?.({ pct: msg.pct, stage: msg.stage ?? "" });
        return;
      }
      if (msg.type === "done" && msg.result) {
        finish(msg.result);
        return;
      }
      if (msg.type === "error") {
        fail(new Error(msg.message ?? "El análisis falló."));
      }
    };
    worker.onerror = (event) => {
      fail(new Error(event.message || "Error del worker de análisis."));
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    // Se envía una copia estructurada: el hilo principal conserva sus canales.
    worker.postMessage({ type: "analyze", track, options: featureOptions });
  });
}
