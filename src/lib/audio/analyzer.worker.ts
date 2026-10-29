/**
 * Web Worker del motor de análisis.
 * Mantiene el hilo de interfaz libre durante el procesado DSP.
 * © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 */
import { analyzeTrack, type AnalysisResult, type DecodedTrack, type AnalysisProgress } from "./analyzer";
import type { ExtractOptions } from "./features";

export interface AnalyzeRequest {
  type: "analyze";
  track: DecodedTrack;
  options?: Pick<ExtractOptions, "fftSize" | "hopSize">;
}

export type AnalyzeResponse =
  | { type: "progress"; pct: number; stage: string }
  | { type: "done"; result: AnalysisResult }
  | { type: "error"; message: string };

interface WorkerScope {
  onmessage: ((event: MessageEvent<AnalyzeRequest>) => void) | null;
  postMessage: (message: AnalyzeResponse) => void;
}

const ctx = self as unknown as WorkerScope;

ctx.onmessage = async (event: MessageEvent<AnalyzeRequest>) => {
  const data = event.data;
  if (!data || data.type !== "analyze") return;
  try {
    const onProgress = (p: AnalysisProgress) =>
      ctx.postMessage({ type: "progress", pct: p.pct, stage: p.stage });
    const result = await analyzeTrack(data.track, onProgress, data.options);
    ctx.postMessage({ type: "done", result });
  } catch (err) {
    ctx.postMessage({
      type: "error",
      message: err instanceof Error ? err.message : "El análisis falló en el worker.",
    });
  }
};
