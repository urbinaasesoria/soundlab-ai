import { useEffect } from "react";
import { BRAND } from "../lib/brand";
import { GenreReference } from "../components/GenreReference";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Info,
  Lock,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { ScaleGauge } from "../components/ScaleGauge";
import { ScoreRing, type RingTone } from "../components/ScoreRing";
import { resultHeadline } from "../components/ResultView";
import { ZONE_LABEL, type RiskZone } from "../lib/audio/analyzer";
import { useStudio } from "../lib/storage/store";
import { downloadText, formatDateLong, formatDateTime, formatDuration, formatNumber } from "../lib/utils";

const TONE: Record<RiskZone, RingTone> = {
  optimo: "emerald",
  seguro: "emerald",
  riesgo: "gold",
  peligro: "danger",
};

const ZONE_TONE: Record<RiskZone, string> = {
  optimo: "emerald",
  seguro: "emerald",
  riesgo: "gold",
  peligro: "danger",
};

export function ReportPage() {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const { ready, scans, projects } = useStudio();
  const scan = scans.find((s) => s.id === scanId);
  const project = scan ? projects.find((p) => p.id === scan.projectId) : undefined;

  useEffect(() => {
    if (!scan) return;
    const previous = document.title;
    document.title = `Informe · ${project?.trackName ?? scan.result.file.name} · ${BRAND.full}`;
    return () => {
      document.title = previous;
    };
  }, [scan, project]);

  if (!ready) {
    return (
      <div className="report-page report-page--message" data-theme="light">
        <span className="spinner" />
        <p>Cargando informe local…</p>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="report-page report-page--message" data-theme="light">
        <Logo size={54} glow={false} />
        <h1>Informe no disponible</h1>
        <p>Este análisis no existe en el almacenamiento local o fue eliminado.</p>
        <div className="row-flex">
          <Link className="btn btn--primary" to="/projects">
            <ArrowLeft size={14} /> Volver a proyectos
          </Link>
          <Link className="btn btn--ghost" to="/scan">
            <FileText size={14} /> Escanear un track
          </Link>
        </div>
      </div>
    );
  }

  const result = scan.result;
  const zone = result.ai.zone;
  const tone = TONE[zone];
  const sourceLabel = scan.source === "forensic" ? "ANÁLISIS FORENSE" : "ESCÁNER DE IA";
  const sortedSignals = result.ai.signals.slice().sort((a, b) => b.value * b.weight - a.value * a.weight);
  const topSignals = sortedSignals.slice(0, 6);
  const reportDate = formatDateLong(scan.createdAt);

  const downloadJson = () => {
    downloadText(
      JSON.stringify(
        {
          urbina: "Informe local de autenticidad",
          generatedAt: new Date().toISOString(),
          project: project?.trackName ?? null,
          artist: project?.artistName ?? null,
          scan,
          disclaimer:
            "Motor local heurístico NRM-LOCAL. No es ACRCloud ni una certificación legal. El audio nunca se envió a un servidor.",
        },
        null,
        2,
      ),
      `informe-${project?.trackName.replace(/\s+/g, "-").toLowerCase() ?? "urbina"}-${scan.id.slice(0, 8)}.json`,
      "application/json",
    );
  };

  return (
    <div className="report-page" data-theme="light">
      <div className="report-toolbar">
        <Link to="/" className="report-toolbar__brand" aria-label={`${BRAND.full}, inicio`}>
          <Logo size={30} glow={false} />
          <span>{BRAND.wordmark}</span>
          <small>STUDIO</small>
        </Link>
        <div className="report-toolbar__actions">
          <button className="btn btn--ghost btn--sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={13} /> Volver
          </button>
          <button className="btn btn--ghost btn--sm" onClick={downloadJson}>
            <Download size={13} /> JSON
          </button>
          <button className="btn btn--primary btn--sm" onClick={() => window.print()}>
            <Printer size={13} /> Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      <main className="report-sheet">
        <header className="report-head">
          <div className="report-head__brand">
            <Logo size={48} glow={false} />
            <div>
              <b>{BRAND.wordmark}</b>
              <span>STUDIO</span>
            </div>
          </div>
          <div className="report-head__meta">
            <span>REPORTE DE AUTENTICIDAD</span>
            <span>{reportDate}</span>
            <span>MOTOR LOCAL · NRM-LOCAL</span>
          </div>
        </header>

        <section className="report-hero">
          <div className="report-hero__copy">
            <div className="eyebrow">INFORME {sourceLabel} · {result.ai.confidence.toUpperCase()} CONFIANZA</div>
            <h1>
              {project?.trackName ?? result.file.name}
              <span> · local</span>
            </h1>
            <p className="report-hero__artist">{project?.artistName ?? "Artista local"}</p>
            <div className="report-chips">
              <span className={`chip chip--${ZONE_TONE[zone]}`}>{ZONE_LABEL[zone]}</span>
              <span className="chip">{formatDuration(result.file.duration)}</span>
              <span className="chip">{result.tonal.key}</span>
              <span className="chip">{result.file.channels === 1 ? "MONO" : "ESTÉREO"}</span>
              {project?.isDemo && <span className="chip chip--gold">DEMO</span>}
            </div>
            <p className="report-hero__verdict">
              Tu track está en <b>{ZONE_LABEL[zone].toLowerCase()}</b> · {resultHeadline(zone).toLowerCase()}
            </p>
          </div>
          <div className="report-hero__score">
            <ScoreRing
              value={result.ai.probability}
              label="PROBABILIDAD IA"
              caption={ZONE_LABEL[zone]}
              display={`${result.ai.probability.toFixed(1)}%`}
              tone={tone}
              size={172}
            />
          </div>
        </section>

        <section className="report-section report-section--split">
          <div className="report-panel">
            <div className="report-panel__head">
              <span>PROBABILIDAD DE IA · CANCIÓN COMPLETA</span>
              <span className={`chip chip--${ZONE_TONE[zone]}`}>{ZONE_LABEL[zone]}</span>
            </div>
            <div className="report-big-score">
              <b>{result.ai.probability.toFixed(1)}%</b>
              <span>{ZONE_LABEL[zone]}</span>
            </div>
            <ScaleGauge probability={result.ai.probability} showZone={false} />
            <p className="report-note">
              Índice heurístico de {result.ai.signals.length} señales ponderadas. No es una medición de ACRCloud ni una
              garantía frente a plataformas. El detalle de cada señal está en este informe.
            </p>
          </div>

          <div className="report-panel">
            <div className="report-panel__head">
              <span>¿QUÉ EXPLICA EL ÍNDICE?</span>
              <span>SEÑAL · PESO</span>
            </div>
            <div className="report-signals">
              {topSignals.map((signal) => (
                <div className="report-signal" key={signal.id}>
                  <div className="report-signal__top">
                    <span>{signal.label}</span>
                    <b>{signal.value.toFixed(0)}</b>
                  </div>
                  <div className="report-signal__track">
                    <span style={{ width: `${Math.max(2, signal.value)}%` }} />
                  </div>
                  <div className="report-signal__meta">
                    peso {(signal.weight * 100).toFixed(0)}% · aporte {(signal.value * signal.weight).toFixed(1)} pts
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="report-section">
          <div className="report-section__title">
            <h2>Lectura técnica del master</h2>
            <span>ITU-R BS.1770 · FFT 2048 · HANN</span>
          </div>
          <div className="report-metrics">
            {[
              ["Loudness integrado", `${result.loudness.lufs.toFixed(1)} LUFS`, "Objetivo −14 a −9 LUFS"],
              ["Pico real", `${result.loudness.truePeak.toFixed(2)} dBTP`, "Techo recomendado −1,5 a −0,3"],
              ["Rango de loudness", `${result.loudness.lra.toFixed(1)} LU`, "Objetivo 5 a 10 LU"],
              ["Crest factor", `${result.loudness.crest.toFixed(1)} dB`, "Objetivo 8 a 14 dB"],
              ["Correlación estéreo", result.stereo.isMono ? "MONO" : result.stereo.correlation.toFixed(2), "Objetivo 0,10 a 0,70"],
              ["Anchura estéreo", result.stereo.isMono ? "—" : result.stereo.width.toFixed(2), "Objetivo 0,20 a 0,60"],
              ["Tempo detectado", `${result.rhythm.bpm.toFixed(1)} BPM`, "Confianza " + result.rhythm.bpmConfidence.toFixed(0) + "%"],
              ["Corte de agudos", `${formatNumber(result.tonal.hfCutoff)} Hz`, "Un corte abrupto sugiere recodificación"],
            ].map(([label, value, hint]) => (
              <div className="report-metric" key={label}>
                <span className="report-metric__label">{label}</span>
                <b>{value}</b>
                <small>{hint}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="report-section report-section--split">
          <div className="report-panel">
            <div className="report-panel__head">
              <span>BALANCE ESPECTRAL</span>
              <span>dB RELATIVO</span>
            </div>
            <div className="report-spectrum">
              {result.spectrum.map((band) => (
                <div className="report-spectrum__col" key={band.label}>
                  <span className="report-spectrum__value">{band.value.toFixed(0)}</span>
                  <span className="report-spectrum__track">
                    <span style={{ height: `${Math.max(3, Math.min(100, band.value))}%` }} />
                  </span>
                  <span className="report-spectrum__label">{band.label}</span>
                </div>
              ))}
            </div>
            <div className="report-hook">
              <span>MEJOR HOOK</span>
              <b>{formatDuration(result.hook.start)} — {formatDuration(result.hook.end)}</b>
              <span>{result.sections.length} secciones detectadas</span>
            </div>
          </div>

          <div className="report-panel">
            <div className="report-panel__head">
              <span>HUELLA TONAL</span>
              <span>{result.tonal.key}</span>
            </div>
            <div className="report-keyvals">
              <div><span>Centroide</span><b>{formatNumber(result.tonal.centroid)} Hz</b></div>
              <div><span>Rolloff 85%</span><b>{formatNumber(result.tonal.rolloff)} Hz</b></div>
              <div><span>Planitud</span><b>{result.tonal.flatness.toFixed(4)}</b></div>
              <div><span>Sparkle</span><b>{(result.tonal.sparkle * 100).toFixed(1)}%</b></div>
              <div><span>Contraste</span><b>{result.tonal.contrast.toFixed(1)} dB</b></div>
              <div><span>DC offset</span><b>{result.loudness.dcOffset.toFixed(5)}</b></div>
              <div><span>Clipping</span><b>{result.loudness.clipping} samples</b></div>
              <div><span>Ruido de fondo</span><b>{result.loudness.noiseFloor.toFixed(1)} dBFS</b></div>
            </div>
          </div>
        </section>

        <section className="report-section">
          <div className="report-section__title">
            <h2>Módulos del motor local</h2>
            <span>{result.modules.length} MÓDULOS · EXPLICABLE</span>
          </div>
          <div className="report-modules">
            {result.modules.map((module) => (
              <div className="report-module" key={module.id}>
                <div className="report-module__head">
                  <b>{module.name}</b>
                  <span>{module.score}/100</span>
                </div>
                <div className="report-module__bar">
                  <span style={{ width: `${Math.max(2, module.score)}%` }} />
                </div>
                <p>{module.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="report-section">
          <div className="report-section__title">
            <h2>Plan de mejora</h2>
            <span>{result.recommendations.length} RECOMENDACIONES · ORDENADAS POR IMPACTO</span>
          </div>
          {result.recommendations.length ? (
            <div className="report-recos">
              {result.recommendations.map((reco, index) => (
                <div className="report-reco" key={reco.title}>
                  <span className="report-reco__num">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <b>{reco.title}</b>
                    <p>{reco.detail}</p>
                    <span className={`chip ${reco.impact === "alto" ? "chip--gold" : "chip--emerald"}`}>
                      IMPACTO {reco.impact.toUpperCase()}
                    </span>
                    <span className="chip">{reco.area.toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="report-clean">
              <CheckCircle2 size={22} />
              <div>
                <b>Sin correcciones urgentes</b>
                <p>El track está dentro de los rangos medidos. Revisa igualmente la escucha crítica y la suma mono.</p>
              </div>
            </div>
          )}
        </section>

        <section className="report-section">
          <GenreReference result={scan.result} />
        </section>

        <section className="report-section report-section--trace">
          <div className="report-section__title">
            <h2>Trazabilidad</h2>
            <span>100% LOCAL</span>
          </div>
          <div className="report-trace">
            <div><span>MOTOR</span><b>{result.engine}</b></div>
            <div><span>VERSIÓN</span><b>{result.version}</b></div>
            <div><span>ANÁLISIS</span><b>{formatDateTime(scan.createdAt)}</b></div>
            <div><span>ARCHIVO</span><b>{result.file.name}</b></div>
            <div><span>MUESTREO</span><b>{formatNumber(result.file.sampleRate)} Hz</b></div>
            <div><span>CANALES</span><b>{result.file.channels}</b></div>
            <div><span>FUENTE</span><b>{sourceLabel}</b></div>
            <div><span>TIER</span><b>{scan.tier === "rapido" ? "RÁPIDO" : "PROFUNDO"}</b></div>
          </div>
          <div className="report-disclaimer">
            <Info size={16} />
            <p>
              <b>Aviso legal.</b> Este informe es una lectura técnica e informativa generada con DSP local. No certifica
              autoría ni originalidad, no garantiza resultados en Spotify, YouTube, TikTok ni ninguna plataforma y no
              sustituye asesoría legal. El índice es una lectura local heurística; este informe no tiene acceso a
              servicios externos de detección y
              calcula un índice heurístico explicable en el navegador. Los audios nunca salen de tu equipo.
            </p>
          </div>
          <div className="report-seal">
            <ShieldCheck size={18} />
            <span>
              {project?.isDemo ? "DEMO SIN AUDIO · " : ""}
              DOCUMENTO LOCAL · NO ES UNA TRANSACCIÓN BITCOIN
            </span>
            <Lock size={14} />
          </div>
        </section>

        <footer className="report-foot">
          <span>{BRAND.copyrightShort} · Laboratorio de audio</span>
          <span>{BRAND.wordmark} {BRAND.sub} · INFORME TÉCNICO · {formatDateLong(Date.now())}</span>
        </footer>
      </main>
    </div>
  );
}
