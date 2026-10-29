import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AudioWaveform,
  Check,
  Download,
  FileAudio,
  Info,
  Lock,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { type AnalysisResult, type DecodedTrack } from "../lib/audio/analyzer";
import { analyzeTrackAsync } from "../lib/audio/analyzeClient";
import { decodeFile, sliceTrack } from "../lib/audio/decode";
import {
  DEFAULT_HUMANIZE,
  encodeWav,
  renderHumanized,
  type HumanizeParams,
} from "../lib/audio/wav";
import { getAudio } from "../lib/storage/db";
import { useStudio } from "../lib/storage/store";
import { COST, type RenderRecord, type ScanRecord } from "../lib/storage/types";
import {
  downloadBlob,
  downloadSavedAudio,
  formatBytes,
  formatDuration,
  formatNumber,
  prettyName,
} from "../lib/utils";
import { Dropzone } from "../components/Dropzone";
import { AudioPlayer } from "../components/AudioPlayer";
import { ScoreRing } from "../components/ScoreRing";

type Phase = "idle" | "decoding" | "ready" | "rendering" | "done" | "error";

const PRESETS: { id: string; name: string; blurb: string; params: HumanizeParams }[] = [
  {
    id: "natural",
    name: "Natural",
    blurb: "Micro-variaciones para que el master no suene a plantilla.",
    params: { intensity: 0.35, wow: 0.2, noise: 0.16, saturation: 0.16, width: 0.24, air: 0.2, transient: 0.28 },
  },
  {
    id: "cinta",
    name: "Cinta",
    blurb: "Saturación suave, deriva y aire de grabación analógica.",
    params: { intensity: 0.62, wow: 0.5, noise: 0.4, saturation: 0.54, width: 0.32, air: 0.36, transient: 0.3 },
  },
  {
    id: "lofi",
    name: "Lo-fi",
    blurb: "Wow & flutter marcado, ruido de sala y agudos recortados.",
    params: { intensity: 0.82, wow: 0.78, noise: 0.72, saturation: 0.48, width: 0.16, air: 0.08, transient: 0.18 },
  },
  {
    id: "sutil",
    name: "Sutil",
    blurb: "Casi imperceptible: ideal para un máster ya terminado.",
    params: { intensity: 0.18, wow: 0.12, noise: 0.08, saturation: 0.1, width: 0.12, air: 0.12, transient: 0.14 },
  },
];

const KNOBS: { key: keyof HumanizeParams; label: string; hint: string; icon?: boolean }[] = [
  { key: "intensity", label: "Intensidad global", hint: "Escala el resto de procesos. A 0, el audio sale intacto." },
  { key: "wow", label: "Wow & flutter", hint: "Deriva de velocidad y temblor de tono, como un cassette." },
  { key: "transient", label: "Transitorios", hint: "Realza los ataques para recuperar pegada orgánica." },
  { key: "saturation", label: "Saturación de cinta", hint: "Armónicos suaves y compresión natural de la cinta." },
  { key: "width", label: "Amplitud estéreo", hint: "Abre o cierra el campo M/S sin tocar el centro." },
  { key: "air", label: "Aire", hint: "Realce de agudos por encima de 7,8 kHz." },
  { key: "noise", label: "Ruido de sala", hint: "Suelo de ruido analógico decorrelacionado entre canales." },
];

const round = (n: number, d = 1) => Number(n.toFixed(d));

/**
 * Verificación automática del render: compara el índice y cada señal antes y
 * después para no presentar como mejora algo que en realidad ha empeorado.
 * © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 */
function buildVerification(before: AnalysisResult, after: AnalysisResult) {
  const improved: string[] = [];
  const worsened: string[] = [];
  for (const signal of before.ai.signals) {
    const next = after.ai.signals.find((s) => s.id === signal.id);
    if (!next) continue;
    const diff = next.value - signal.value;
    if (diff <= -1.5) improved.push(signal.label.toLowerCase());
    else if (diff >= 1.5) worsened.push(signal.label.toLowerCase());
  }
  return {
    delta: round(after.ai.probability - before.ai.probability, 1),
    improved: improved.slice(0, 4),
    worsened: worsened.slice(0, 4),
  };
}

export function HumanizerPage() {
  const { prefs, projects, scans, saveRender, spend, addCredits, toast } = useStudio();
  const [params] = useSearchParams();
  const projectFilter = params.get("project");
  const audioScans = useMemo(() => scans.filter((s) => s.audioId).sort((a, b) => b.createdAt - a.createdAt), [scans]);
  const relevantScans = useMemo(
    () => (projectFilter ? audioScans.filter((s) => s.projectId === projectFilter) : audioScans),
    [audioScans, projectFilter],
  );

  const [phase, setPhase] = useState<Phase>("idle");
  const [sourceScan, setSourceScan] = useState<ScanRecord | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [track, setTrack] = useState<DecodedTrack | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [before, setBefore] = useState<AnalysisResult | null>(null);
  const [after, setAfter] = useState<AnalysisResult | null>(null);
  const [saved, setSaved] = useState<RenderRecord | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [humanize, setHumanize] = useState<HumanizeParams>(DEFAULT_HUMANIZE);
  const [preset, setPreset] = useState("personalizado");
  const [progress, setProgress] = useState({ pct: 0, stage: "Preparando" });
  const resultRef = useRef<HTMLDivElement | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);

  const project = sourceScan
    ? projects.find((p) => p.id === sourceScan.projectId)
    : projectFilter
      ? projects.find((p) => p.id === projectFilter)
      : undefined;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (processedUrl) URL.revokeObjectURL(processedUrl);
    };
  }, [processedUrl]);

  useEffect(() => {
    if (phase === "done" && outputRef.current) {
      outputRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (phase === "rendering" && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [phase]);

  const resetOutput = () => {
    setBefore(null);
    setAfter(null);
    setSaved(null);
    setProcessedBlob(null);
    setProcessedUrl(null);
    setError(null);
    setPhase("idle");
    setProgress({ pct: 0, stage: "Preparando" });
  };

  const loadFile = async (next: File, existing?: ScanRecord) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
    setSourceScan(existing ?? null);
    setTrack(null);
    setBefore(null);
    setAfter(null);
    setSaved(null);
    setProcessedBlob(null);
    setProcessedUrl(null);
    setError(null);
    setPhase("decoding");
    try {
      const decoded = await decodeFile(next);
      setTrack(decoded);
      setPhase("ready");
      setBefore(existing?.result ?? null);
      toast(
        `“${next.name}” listo · ${formatDuration(decoded.duration)} · ${decoded.numberOfChannels === 1 ? "mono" : "estéreo"}`,
        "ok",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo decodificar el audio.");
      setPhase("error");
    }
  };

  const loadStored = async (scanId: string) => {
    const scan = scans.find((s) => s.id === scanId);
    if (!scan?.audioId) return;
    try {
      const entry = await getAudio(scan.audioId);
      if (!entry) {
        toast("El audio de ese análisis ya no está en el almacenamiento local.", "err");
        return;
      }
      const next = new File([entry.blob], entry.name, { type: entry.mime || scan.result.file.mime });
      await loadFile(next, scan);
    } catch {
      toast("No se pudo recuperar el audio guardado.", "err");
    }
  };

  const applyPreset = (id: string) => {
    const found = PRESETS.find((p) => p.id === id);
    if (!found) return;
    setPreset(id);
    setHumanize(found.params);
  };

  const updateKnob = (key: keyof HumanizeParams, value: number) => {
    setPreset("personalizado");
    setHumanize((prev) => ({ ...prev, [key]: value }));
  };

  const process = async () => {
    if (!track || !file) return;
    if (!spend(COST.humanizer, "la humanización")) return;
    setPhase("rendering");
    setError(null);
    setProgress({ pct: 2, stage: "Preparando señal" });
    try {
      const rendered = await renderHumanized(track.channels, track.sampleRate, humanize, {
        onProgress: (pct, stage) => setProgress({ pct: Math.round(pct * 0.5), stage }),
      });
      const blob = encodeWav(rendered, track.sampleRate);
      const objectUrl = URL.createObjectURL(blob);

      setProgress({ pct: 52, stage: "Midiendo el antes" });
      const sampleSeconds = Math.min(45, track.duration);
      const beforeResult =
        sourceScan?.result ??
        (await analyzeTrackAsync(sliceTrack(track, sampleSeconds), {
          tier: "rapido",
          onProgress: (p) =>
            setProgress({ pct: 52 + Math.round(p.pct * 0.2), stage: `Original · ${p.stage}` }),
        }));

      setProgress({ pct: 74, stage: "Midiendo la versión humanizada" });
      const renderedTrack: DecodedTrack = {
        ...track,
        duration: rendered[0].length / track.sampleRate,
        channels: rendered,
      };
      const afterResult = await analyzeTrackAsync(sliceTrack(renderedTrack, sampleSeconds), {
        tier: "rapido",
        onProgress: (p) =>
          setProgress({ pct: 74 + Math.round(p.pct * 0.2), stage: `Humanizado · ${p.stage}` }),
      });

      setProgress({ pct: 96, stage: "Guardando WAV 24-bit" });
      const record = await saveRender({
        projectId: sourceScan?.projectId ?? projectFilter ?? undefined,
        scanId: sourceScan?.id,
        kind: "humanizer",
        label: `${prettyName(file.name)} · Humanizado`,
        channels: rendered,
        sampleRate: track.sampleRate,
        duration: renderedTrack.duration,
        params: humanize,
        before: beforeResult,
        after: afterResult,
        blob,
      });

      setBefore(beforeResult);
      setAfter(afterResult);
      setProcessedBlob(blob);
      setProcessedUrl(objectUrl);
      setSaved(record);
      setProgress({ pct: 100, stage: "Listo" });
      setPhase("done");
      toast("Versión humanizada generada y guardada como WAV 24-bit.", "ok");
    } catch (err) {
      addCredits(COST.humanizer, "Reembolso de la humanización");
      setError(err instanceof Error ? err.message : "No se pudo procesar el audio.");
      setPhase("ready");
      toast("La humanización falló. Se devolvieron los créditos.", "err");
    }
  };

  const canProcess = phase === "ready" && track && prefs.credits >= COST.humanizer;
  const verification = before && after ? buildVerification(before, after) : null;

  return (
    <div className="page humanizer">
      <div className="page-head page-head--center">
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>DSP LOCAL · BETA</div>
          <h1>Humanizador</h1>
          <p className="page-head__sub">
            Añade micro-variaciones reales a tu master: wow & flutter, transitorios, cinta, aire y sala. Todo se procesa
            en tu navegador y sale como WAV de 24 bits.
          </p>
        </div>
      </div>

      <div className="improvement-note">
        <Sparkles size={16} />
        <div>
          <b>Mejora respecto a la app original</b>
          <p>
            En la versión original el Humanizador estaba «EN PAUSA». Aquí es un procesador DSP funcional: no prometemos evadir
            detectores, sino devolver irregularidades orgánicas medibles. El audio nunca sale de tu equipo.
          </p>
        </div>
        <span className="chip chip--emerald">FUNCIONAL</span>
      </div>

      {phase === "idle" || phase === "error" ? (
        <div className="humanizer-source stack-4">
          {relevantScans.length > 0 && (
            <div className="chart-card">
              <div className="chart-head">
                <span className="chart-title">Usar un audio guardado</span>
                <span className="chart-note">INDEXEDDB · LOCAL</span>
              </div>
              <div className="source-list">
                {relevantScans.slice(0, 6).map((s) => {
                  const p = projects.find((item) => item.id === s.projectId);
                  return (
                    <button key={s.id} className="source-item" onClick={() => loadStored(s.id)}>
                      <span className="source-item__icon"><FileAudio size={16} /></span>
                      <span className="source-item__body">
                        <span className="source-item__name">{p?.trackName ?? s.result.file.name}</span>
                        <span className="source-item__meta mono">
                          {s.result.file.name} · {formatDuration(s.result.file.duration)} · {formatBytes(s.result.file.size)}
                        </span>
                      </span>
                      <span className="chip chip--emerald">CARGAR</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Dropzone
            onFile={loadFile}
            onReject={(m) => toast(m, "err")}
            title={<>Arrastra tu <u>master</u> aquí o explora</>}
            hint={
              project
                ? `El render se guardará en ${project.trackName}. El original no se modifica: el humanizador trabaja sobre una copia.`
                : "El original no se modifica: el humanizador trabaja sobre una copia en memoria."
            }
            meta="MP3 · WAV · FLAC · AIFF · M4A · SIN LÍMITE DE DURACIÓN LOCAL"
          />

          {phase === "error" && (
            <div className="callout callout--danger">
              <Info size={18} />
              <div>
                <b>No se pudo procesar el archivo</b>
                <p>{error}</p>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={resetOutput}>Reintentar</button>
            </div>
          )}
        </div>
      ) : phase === "decoding" ? (
        <div className="analysis-panel analysis-running" style={{ marginTop: 20 }}>
          <span className="spinner spinner--lg" />
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>LEYENDO PCM</div>
            <h2 className="analysis-panel__title">Decodificando audio…</h2>
            <p className="analysis-panel__sub">Preparando los canales para el procesador local.</p>
          </div>
        </div>
      ) : phase === "rendering" ? (
        <div className="analysis-panel analysis-running" style={{ marginTop: 20 }} ref={resultRef}>
          <div
            className="progress-ring"
            style={{ background: `conic-gradient(var(--emerald) ${progress.pct * 3.6}deg, var(--line-strong) 0)` }}
            role="img"
            aria-label={`Progreso ${progress.pct}%`}
          >
            <div className="progress-ring__inner">
              <span className="progress-ring__pct">{progress.pct}%</span>
              <span className="progress-ring__label">PROCESANDO</span>
            </div>
          </div>
          <div className="analysis-panel__body">
            <div className="eyebrow" style={{ marginBottom: 8 }}>HUMANIZADOR · DSP LOCAL</div>
            <h2 className="analysis-panel__title">{progress.stage}</h2>
            <p className="analysis-panel__sub">
              {file?.name} · {formatDuration(track?.duration ?? 0)} · WAV 24-bit al terminar
            </p>
            <div className="process-steps">
              {[
                ["Render DSP", 50],
                ["Análisis del original", 72],
                ["Análisis de la versión", 94],
                ["Guardado local", 100],
              ].map(([label, at]) => {
                const reached = progress.pct >= Number(at);
                return (
                  <div className={`process-step ${reached ? "is-done" : ""}`} key={String(label)}>
                    {reached ? <Check size={12} /> : <span className="process-step__dot" />}
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="humanizer-workbench" ref={resultRef}>
          <div className="humanizer-filebar">
            <span className="chip chip--emerald"><Check size={11} /> DECODIFICADO</span>
            <span className="humanizer-filebar__name">{file?.name}</span>
            <span className="humanizer-filebar__meta mono">
              {formatBytes(file?.size ?? 0)} · {formatDuration(track?.duration ?? 0)} ·{" "}
              {(track?.sampleRate ?? 0) / 1000} kHz · {track?.numberOfChannels === 1 ? "MONO" : "ESTÉREO"}
            </span>
            <button className="btn btn--ghost btn--sm" onClick={() => { resetOutput(); setFile(null); setTrack(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}>
              <X size={13} /> Cambiar archivo
            </button>
          </div>

          <div className="humanizer-grid">
            <div className="chart-card">
              <div className="chart-head">
                <span className="chart-title">Carácter</span>
                <span className="chart-note">PRESETS LOCALES</span>
              </div>
              <div className="preset-grid">
                {PRESETS.map((p) => (
                  <button key={p.id} className={`preset-card ${preset === p.id ? "is-active" : ""}`} onClick={() => applyPreset(p.id)}>
                    <span className="preset-card__name">{p.name}</span>
                    <span className="preset-card__blurb">{p.blurb}</span>
                  </button>
                ))}
              </div>
              <div className="divider" />
              <div className="row-flex" style={{ justifyContent: "space-between" }}>
                <span className="chart-note" style={{ letterSpacing: 0 }}>Ajuste fino</span>
                <button className="link link--mono" onClick={() => { setHumanize(DEFAULT_HUMANIZE); setPreset("personalizado"); }}>
                  <RefreshCw size={11} /> Restablecer
                </button>
              </div>
              <div className="knob-list">
                {KNOBS.map((knob) => (
                  <label className="knob" key={knob.key}>
                    <span className="knob__head">
                      <span className="knob__label">{knob.label}</span>
                      <span className="knob__value mono">{Math.round(humanize[knob.key] * 100)}%</span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={humanize[knob.key]}
                      onChange={(e) => updateKnob(knob.key, Number(e.target.value))}
                      className="range-input"
                      style={{ "--fill": `${humanize[knob.key] * 100}%` } as CSSProperties}
                    />
                    <span className="knob__hint">{knob.hint}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="stack-4">
              <div className="chart-card">
                <div className="chart-head">
                  <span className="chart-title">Original</span>
                  <span className="chart-note">SIN PROCESAR</span>
                </div>
                <AudioPlayer srcUrl={previewUrl ?? undefined} name={file?.name ?? "Original"} duration={track?.duration ?? 0} peaks={before?.waveform.peaks} note="ORIGINAL" />
                {before && (
                  <div className="mini-metrics">
                    <div><span>Índice IA</span><b>{before.ai.probability.toFixed(1)}%</b></div>
                    <div><span>LUFS</span><b>{before.loudness.lufs.toFixed(1)}</b></div>
                    <div><span>Pico real</span><b>{before.loudness.truePeak.toFixed(2)} dBTP</b></div>
                    <div><span>LRA</span><b>{before.loudness.lra.toFixed(1)} LU</b></div>
                  </div>
                )}
                <div className="inline-note" style={{ marginTop: 14 }}>
                  <Info size={14} />
                  <span>{sourceScan ? "Se reutiliza el análisis guardado del track." : "El «antes» se calcula sobre los primeros 45 s para comparar rápido."}</span>
                </div>
              </div>

              <div className="chart-card humanizer-run">
                <div className="chart-head">
                  <span className="chart-title">Generar versión</span>
                  <span className="chart-note">WAV 24-BIT</span>
                </div>
                <div className="statlines">
                  <div><span>Coste</span><b>{COST.humanizer} créditos</b></div>
                  <div><span>Destino</span><b>{project?.trackName ?? "Sin proyecto"}</b></div>
                  <div><span>Saldo</span><b>{formatNumber(prefs.credits)}</b></div>
                </div>
                <button className="btn btn--primary btn--block" style={{ marginTop: 14 }} onClick={process} disabled={!canProcess}>
                  <AudioWaveform size={15} /> Humanizar track
                </button>
                {prefs.credits < COST.humanizer && (
                  <div className="inline-warn">
                    No tienes créditos suficientes. <Link to="/billing">Compra o activa Pro</Link>.
                  </div>
                )}
                <p className="chart-note" style={{ marginTop: 12, letterSpacing: 0, lineHeight: 1.7 }}>
                  El render es determinista: mismos parámetros y mismo archivo producen el mismo WAV. No se usa ningún
                  modelo generativo ni se envía audio a un servidor.
                </p>
              </div>

              <div className="chart-card">
                <div className="row-flex" style={{ alignItems: "flex-start" }}>
                  <SlidersHorizontal size={16} color="var(--gold-ink)" style={{ marginTop: 2, flex: "none" }} />
                  <div>
                    <div className="chart-title">Qué hace cada control</div>
                    <p className="chart-note" style={{ marginTop: 8, letterSpacing: 0, lineHeight: 1.7 }}>
                      La intensidad global multiplica todos los procesos. Si subes wow & flutter y saturación a la vez,
                      el master se acerca al carácter de cinta; si subes aire y anchura, gana espacio y brillo.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {phase === "done" && after && before && saved && (
            <div className="humanizer-result stack-4" ref={outputRef}>
              <div className="chart-card">
                <div className="chart-head">
                  <span className="chart-title">Antes / después</span>
                  <span className="chart-note">MISMO MOTOR · MISMO TRAMO</span>
                </div>
                <div className="ab-grid">
                  <div className="ab-side">
                    <span className="ab-side__label">ORIGINAL</span>
                    <ScoreRing
                      value={before.ai.probability}
                      label="PROBABILIDAD IA"
                      display={`${Math.round(before.ai.probability)}%`}
                      tone={before.ai.probability > 50 ? "gold" : "emerald"}
                      size={118}
                      small
                    />
                    <div className="ab-side__stats mono">
                      <span>{before.loudness.lufs.toFixed(1)} LUFS</span>
                      <span>{before.loudness.truePeak.toFixed(2)} dBTP</span>
                      <span>LRA {before.loudness.lra.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="ab-arrow">→</div>
                  <div className="ab-side">
                    <span className="ab-side__label ab-side__label--emerald">HUMANIZADO</span>
                    <ScoreRing
                      value={after.ai.probability}
                      label="PROBABILIDAD IA"
                      display={`${Math.round(after.ai.probability)}%`}
                      tone={after.ai.probability < before.ai.probability ? "emerald" : "gold"}
                      size={118}
                      small
                    />
                    <div className="ab-side__stats mono">
                      <span>{after.loudness.lufs.toFixed(1)} LUFS</span>
                      <span>{after.loudness.truePeak.toFixed(2)} dBTP</span>
                      <span>LRA {after.loudness.lra.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                <div className="ab-verdict">
                  <span className={`chip chip--${verification && verification.delta < 0 ? "emerald" : "gold"}`}>
                    {!verification
                      ? "SIN MEDICIÓN"
                      : verification.delta < -0.5
                        ? `ÍNDICE ${Math.abs(verification.delta).toFixed(1)} PTS MÁS BAJO`
                        : verification.delta > 0.5
                          ? `EMPEORA ${verification.delta.toFixed(1)} PTS · PRUEBA OTRA INTENSIDAD`
                          : "SIN CAMBIO MEDIBLE EN EL ÍNDICE"}
                  </span>
                  <p>
                    {verification?.improved.length
                      ? `Mejoran: ${verification.improved.join(", ")}. `
                      : "Ninguna señal mejoró de forma medible. "}
                    {verification?.worsened.length
                      ? `Empeoran: ${verification.worsened.join(", ")}. Prueba a bajar la intensidad o desactivar el parámetro correspondiente. `
                      : ""}
                    La cuantización rítmica y el rango dinámico no se corrigen con DSP: si el máster está cuantizado o
                    muy comprimido, el índice seguirá reflejándolo. Escucha siempre antes de publicar.
                  </p>
                </div>
                <div className="ab-compare">
                  {[
                    ["Loudness", before.loudness.lufs, after.loudness.lufs, "LUFS"],
                    ["Pico real", before.loudness.truePeak, after.loudness.truePeak, "dBTP"],
                    ["LRA", before.loudness.lra, after.loudness.lra, "LU"],
                    ["Crest", before.loudness.crest, after.loudness.crest, "dB"],
                    ["Correlación", before.stereo.correlation, after.stereo.correlation, ""],
                    ["Aire", before.tonal.sparkle * 100, after.tonal.sparkle * 100, "%"],
                  ].map(([label, a, b, unit]) => (
                    <div className="ab-compare__row" key={String(label)}>
                      <span>{label}</span>
                      <span className="mono">{Number(a).toFixed(2)} {unit}</span>
                      <span className="ab-compare__arrow">→</span>
                      <span className="mono">{Number(b).toFixed(2)} {unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-head">
                  <span className="chart-title">Tu versión humanizada</span>
                  <span className="chart-note">WAV 24-BIT · {formatDuration(saved.duration)}</span>
                </div>
                <AudioPlayer srcUrl={processedUrl ?? undefined} name={saved.label} duration={saved.duration} peaks={after.waveform.peaks} note="HUMANIZADO" />
                <div className="row-flex" style={{ marginTop: 14 }}>
                  <button className="btn btn--primary btn--sm" onClick={() => processedBlob && downloadBlob(processedBlob, `${saved.label}.wav`)}>
                    <Download size={13} /> Descargar WAV
                  </button>
                  <button className="btn btn--ghost btn--sm" onClick={() => downloadSavedAudio(saved.audioId, `${saved.label}.wav`).then((ok) => toast(ok ? "WAV descargado." : "No se encontró el audio.", ok ? "ok" : "err"))}>
                    <Download size={13} /> Desde IndexedDB
                  </button>
                  {project && (
                    <Link className="btn btn--ghost btn--sm" to={`/projects/${project.id}`}>
                      Ver proyecto
                    </Link>
                  )}
                  <button className="btn btn--soft btn--sm" onClick={() => { setPhase("ready"); }}>
                    <RefreshCw size={13} /> Ajustar y repetir
                  </button>
                </div>
                <div className="inline-note" style={{ marginTop: 14 }}>
                  <Check size={14} />
                  <span>Guardado en este navegador. Puedes descargarlo ahora o recuperarlo desde el proyecto.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="engine-note">
        <Lock size={14} />
        <span>
          Procesado 100% local con Web Audio DSP. No es un modelo de IA generativa, no cambia la composición ni la voz y
          no garantiza que una plataforma clasifique el track de otra forma.
        </span>
      </div>
    </div>
  );
}
