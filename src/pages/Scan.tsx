import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Check,
  Crown,
  FileAudio,
  FolderOpen,
  Info,
  Lock,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { type AnalysisResult, type DecodedTrack } from "../lib/audio/analyzer";
import { analyzeTrackAsync } from "../lib/audio/analyzeClient";
import { decodeFile, sliceTrack } from "../lib/audio/decode";
import { useStudio } from "../lib/storage/store";
import { COST, type ScanRecord } from "../lib/storage/types";
import { formatBytes, formatDuration, formatNumber, prettyName } from "../lib/utils";
import { Dropzone } from "../components/Dropzone";
import { AudioPlayer } from "../components/AudioPlayer";
import { ResultView } from "../components/ResultView";
import { Modal } from "../components/Modal";

type Phase = "idle" | "decoding" | "ready" | "analyzing" | "done" | "error";
type Tier = "rapido" | "profundo";

const STAGES = [
  { label: "Preparando señal", at: 0 },
  { label: "Espectro y transitorios", at: 8 },
  { label: "Loudness ITU-R BS.1770", at: 72 },
  { label: "Estéreo y estructura", at: 76 },
  { label: "Consolidando informe", at: 96 },
];

export function ScanPage() {
  const { prefs, projects, addScan, addScanToNewProject, spend, addCredits, updatePrefs, toast } = useStudio();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const projectId = params.get("project") ?? undefined;
  const project = projects.find((p) => p.id === projectId);

  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [track, setTrack] = useState<DecodedTrack | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>("rapido");
  const [progress, setProgress] = useState({ pct: 0, stage: "Preparando señal" });
  const [scan, setScan] = useState<ScanRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proOpen, setProOpen] = useState(false);
  const resultRef = useRef<HTMLDivElement | null>(null);
  /** Permite cancelar el análisis al desmontar o al cambiar de archivo. */
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const deepAllowed = prefs.plan === "pro";
  const cost = COST.scan;

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

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    setTrack(null);
    setScan(null);
    setError(null);
    setPhase("idle");
    setProgress({ pct: 0, stage: "Preparando señal" });
  };

  const onFile = async (next: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setScan(null);
    setError(null);
    setFile(next);
    setTrack(null);
    setPreviewUrl(URL.createObjectURL(next));
    setPhase("decoding");
    try {
      const decoded = await decodeFile(next);
      setTrack(decoded);
      setPhase("ready");
      toast(`“${next.name}” listo · ${formatDuration(decoded.duration)} · ${decoded.numberOfChannels === 1 ? "mono" : "estéreo"}`, "ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo decodificar el audio.");
      setPhase("error");
    }
  };

  const analyze = async () => {
    if (!track || !file) return;
    if (!spend(cost, "el escaneo de IA")) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("analyzing");
    setError(null);
    setProgress({ pct: 2, stage: "Preparando señal" });
    try {
      const useSample = tier === "rapido" && track.duration > 90;
      const target = useSample ? sliceTrack(track, 90) : track;
      const result: AnalysisResult = await analyzeTrackAsync(target, {
        tier,
        signal: controller.signal,
        onProgress: (p) => setProgress(p),
      });
      const label = useSample
        ? `Muestra ${formatDuration(90)} de ${formatDuration(track.duration)}`
        : tier === "rapido"
          ? "Escaneo rápido"
          : "Escaneo profundo";
      let saved: ScanRecord;
      if (projectId) {
        saved = await addScan({ projectId, result, source: "scan", tier, audio: file, label });
      } else {
        const created = await addScanToNewProject({
          trackName: prettyName(file.name),
          artistName: prefs.artistName,
          result,
          source: "scan",
          tier,
          audio: file,
          label,
        });
        saved = created.scan;
      }
      setScan(saved);
      updatePrefs({ tutorialScan: true });
      setPhase("done");
      toast("Análisis completado. Informe guardado en tu proyecto.", "ok");
    } catch (err) {
      addCredits(cost, "Reembolso del escaneo");
      setError(err instanceof Error ? err.message : "El análisis falló. Se han devuelto los créditos.");
      setPhase("ready");
    }
  };

  const choosingTier = phase !== "analyzing" && phase !== "done";

  return (
    <div className="page">
      <div className="page-head page-head--center scan-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>ANÁLISIS DE DETECCIÓN</div>
          <h1>Escanear</h1>
          <p className="page-head__sub">
            Sube tu master, premaster o stem y analiza su apariencia generativa frente a 8 rasgos acústicos medibles (microtiming, extensión espectral, correlación estéreo y dinámica).
          </p>
        </div>
      </div>

      {project && (
        <div className="project-context">
          <FolderOpen size={14} />
          <span>
            Se guardará en <b>{project.trackName}</b>
          </span>
          <Link to={`/projects/${project.id}`} className="link link--mono" style={{ marginLeft: "auto" }}>
            Ver proyecto
          </Link>
        </div>
      )}

      {choosingTier && (
        <>
          <div className="tier-switch" role="tablist" aria-label="Modo de escaneo">
            <button
              role="tab"
              aria-selected={tier === "rapido"}
              className={`tier-card ${tier === "rapido" ? "is-active" : ""}`}
              onClick={() => setTier("rapido")}
            >
              <span className="tier-card__icon"><Zap size={18} /></span>
              <span className="tier-card__body">
                <span className="tier-card__name">Escaneo rápido</span>
                <span className="tier-card__desc">Analiza una muestra de 90 s. Suficiente para una primera lectura.</span>
              </span>
              <span className="tier-card__meta mono">40 CR</span>
            </button>
            <button
              role="tab"
              aria-selected={tier === "profundo"}
              className={`tier-card ${tier === "profundo" ? "is-active" : ""} ${!deepAllowed ? "is-locked" : ""}`}
              onClick={() => {
                if (!deepAllowed) {
                  setProOpen(true);
                  return;
                }
                setTier("profundo");
              }}
            >
              <span className="tier-card__icon">{deepAllowed ? <Crown size={18} /> : <Lock size={18} />}</span>
              <span className="tier-card__body">
                <span className="tier-card__name">Escaneo profundo <span className="chip chip--gold">PRO</span></span>
                <span className="tier-card__desc">Analiza el track completo, con más frames y confianza alta.</span>
              </span>
              <span className="tier-card__meta mono">PRO</span>
            </button>
          </div>

          <div className="scan-stage">
            <Dropzone
              onFile={onFile}
              onReject={(m) => toast(m, "err")}
              disabled={phase === "decoding"}
              hint="El audio nunca sale de tu navegador. Se guarda localmente en IndexedDB si lo analizas."
            />

            {phase === "decoding" && (
              <div className="analysis-panel" style={{ marginTop: 18 }}>
                <div className="row-flex">
                  <span className="spinner" />
                  <b style={{ fontSize: 14 }}>Decodificando audio…</b>
                  <span className="mute" style={{ marginLeft: "auto", fontSize: 12 }}>
                    Web Audio API
                  </span>
                </div>
                <p className="chart-note" style={{ marginTop: 10, letterSpacing: 0 }}>
                  Leyendo PCM y preparando los canales para el motor local.
                </p>
              </div>
            )}

            {phase === "error" && (
              <div className="callout callout--danger" style={{ marginTop: 16 }}>
                <Info size={18} />
                <div>
                  <b>No se pudo procesar el archivo</b>
                  <p>{error}</p>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={reset}>Reintentar</button>
              </div>
            )}

            {file && track && phase === "ready" && (
              <div className="file-card">
                <div className="file-card__head">
                  <div className="file-card__icon"><FileAudio size={20} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="file-card__name">{file.name}</div>
                    <div className="file-card__meta mono">
                      {formatBytes(file.size)} · {formatDuration(track.duration)} · {(track.sampleRate / 1000).toFixed(1)} kHz ·{" "}
                      {track.numberOfChannels === 1 ? "MONO" : "ESTÉREO"}
                    </div>
                  </div>
                  <span className="chip chip--emerald"><Check size={11} /> DECODIFICADO</span>
                  <button className="icon-action" onClick={reset} aria-label="Quitar archivo">
                    <X size={15} />
                  </button>
                </div>
                <AudioPlayer srcUrl={previewUrl ?? undefined} name={file.name} duration={track.duration} peaks={undefined} />
                <div className="file-card__foot">
                  <div className="file-card__note">
                    {tier === "rapido" && track.duration > 90
                      ? `Se analizarán los primeros 90 s de ${formatDuration(track.duration)}.`
                      : "Se analizará el track completo."}{" "}
                    Coste: <b>{cost} créditos</b> · saldo {formatNumber(prefs.credits)}
                  </div>
                  <button className="btn btn--primary btn--lg" onClick={analyze} disabled={prefs.credits < cost}>
                    <ScanLine size={16} /> Analizar track
                  </button>
                </div>
                {prefs.credits < cost && (
                  <div className="inline-warn">
                    No tienes créditos suficientes. <Link to="/billing">Compra o activa Pro</Link> para continuar.
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {phase === "analyzing" && (
        <div className="analysis-panel analysis-running">
          <div
            className="progress-ring"
            style={{ background: `conic-gradient(var(--emerald) ${progress.pct * 3.6}deg, var(--line-strong) 0)` }}
            role="img"
            aria-label={`Progreso ${Math.round(progress.pct)}%`}
          >
            <div className="progress-ring__inner">
              <span className="progress-ring__pct">{Math.round(progress.pct)}%</span>
              <span className="progress-ring__label">ANALIZANDO</span>
            </div>
          </div>
          <div className="analysis-panel__body">
            <div className="eyebrow" style={{ marginBottom: 8 }}>MOTOR LOCAL · WEB AUDIO DSP</div>
            <h2 className="analysis-panel__title">{progress.stage}</h2>
            <p className="analysis-panel__sub">
              {file?.name} · {tier === "rapido" ? "muestra rápida" : "track completo"} · no cierres esta pestaña
            </p>
            <div className="analysis-steps">
              {STAGES.map((s, i) => {
                const activeIndex = STAGES.reduce((acc, st, idx) => (progress.pct >= st.at ? idx : acc), 0);
                const state = i < activeIndex ? "is-done" : i === activeIndex ? "is-active" : "";
                return (
                  <div className={`analysis-step ${state}`} key={s.label}>
                    <span className="analysis-step__dot">{i < activeIndex ? <Check size={11} /> : i + 1}</span>
                    {s.label}
                    {i === activeIndex && <span className="spinner" style={{ marginLeft: "auto" }} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {phase === "done" && scan && (
        <div ref={resultRef} className="scan-result">
          <div className="scan-result__head">
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>ANÁLISIS COMPLETADO</div>
              <h2 className="scan-result__title">Informe de autenticidad</h2>
              <p className="chart-note" style={{ letterSpacing: 0, marginTop: 6 }}>
                {scan.label} · {formatBytes(scan.result.file.size)} · guardado en tu proyecto
              </p>
            </div>
            <div className="row-flex">
              <button className="btn btn--ghost btn--sm" onClick={reset}>
                <RefreshCw size={13} /> Escanear otro
              </button>
              <Link className="btn btn--soft btn--sm" to={`/projects/${scan.projectId}`}>
                <FolderOpen size={13} /> Ver proyecto
              </Link>
            </div>
          </div>

          <ResultView result={scan.result} scan={scan} onForensic={() => navigate(`/forensic?scan=${scan.id}`)} />

          <div className="scan-next">
            <div className="scan-next__icon"><Sparkles size={18} /></div>
            <div style={{ flex: 1 }}>
              <b>Convierte el diagnóstico en una prueba</b>
              <p>Analiza el master contra el estándar de tu género y sella la huella del archivo.</p>
            </div>
            <Link className="btn btn--ghost btn--sm" to={`/forensic?scan=${scan.id}`}>Análisis forense</Link>
            <Link className="btn btn--gold btn--sm" to={`/shield?scan=${scan.id}`}>
              <ShieldCheck size={13} /> Certificar
            </Link>
          </div>
        </div>
      )}

      <Modal
        open={proOpen}
        onClose={() => setProOpen(false)}
        eyebrow="FUNCIÓN PRO"
        title="Escaneo profundo"
        footer={
          <div className="row-flex" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn--ghost" onClick={() => setProOpen(false)}>Ahora no</button>
            <Link className="btn btn--gold" to="/billing" onClick={() => setProOpen(false)}>
              <Crown size={14} /> Ver planes Pro
            </Link>
          </div>
        }
      >
        <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          El escaneo profundo analiza el track completo con resolución espectral 4096 (≈10,8 Hz por bin) en lugar de
          2048. Forma parte del plan Pro; puedes activarlo desde{" "}
          <Link to="/billing" className="link">Mi Suscripción</Link>.
        </p>
        <div className="pro-feature-list">
          {["Track completo, sin recorte de 90 s", "FFT 4096: lectura fina de agudos y códec", "Confianza alta y comparación forense", "Créditos de plan Pro"].map((t) => (
            <div key={t} className="pro-feature"><Check size={13} /> {t}</div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
