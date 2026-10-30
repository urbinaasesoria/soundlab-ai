import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Disc3,
  Download,
  FileAudio,
  Info,
  Lock,
  Music2,
  RefreshCw,
  Sparkles,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";
import { analyzeTrack, type AnalysisResult, type DecodedTrack } from "../lib/audio/analyzer";
import { decodeFile, sliceTrack } from "../lib/audio/decode";
import { COVER_STYLES, renderCoverStyle, type CoverStyle } from "../lib/audio/wav";
import { getAudio } from "../lib/storage/db";
import { useStudio } from "../lib/storage/store";
import { COST, type RenderRecord, type ScanRecord } from "../lib/storage/types";
import {
  downloadSavedAudio,
  formatDate,
  formatDuration,
  formatNumber,
  prettyName,
} from "../lib/utils";
import { Dropzone } from "../components/Dropzone";
import { AudioPlayer } from "../components/AudioPlayer";
import { ScoreRing } from "../components/ScoreRing";

type Phase = "idle" | "decoding" | "ready" | "rendering" | "done" | "error";

interface CoverOutput {
  style: CoverStyle;
  record: RenderRecord;
  analysis: AnalysisResult;
}

const MAX_BYTES = 180 * 1024 * 1024;
const MAX_SECONDS = 6 * 60;

const STYLE_ICON: Record<CoverStyle, typeof Music2> = {
  acustico: Music2,
  lofi: Disc3,
  club: Zap,
};

export function CoverizadorPage() {
  const { prefs, projects, scans, renders, saveRender, spend, addCredits, toast } = useStudio();
  const [params] = useSearchParams();
  const projectFilter = params.get("project");
  const audioScans = useMemo(() => scans.filter((s) => s.audioId).sort((a, b) => b.createdAt - a.createdAt), [scans]);
  const relevantScans = useMemo(
    () => (projectFilter ? audioScans.filter((s) => s.projectId === projectFilter) : audioScans),
    [audioScans, projectFilter],
  );

  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [track, setTrack] = useState<DecodedTrack | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sourceScan, setSourceScan] = useState<ScanRecord | null>(null);
  const [before, setBefore] = useState<AnalysisResult | null>(null);
  const [outputs, setOutputs] = useState<CoverOutput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ pct: 0, stage: "Preparando" });
  const resultRef = useRef<HTMLDivElement | null>(null);

  const project = projects.find((p) => p.id === (sourceScan?.projectId ?? projectFilter));
  const coverRenders = useMemo(
    () =>
      renders
        .filter((r) => r.kind === "cover")
        .sort((a, b) => b.createdAt - a.createdAt),
    [renders],
  );

  const minutes = track ? Math.max(1, Math.ceil(track.duration / 60)) : 1;
  const cost = COST.cover * minutes;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (phase === "done" && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [phase]);

  const reset = (keepFile = false) => {
    if (previewUrl && !keepFile) URL.revokeObjectURL(previewUrl);
    if (!keepFile) {
      setFile(null);
      setTrack(null);
      setPreviewUrl(null);
      setSourceScan(null);
    }
    setBefore(null);
    setOutputs([]);
    setError(null);
    setProgress({ pct: 0, stage: "Preparando" });
    setPhase(keepFile ? "ready" : "idle");
  };

  const loadFile = async (next: File, existing?: ScanRecord) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
    setSourceScan(existing ?? null);
    setTrack(null);
    setBefore(null);
    setOutputs([]);
    setError(null);
    setPhase("decoding");

    if (next.size > MAX_BYTES) {
      setError("El archivo supera los 180 MB. Comprime el master o usa un WAV menor para esta demo local.");
      setPhase("error");
      return;
    }

    try {
      const decoded = await decodeFile(next);
      if (decoded.duration > MAX_SECONDS + 0.5) {
        setError(
          `El Coverizador de la app original acepta hasta 6:00. Este track dura ${formatDuration(decoded.duration)}; ` +
            "recorta una sección para cuidar la memoria del navegador.",
        );
        setPhase("error");
        return;
      }
      setTrack(decoded);
      setPhase("ready");
      toast(
        `“${next.name}” listo · ${formatDuration(decoded.duration)} · ${minutes} min facturable${minutes === 1 ? "" : "s"}`,
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

  const generate = async () => {
    if (!track || !file) return;
    if (!spend(cost, "el Coverizador")) return;

    setPhase("rendering");
    setError(null);
    setOutputs([]);
    setProgress({ pct: 1, stage: "Midiendo el original" });

    let savedCount = 0;
    try {
      const sampleSeconds = Math.min(30, track.duration);
      const beforeResult = await analyzeTrack(sliceTrack(track, sampleSeconds), (p) =>
        setProgress({ pct: Math.max(1, Math.round(p.pct * 0.05)), stage: `Original · ${p.stage}` }),
      );
      setBefore(beforeResult);

      for (let i = 0; i < COVER_STYLES.length; i++) {
        const style = COVER_STYLES[i];
        const base = 6 + i * 31;

        setProgress({ pct: base, stage: `${style.name} · preparando DSP` });
        const rendered = await renderCoverStyle(track.channels, track.sampleRate, style.id, {
          onProgress: (pct, stage) =>
            setProgress({ pct: Math.min(98, base + Math.round(pct * 0.18)), stage: `${style.name} · ${stage}` }),
        });

        const duration = rendered[0].length / track.sampleRate;
        const renderedTrack: DecodedTrack = { ...track, channels: rendered, duration };

        setProgress({ pct: base + 19, stage: `${style.name} · midiendo resultado` });
        const analysis = await analyzeTrack(sliceTrack(renderedTrack, sampleSeconds), (p) =>
          setProgress({ pct: Math.min(99, base + 19 + Math.round(p.pct * 0.11)), stage: `${style.name} · ${p.stage}` }),
        );

        setProgress({ pct: Math.min(99, base + 29), stage: `${style.name} · guardando WAV 24-bit` });
        const record = await saveRender({
          projectId: sourceScan?.projectId ?? projectFilter ?? undefined,
          scanId: sourceScan?.id,
          kind: "cover",
          style: style.id,
          label: `${prettyName(file.name)} · ${style.name}`,
          channels: rendered,
          sampleRate: track.sampleRate,
          duration,
          before: beforeResult,
          after: analysis,
        });
        savedCount += 1;
        setOutputs((prev) => [...prev, { style: style.id, record, analysis }]);
      }

      setProgress({ pct: 100, stage: "Listo" });
      setPhase("done");
      toast("3 reinterpretaciones generadas y guardadas como WAV 24-bit.", "ok");
    } catch (err) {
      const refund = Math.round((cost * (COVER_STYLES.length - savedCount)) / COVER_STYLES.length);
      if (refund > 0) addCredits(refund, "Reembolso del Coverizador");
      setError(err instanceof Error ? err.message : "No se pudieron generar las versiones.");
      setPhase(savedCount > 0 ? "done" : "ready");
      toast(
        savedCount > 0
          ? `Se generaron ${savedCount} de 3 versiones. Se devolvieron ${refund} créditos.`
          : "El Coverizador falló. Se devolvieron los créditos.",
        "err",
      );
    }
  };

  const download = (record: RenderRecord) =>
    downloadSavedAudio(record.audioId, `${record.label}.wav`).then((ok) =>
      toast(ok ? "WAV descargado." : "No se encontró el WAV en el almacenamiento local.", ok ? "ok" : "err"),
    );

  const canGenerate = phase === "ready" && track && prefs.credits >= cost;

  return (
    <div className="page coverizador">
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>DSP LOCAL · BETA</div>
          <h1>
            Coverizador <span className="badge badge--beta" style={{ verticalAlign: "middle", marginLeft: 8 }}>BETA</span>
          </h1>
          <p className="page-head__sub">
            Sube tu track y recibe 3 reinterpretaciones listas para crear tus propios covers. No son covers
            generativos: son versiones DSP reales de tu propia mezcla.
          </p>
        </div>
        <div className="page-head__actions">
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => toast("Mis letras es una función de la versión completa. Aquí no inventamos letras.", "info")}
          >
            <Music2 size={14} /> Mis letras <span className="chip">BETA</span>
          </button>
          <a className="btn btn--gold btn--sm" href="#mis-covers">
            <Disc3 size={14} /> Mis covers <span className="mono">{coverRenders.length}</span>
          </a>
        </div>
      </div>

      <div className="improvement-note">
        <Sparkles size={16} />
        <div>
          <b>Mejora respecto a la app original</b>
          <p>
            El Coverizador con IA promete covers generados, pero con DSP no se puede generar voz ni instrumentos nuevos sin
            un modelo generativo. En su lugar aplica tres cadenas DSP locales sobre tu audio: Acústico, Lo-fi y Club. Se
            nota la diferencia y se explica qué hace cada una.
          </p>
        </div>
        <span className="chip chip--emerald">FUNCIONAL</span>
      </div>

      {phase !== "done" && (
        <section className={`cover-step-card ${phase === "rendering" ? "is-busy" : ""}`}>
          <div className="cover-step-card__head">
            <span className="cover-step-card__num">1</span>
            <div>
              <div className="cover-step-card__title">SUBE TU TRACK</div>
              <p className="cover-step-card__sub">Un archivo, tres caracteres. El original nunca se modifica.</p>
            </div>
            <span className="chip chip--emerald"><Lock size={10} /> PRIVADO</span>
          </div>

          {!file || phase === "error" ? (
            <>
            <div className="card cover-suno">
        <div className="cover-suno__head">
          <b>Preparado para subir a SUNO</b>
        </div>
        <p>
          El objetivo de esta pantalla es entregar una versión <b>suficientemente transformada</b> de tu
          track para usarla como audio de referencia en SUNO y generar un cover. Las tres
          reinterpretaciones conservan tempo, tonalidad y estructura, pero cambian timbre, saturación y
          espacialidad: son otro audio, no una copia.
        </p>
        <ul>
          <li>
            <b>Formato:</b> WAV 24 bits estéreo, sin recodificación con pérdida. Es el formato que SUNO
            acepta mejor como referencia.
          </li>
          <li>
            <b>Duración:</b> por debajo de ~2 minutos el cover conserva más detalle; corta un fragmento
            representativo si el tema es largo.
          </li>
          <li>
            <b>Nivel:</b> mantén los picos por debajo de −1 dBTP. Las cadenas ya atenúan el master antes de
            escribir el archivo.
          </li>
          <li>
            <b>Transformación:</b> cada estilo cambia textura y color, nunca la melodía ni el tempo, para que
            el cover siga reconociéndose como tu tema.
          </li>
        </ul>
        <p className="cover-suno__legal">
          Sube solo audio del que tengas derechos. Esta herramienta transforma el sonido, no la
          titularidad: no evita la detección de contenido de terceros ni te exime de sus condiciones.
        </p>
      </div>

      <div className="cover-drop-card">
              <div className="cover-drop-card__head">
                <span className="eyebrow">ARCHIVO</span>
                <span className="chip">MÁX. 180 MB · 6:00</span>
              </div>
              <Dropzone
                onFile={loadFile}
                onReject={(m) => toast(m, "err")}
                title={<>Arrastra tu <u>track</u> aquí o explora</>}
                meta="MP3 · WAV · FLAC · AIFF · M4A · MÁX. 180 MB · 6:00 MIN"
                hint="Se decodifica en memoria y se guarda en IndexedDB solo si generas las versiones. Nada se sube a un servidor."
              />
              <div className="cover-drop-card__foot">
                <Lock size={13} />
                <span>TU AUDIO ES PRIVADO · SOLO TÚ PUEDES ACCEDER A ÉL</span>
              </div>
            </div>
            </>
          ) : phase === "decoding" ? (
            <div className="cover-loading">
              <span className="spinner spinner--lg" />
              <div>
                <div className="eyebrow">LEYENDO PCM</div>
                <h2 className="analysis-panel__title">Decodificando audio…</h2>
                <p className="analysis-panel__sub">Preparando los canales para las tres cadenas DSP.</p>
              </div>
            </div>
          ) : (
            <div className="cover-ready">
              <div className="file-card">
                <div className="file-card__head">
                  <div className="file-card__icon"><FileAudio size={20} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="file-card__name">{file.name}</div>
                    <div className="file-card__meta mono">
                      {formatNumber(Math.round(file.size / 1024))} KB · {formatDuration(track?.duration ?? 0)} ·{" "}
                      {(track?.sampleRate ?? 0) / 1000} kHz · {track?.numberOfChannels === 1 ? "MONO" : "ESTÉREO"}
                    </div>
                  </div>
                  <span className="chip chip--emerald"><Check size={11} /> DECODIFICADO</span>
                  <button className="icon-action" onClick={() => reset()} aria-label="Quitar archivo">
                    <X size={15} />
                  </button>
                </div>
                <AudioPlayer
                  srcUrl={previewUrl ?? undefined}
                  name={file.name}
                  duration={track?.duration ?? 0}
                  peaks={before?.waveform.peaks}
                  note="ORIGINAL"
                />
                <div className="file-card__foot">
                  <div className="file-card__note">
                    {minutes} min facturable{minutes === 1 ? "" : "s"} · {COST.cover} créditos/min · total{" "}
                    <b>{formatNumber(cost)} créditos</b> · saldo {formatNumber(prefs.credits)}
                  </div>
                  <button className="btn btn--primary btn--lg" onClick={generate} disabled={!canGenerate}>
                    <Sparkles size={16} /> Generar 3 versiones
                  </button>
                </div>
                {prefs.credits < cost && (
                  <div className="inline-warn">
                    No tienes créditos suficientes. <Link to="/billing">Compra o activa Pro</Link> para continuar.
                  </div>
                )}
              </div>

              <div className="cover-styles-preview">
                {COVER_STYLES.map((style) => {
                  const Icon = STYLE_ICON[style.id];
                  return (
                    <div className="cover-style-chip" key={style.id}>
                      <span className="cover-style-chip__icon"><Icon size={15} /></span>
                      <div>
                        <b>{style.name}</b>
                        <span>{style.blurb}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {relevantScans.length > 0 && (
                <div className="cover-stored">
                  <div className="chart-head">
                    <span className="chart-title">O usa un audio ya guardado</span>
                    <span className="chart-note">INDEXEDDB · LOCAL</span>
                  </div>
                  <div className="source-list">
                    {relevantScans.slice(0, 4).map((s) => {
                      const p = projects.find((item) => item.id === s.projectId);
                      return (
                        <button key={s.id} className="source-item" onClick={() => loadStored(s.id)}>
                          <span className="source-item__icon"><FileAudio size={16} /></span>
                          <span className="source-item__body">
                            <span className="source-item__name">{p?.trackName ?? s.result.file.name}</span>
                            <span className="source-item__meta mono">
                              {s.result.file.name} · {formatDuration(s.result.file.duration)}
                            </span>
                          </span>
                          <span className="chip chip--emerald">CARGAR</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {phase === "error" && (
            <div className="callout callout--danger" style={{ marginTop: 16 }}>
              <Info size={18} />
              <div>
                <b>No se pudo preparar el track</b>
                <p>{error}</p>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => reset()}>Reintentar</button>
            </div>
          )}

          <div className="cover-step-card__foot">
            <span className="chart-note" style={{ letterSpacing: 0 }}>
              Al continuar, confirmas que harás un uso lícito y legal de esta herramienta.
            </span>
            <span className="chip chip--gold">150 CRÉDITOS POR MINUTO</span>
          </div>
        </section>
      )}

      {phase === "rendering" && (
        <div className="analysis-panel analysis-running" style={{ marginTop: 20 }}>
          <div
            className="progress-ring"
            style={{ background: `conic-gradient(var(--emerald) ${progress.pct * 3.6}deg, var(--line-strong) 0)` }}
            role="img"
            aria-label={`Progreso ${progress.pct}%`}
          >
            <div className="progress-ring__inner">
              <span className="progress-ring__pct">{progress.pct}%</span>
              <span className="progress-ring__label">COVERIZANDO</span>
            </div>
          </div>
          <div className="analysis-panel__body">
            <div className="eyebrow" style={{ marginBottom: 8 }}>COVERIZADOR · DSP LOCAL</div>
            <h2 className="analysis-panel__title">{progress.stage}</h2>
            <p className="analysis-panel__sub">
              {file?.name} · tres renders de {formatDuration(track?.duration ?? 0)} · no cierres esta pestaña
            </p>
            <div className="analysis-steps">
              {COVER_STYLES.map((style, i) => {
                const done = outputs.some((o) => o.style === style.id);
                const active = !done && progress.pct >= 6 + i * 31 && progress.pct < 6 + (i + 1) * 31;
                return (
                  <div className={`analysis-step ${done ? "is-done" : active ? "is-active" : ""}`} key={style.id}>
                    <span className="analysis-step__dot">{done ? <Check size={11} /> : i + 1}</span>
                    {style.name}
                    <span className="mute mono" style={{ marginLeft: "auto", fontSize: 9 }}>
                      {done ? "WAV LISTO" : active ? "PROCESANDO" : "EN COLA"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {phase === "done" && outputs.length > 0 && (
        <div className="cover-results" ref={resultRef}>
          <div className="scan-result__head">
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>3 VERSIONES GENERADAS</div>
              <h2 className="scan-result__title">Tus covers DSP</h2>
              <p className="chart-note" style={{ letterSpacing: 0, marginTop: 6 }}>
                WAV 24-bit · mismas composición y voz · tres caracteres distintos
              </p>
            </div>
            <div className="row-flex">
              <button className="btn btn--ghost btn--sm" onClick={() => reset(true)}>
                <RefreshCw size={13} /> Ajustar y repetir
              </button>
              <button className="btn btn--soft btn--sm" onClick={() => reset()}>
                <UploadCloud size={13} /> Otro track
              </button>
            </div>
          </div>

          <div className="cover-result-grid">
            {outputs.map(({ style, record, analysis }) => {
              const meta = COVER_STYLES.find((s) => s.id === style)!;
              const Icon = STYLE_ICON[style];
              return (
                <article className={`cover-result-card cover-result-card--${style}`} key={record.id}>
                  <div className="cover-result-card__head">
                    <span className="cover-result-card__icon"><Icon size={18} /></span>
                    <div>
                      <h3>{meta.name}</h3>
                      <span className="chart-note">{meta.blurb}</span>
                    </div>
                  </div>

                  <div className="cover-result-card__rings">
                    <ScoreRing
                      value={analysis.ai.probability}
                      label="PROBABILIDAD IA"
                      display={`${Math.round(analysis.ai.probability)}%`}
                      tone={analysis.ai.probability > 50 ? "gold" : "emerald"}
                      size={104}
                      small
                    />
                    <div className="cover-result-card__stats mono">
                      <span>{analysis.loudness.lufs.toFixed(1)} LUFS</span>
                      <span>{analysis.loudness.truePeak.toFixed(2)} dBTP</span>
                      <span>{analysis.rhythm.bpm.toFixed(0)} BPM</span>
                      <span>{analysis.tonal.key}</span>
                    </div>
                  </div>

                  <AudioPlayer
                    audioId={record.audioId}
                    name={record.label}
                    duration={record.duration}
                    peaks={analysis.waveform.peaks}
                    compact
                    note="WAV 24-BIT"
                  />

                  {before && record.before && (
                    <div className="cover-result-card__delta">
                      <span>Índice original</span>
                      <b>{record.before.ai.probability.toFixed(1)}%</b>
                      <ArrowRight size={12} />
                      <b>{analysis.ai.probability.toFixed(1)}%</b>
                    </div>
                  )}

                  <div className="cover-result-card__foot">
                    <button className="btn btn--primary btn--sm" onClick={() => download(record)}>
                      <Download size={13} /> WAV
                    </button>
                    <span className="chart-note">{formatDuration(record.duration)} · {(record.sampleRate / 1000).toFixed(1)} kHz</span>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="callout" style={{ marginTop: 18 }}>
            <Info size={18} />
            <div>
              <b>Esto no es un cover generativo</b>
              <p>
                Las tres versiones parten de tu mezcla y aplican filtros, saturación, ancho estéreo y textura. No
                cambian la letra, no generan una voz nueva y no sustituyen una producción con instrumentos reales. El
                índice IA es la misma lectura heurística local del escáner.
              </p>
            </div>
            {project && <Link className="btn btn--ghost btn--sm" to={`/projects/${project.id}`}>Ver proyecto</Link>}
          </div>
        </div>
      )}

      {error && phase === "done" && (
        <div className="callout callout--danger" style={{ marginTop: 16 }}>
          <Info size={18} />
          <div>
            <b>Generación incompleta</b>
            <p>{error}</p>
          </div>
        </div>
      )}

      <section id="mis-covers" className="cover-library">
        <div className="section-title" style={{ marginTop: 36 }}>
          <h2>Mis covers</h2>
          <span className="chart-note">{coverRenders.length} RENDERS LOCALES</span>
        </div>
        {coverRenders.length === 0 ? (
          <div className="empty">
            <Disc3 size={24} />
            <h3>Aún no hay covers</h3>
            <p>Genera tus tres primeras versiones y aparecerán aquí, listas para descargar o volver a escuchar.</p>
          </div>
        ) : (
          <div className="cover-library-list">
            {coverRenders.map((r) => {
              const style = COVER_STYLES.find((s) => s.id === r.style);
              const projectName = projects.find((p) => p.id === r.projectId)?.trackName;
              return (
                <div className="cover-library-row" key={r.id}>
                  <span className="cover-library-row__icon">
                    {r.style ? (() => {
                      const Icon = STYLE_ICON[r.style];
                      return <Icon size={16} />;
                    })() : <Disc3 size={16} />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cover-library-row__title">{r.label}</div>
                    <div className="cover-library-row__meta">
                      {style?.name ?? "Cover"} · {formatDate(r.createdAt)} · {formatDuration(r.duration)} · WAV 24-bit
                      {projectName ? ` · ${projectName}` : ""}
                    </div>
                  </div>
                  <button className="btn btn--ghost btn--sm" onClick={() => download(r)}>
                    <Download size={13} /> WAV
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="engine-note">
        <Lock size={14} />
        <span>
          <b>Coverizador local.</b> Tres cadenas DSP deterministas, sin modelos generativos y sin subir tu audio. El
          resultado conserva la mezcla original y añade carácter; escúchalo antes de publicar.
        </span>
      </div>
    </div>
  );
}
