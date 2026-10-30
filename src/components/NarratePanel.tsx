/**
 * Informe narrado por IA.
 * © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 *
 * Envía al proxy un resumen compacto del informe (nunca el audio ni las
 * matrices de waveform) y muestra la explicación con las acciones priorizadas.
 * No recalcula nada: interpreta las cifras que ya produjo el DSP.
 */
import { useState } from "react";
import { aiConfigured, narrateReport, type NarrateAction, type NarrateFinding } from "../lib/ai/client";

const severityClass = (severity?: string) =>
  severity === "alta" || severity === "high" ? "is-high" : severity === "baja" || severity === "low" ? "is-low" : "is-mid";

export function NarratePanel({ result }: { result: unknown }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    headline: string;
    summary: string;
    findings: NarrateFinding[];
    actions: NarrateAction[];
    disclaimer?: string;
    model?: string;
  } | null>(null);

  if (!aiConfigured) return null;

  const buildPayload = () => {
    const source = result as Record<string, any>;
    const ai = source.ai ?? {};
    const loudness = source.loudness ?? {};
    const stereo = source.stereo ?? {};
    const tonal = source.tonal ?? {};
    const rhythm = source.rhythm ?? {};
    return {
      motor: source.engine ?? null,
      archivo: source.file?.name ?? null,
      indice: {
        probabilidad: ai.probability ?? null,
        zona: ai.zone ?? null,
        confianza: ai.confidence ?? null,
        version: ai.modelVersion ?? null,
        calibrado: ai.calibrated ?? null,
        senales: ai.drivers ?? [],
      },
      loudness: {
        lufs: loudness.lufs ?? null,
        picoReal: loudness.truePeak ?? null,
        lra: loudness.lra ?? null,
        crest: loudness.crest ?? null,
        plr: loudness.plr ?? null,
        sueloRuido: loudness.noiseFloor ?? null,
        silencio: loudness.silenceRatio ?? null,
      },
      estereo: {
        ancho: stereo.width ?? null,
        correlacion: stereo.correlation ?? null,
        balance: stereo.balance ?? null,
        mono: stereo.isMono ?? null,
      },
      tonalidad: { tono: tonal.key ?? null, bordeAgudos: tonal.hfCutoff ?? null },
      ritmo: { bpm: rhythm.bpm ?? null, jitterMs: rhythm.jitterMs ?? null, rejilla: rhythm.gridLock ?? null },
      recomendaciones: (source.recommendations ?? []).map((r: any) => r?.title ?? r).slice(0, 8),
    };
  };

  const run = async () => {
    setBusy(true);
    setError(null);
    const response = await narrateReport(buildPayload());
    setBusy(false);
    if (!response.ok || !response.headline) {
      setError(response.error ?? "La IA no devolvió una explicación.");
      return;
    }
    setData({
      headline: response.headline,
      summary: response.summary ?? "",
      findings: response.findings ?? [],
      actions: response.actions ?? [],
      disclaimer: response.disclaimer,
      model: response.model,
    });
  };

  return (
    <section className="narrate-panel">
      <div className="narrate-panel__head">
        <div>
          <span className="eyebrow">COPILOTO · INFORME NARRADO</span>
          <b>Que te lo explique un ingeniero</b>
        </div>
        <button className="btn btn--gold btn--sm" onClick={() => void run()} disabled={busy}>
          {busy ? "Leyendo el informe…" : data ? "Volver a explicar" : "Explicar este informe"}
        </button>
      </div>

      {error && <p className="narrate-panel__error">{error}</p>}

      {data && (
        <div className="narrate-body">
          <h3 className="narrate-body__headline">{data.headline}</h3>
          <p className="narrate-body__summary">{data.summary}</p>

          {data.findings.length > 0 && (
            <div className="narrate-block">
              <span className="mono">DIAGNÓSTICO</span>
              <ul className="narrate-findings">
                {data.findings.map((finding) => (
                  <li key={finding.title} className={severityClass(finding.severity)}>
                    <b>{finding.title}</b>
                    <p>{finding.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.actions.length > 0 && (
            <div className="narrate-block">
              <span className="mono">QUÉ HACER, POR ORDEN</span>
              <ol className="narrate-actions">
                {data.actions.map((action, index) => (
                  <li key={action.title}>
                    <span className="narrate-actions__num mono">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <b>{action.title}</b>
                      <p>{action.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <p className="narrate-body__foot">
            {data.disclaimer ?? "Lectura automática sobre las cifras medidas; el oído manda."}
            {data.model ? ` · ${data.model}` : ""}
          </p>
        </div>
      )}
    </section>
  );
}
