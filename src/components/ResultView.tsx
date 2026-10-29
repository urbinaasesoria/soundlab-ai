import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Download,
  Fingerprint,
  Gauge,
  Info,
  Lightbulb,
  Lock,
  ScanLine,
  AudioWaveform as WaveformIcon,
} from "lucide-react";
import type { AnalysisResult, RiskZone } from "../lib/audio/analyzer";
import { ZONE_LABEL, zoneFromProbability } from "../lib/audio/analyzer";
import type { ScanRecord } from "../lib/storage/types";
import { formatDuration, formatNumber, clamp } from "../lib/utils";
import { ScoreRing, type RingTone } from "./ScoreRing";
import { ScaleGauge } from "./ScaleGauge";
import { Spectrogram } from "./Spectrogram";
import { Waveform } from "./Waveform";
import { AudioPlayer } from "./AudioPlayer";

const TONE: Record<RiskZone, RingTone> = {
  optimo: "emerald",
  seguro: "emerald",
  riesgo: "gold",
  peligro: "danger",
};

const ZONE_CLASS: Record<RiskZone, string> = {
  optimo: "ok",
  seguro: "ok",
  riesgo: "warn",
  peligro: "bad",
};

export function resultHeadline(zone: RiskZone): string {
  switch (zone) {
    case "optimo":
      return "YA PROTEGIDO";
    case "seguro":
      return "ZONA SEGURA";
    case "riesgo":
      return "NECESITA AJUSTES";
    default:
      return "ALTO RIESGO";
  }
}

function RangeMeter({
  label,
  value,
  min,
  max,
  target,
  unit,
  decimals = 1,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  target: [number, number];
  unit: string;
  decimals?: number;
  hint?: string;
}) {
  const pct = clamp(((value - min) / (max - min)) * 100, 0, 100);
  const t0 = clamp(((target[0] - min) / (max - min)) * 100, 0, 100);
  const t1 = clamp(((target[1] - min) / (max - min)) * 100, 0, 100);
  const inRange = value >= target[0] && value <= target[1];
  return (
    <div className="range">
      <div className="range__head">
        <span className="range__label">{label}</span>
        <span className={`range__value ${inRange ? "is-ok" : "is-out"}`}>
          {Number.isFinite(value) ? value.toFixed(decimals) : "—"} <small>{unit}</small>
        </span>
      </div>
      <div className="range__track">
        <span className="range__target" style={{ left: `${t0}%`, width: `${Math.max(2, t1 - t0)}%` }} />
        <span className={`range__marker ${inRange ? "is-ok" : "is-out"}`} style={{ left: `${pct}%` }} />
      </div>
      <div className="range__foot">
        <span>OBJETIVO {target[0]}–{target[1]} {unit}</span>
        {hint && <span className="range__hint">{hint}</span>}
      </div>
    </div>
  );
}

interface ResultViewProps {
  result: AnalysisResult;
  scan: ScanRecord;
  onForensic?: () => void;
}

type TabId = "resumen" | "espectro" | "loudness" | "modulos" | "recos";

export function ResultView({ result, scan, onForensic }: ResultViewProps) {
  const [tab, setTab] = useState<TabId>("resumen");
  const zone = result.ai.zone;
  const tone = TONE[zone];
  const signals = result.ai.signals.slice().sort((a, b) => b.value * b.weight - a.value * a.weight);
  const topSignals = signals.slice(0, 5);
  const headline = resultHeadline(zone);
  const peakList = result.waveform.peaks;

  return (
    <div className="result stack-5">
      <div className={`result-hero ${zone === "riesgo" ? "result-hero--warn" : ""} ${zone === "peligro" ? "result-hero--risk" : ""}`}>
        <div className="rings">
          <ScoreRing
            value={result.ai.probability}
            label="PROBABILIDAD IA"
            caption={ZONE_LABEL[zone]}
            display={`${Math.round(result.ai.probability)}%`}
            tone={tone}
            size={150}
          />
          <ArrowRight className="rings__arrow" size={22} />
          <ScoreRing
            value={100 - result.ai.probability}
            label="AUTENTICIDAD"
            caption="BAJA PROBABILIDAD IA"
            variant="check"
            tone={tone}
            size={112}
            small
          />
        </div>

        <div className="result-verdict">
          <div className="result-verdict__eyebrow">
            VEREDICTO · {scan.source === "forensic" ? "FORENSE" : "ESCÁNER"} · {result.ai.confidence.toUpperCase()} CONFIANZA
          </div>
          <h2>
            <strong>{headline}</strong>
          </h2>
          <p className="result-verdict__note">
            {zone === "optimo"
              ? "Tu track está en zona óptima: la probabilidad de detección de IA es baja."
              : zone === "seguro"
                ? "Estás en zona segura, con margen de mejora en algunos indicadores."
                : zone === "riesgo"
                  ? "Hay señales que conviene corregir antes de publicar."
                  : "Varias señales apuntan a un patrón sintético. Revisa las recomendaciones."}
          </p>
          <div className="result-verdict__badges">
            <span className={`chip chip--${zone === "optimo" || zone === "seguro" ? "emerald" : zone === "riesgo" ? "gold" : "danger"}`}>
              {ZONE_LABEL[zone]}
            </span>
            <span className="chip">{result.engine.split(" · ")[0]}</span>
            <span className="chip">{formatDuration(result.file.duration)}</span>
            <span className="chip">{result.tonal.key}</span>
          </div>
          <div className="result-verdict__actions">
            <Link className="btn btn--primary" to={`/report/${scan.id}`}>
              <Download size={15} /> Descargar informe
            </Link>
            {onForensic ? (
              <button className="btn btn--ghost" onClick={onForensic}>
                <ScanLine size={15} /> Analizar forense
              </button>
            ) : (
              <Link className="btn btn--ghost" to={`/forensic?scan=${scan.id}`}>
                <ScanLine size={15} /> Análisis forense
              </Link>
            )}
          </div>
        </div>
      </div>

      <AudioPlayer
        audioId={scan.audioId}
        name={result.file.name}
        duration={result.file.duration}
        peaks={peakList}
        note={scan.audioId ? "AUDIO LOCAL" : "DEMO SIN AUDIO"}
      />

      <div className="tabs result-tabs" role="tablist" aria-label="Secciones del informe">
        {(
          [
            ["resumen", "Resumen"],
            ["espectro", "Espectro"],
            ["loudness", "Loudness"],
            ["modulos", "Módulos", String(result.modules.length)],
            ["recos", "Recomendaciones", String(result.recommendations.length)],
          ] as [TabId, string, string?][]
        ).map(([id, label, count]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={`tab ${tab === id ? "tab--active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
            {count && <span className="tab__count">{count}</span>}
          </button>
        ))}
      </div>

      {tab === "resumen" && (
        <div className="result-panel">
          <div className="report-grid">
            <div className="chart-card">
              <div className="chart-head">
                <span className="chart-title">Probabilidad de IA · canción completa</span>
                <span className={`chip chip--${zone === "optimo" || zone === "seguro" ? "emerald" : zone === "riesgo" ? "gold" : "danger"}`}>
                  {result.ai.probability.toFixed(1)}%
                </span>
              </div>
              <div className="big-prob">
                <span className="big-prob__value" style={{ color: `var(--${zone === "peligro" ? "danger" : zone === "riesgo" ? "gold" : "emerald"})` }}>
                  {result.ai.probability.toFixed(1)}
                  <small>%</small>
                </span>
                <span className={`big-prob__zone big-prob__zone--${ZONE_CLASS[zone]}`}>{ZONE_LABEL[zone]}</span>
              </div>
              <ScaleGauge probability={result.ai.probability} />
              <p className="chart-note" style={{ marginTop: 18, lineHeight: 1.7, letterSpacing: 0 }}>
                Índice heurístico de {signals.length} señales ponderadas. No es una medición de ACRCloud ni una
                garantía frente a plataformas: es una lectura local y explicable de tu master.
              </p>
            </div>

            <div className="chart-card">
              <div className="chart-head">
                <span className="chart-title">¿Qué explica el índice?</span>
                <span className="chart-note">SEÑAL · PESO</span>
              </div>
              <div className="signal-list">
                {topSignals.map((s) => (
                  <div className="signal-row" key={s.id}>
                    <div className="signal-row__head">
                      <span className="signal-row__label">{s.label}</span>
                      <span className="signal-row__value mono">{s.value.toFixed(0)}</span>
                    </div>
                    <div className="signal-row__track">
                      <span
                        className={`signal-row__fill ${s.value > 45 ? "is-high" : s.value > 20 ? "is-mid" : ""}`}
                        style={{ width: `${Math.max(2, s.value)}%` }}
                      />
                    </div>
                    <div className="signal-row__meta mono">
                      peso {(s.weight * 100).toFixed(0)}% · aporte {(s.value * s.weight).toFixed(1)} pts
                    </div>
                  </div>
                ))}
              </div>
              <button className="link link--mono signal-link" onClick={() => setTab("modulos")}>
                Ver los {result.modules.length} módulos <ArrowUpRight size={12} />
              </button>
            </div>
          </div>

          <div className="meta-grid" style={{ marginTop: 16 }}>
            <Meta k="LUFS INTEGRADOS" v={`${result.loudness.lufs.toFixed(1)}`} />
            <Meta k="PICO REAL" v={`${result.loudness.truePeak.toFixed(2)} dBTP`} />
            <Meta k="BPM" v={result.rhythm.bpm.toFixed(1)} />
            <Meta k="TONALIDAD" v={result.tonal.key} />
            <Meta k="CORRELACIÓN" v={result.stereo.isMono ? "MONO" : result.stereo.correlation.toFixed(2)} />
            <Meta k="ANCHURA ESTÉREO" v={result.stereo.isMono ? "—" : result.stereo.width.toFixed(2)} />
            <Meta k="SECCIONES" v={String(result.sections.length)} />
            <Meta k="MUESTREO" v={`${(result.file.sampleRate / 1000).toFixed(1)} kHz`} />
          </div>

          <div className="grid-2" style={{ marginTop: 16 }}>
            <div className="chart-card">
              <div className="chart-head">
                <span className="chart-title">Mejor hook detectado</span>
                <span className="chart-note">ENERGÍA + NOVEDAD</span>
              </div>
              <div className="hook-box">
                <WaveformIcon size={18} color="var(--emerald-ink)" />
                <span className="mono hook-box__time">
                  {formatDuration(result.hook.start)} — {formatDuration(result.hook.end)}
                </span>
                <Link to={`/projects/${scan.projectId}`} className="link link--mono" style={{ marginLeft: "auto" }}>
                  Ver proyecto <ArrowUpRight size={12} />
                </Link>
              </div>
              <div className="sections-bar" aria-label="Secciones detectadas">
                {result.sections.map((s, i) => (
                  <span
                    key={`${s.start}-${i}`}
                    className="sections-bar__seg"
                    style={{
                      flex: Math.max(0.2, s.end - s.start),
                      opacity: 0.35 + s.energy * 0.65,
                    }}
                    title={`${s.label} · ${formatDuration(s.start)}–${formatDuration(s.end)}`}
                  >
                    {s.end - s.start > result.file.duration * 0.12 ? s.label : ""}
                  </span>
                ))}
              </div>
              <div className="axis-labels">
                <span>{formatDuration(0)}</span>
                <span>{formatDuration(result.file.duration / 2)}</span>
                <span>{formatDuration(result.file.duration)}</span>
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-head">
                <span className="chart-title">Recomendación prioritaria</span>
                <span className="chart-note">{result.recommendations[0]?.area ?? "—"}</span>
              </div>
              {result.recommendations[0] ? (
                <>
                  <div className="reco reco--featured">
                    <div className="reco__num">01</div>
                    <div>
                      <div className="reco__title">{result.recommendations[0].title}</div>
                      <p className="reco__text">{result.recommendations[0].detail}</p>
                      <span className={`chip reco__tag ${result.recommendations[0].impact === "alto" ? "chip--gold" : ""}`}>
                        IMPACTO {result.recommendations[0].impact.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <button className="link link--mono" onClick={() => setTab("recos")}>
                    Ver todas las recomendaciones <ArrowRight size={12} />
                  </button>
                </>
              ) : (
                <p className="muted">Sin recomendaciones: el track está dentro de rango.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "espectro" && (
        <div className="result-panel stack-4">
          <div className="report-grid">
            <div className="chart-card">
              <div className="chart-head">
                <span className="chart-title">Balance espectral</span>
                <span className="chart-note">dB RELATIVO AL TOTAL</span>
              </div>
              <div className="spectrum-chart" aria-label="Balance por bandas">
                {result.spectrum.map((b) => (
                  <div className="spectrum-col" key={b.label}>
                    <span className="spectrum-col__value mono">{b.value.toFixed(0)}</span>
                    <span className="spectrum-col__track">
                      <span className="spectrum-col__bar" style={{ height: `${Math.max(3, Math.min(100, b.value))}%` }} />
                    </span>
                    <span className="spectrum-col__label">{b.label}</span>
                  </div>
                ))}
              </div>
              <div className="band-list" style={{ marginTop: 18 }}>
                {result.spectrum.map((b) => (
                  <div className="band-row" key={b.label}>
                    <span>{b.label}</span>
                    <span className="band-row__track">
                      <span className="band-row__fill" style={{ width: `${Math.max(2, b.value)}%` }} />
                    </span>
                    <span className="band-row__val">{b.value.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-head">
                <span className="chart-title">Huella tonal</span>
                <span className="chart-note">FFT 2048 · HANN</span>
              </div>
              <div className="meta-grid">
                <Meta k="CENTROIDE" v={`${formatNumber(result.tonal.centroid)} Hz`} />
                <Meta k="ROLLOFF 85%" v={`${formatNumber(result.tonal.rolloff)} Hz`} />
                <Meta k="PLANITUD" v={result.tonal.flatness.toFixed(4)} />
                <Meta k="SPARKLE" v={`${(result.tonal.sparkle * 100).toFixed(1)}%`} />
                <Meta k="CONTRASTE" v={`${result.tonal.contrast.toFixed(1)} dB`} />
                <Meta k="CORTE HF" v={`${formatNumber(result.tonal.hfCutoff)} Hz`} />
              </div>
              <div className="divider" />
              <p className="chart-note" style={{ lineHeight: 1.7, letterSpacing: 0 }}>
                Un corte abrupto por encima de 16 kHz sugiere recodificación o limitación agresiva. La falta de aire
                entre 10 y 16 kHz es una de las huellas más fáciles de detectar.
              </p>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-head">
              <span className="chart-title">Espectrograma</span>
              <span className="chart-note">{result.spectrogram.bands} BANDAS LOG · {Math.round(result.spectrogram.frames.length / result.spectrogram.bands)} FRAMES</span>
            </div>
            <Spectrogram frames={result.spectrogram.frames} bands={result.spectrogram.bands} height={190} />
            <div className="axis-labels">
              <span>{formatDuration(0)}</span>
              <span>1 kHz</span>
              <span>10 kHz</span>
              <span>20 kHz</span>
            </div>
          </div>
        </div>
      )}

      {tab === "loudness" && (
        <div className="result-panel stack-4">
          <div className="report-grid">
            <div className="chart-card">
              <div className="chart-head">
                <span className="chart-title">Métricas de master</span>
                <span className="chart-note">ITU-R BS.1770 · dBTP</span>
              </div>
              <div className="range-list">
                <RangeMeter label="Loudness integrado" value={result.loudness.lufs} min={-20} max={-4} target={[-14, -9]} unit="LUFS" />
                <RangeMeter label="Pico real" value={result.loudness.truePeak} min={-6} max={2} target={[-1.5, -0.3]} unit="dBTP" decimals={2} />
                <RangeMeter label="Rango de loudness (LRA)" value={result.loudness.lra} min={0} max={20} target={[5, 10]} unit="LU" />
                <RangeMeter label="Crest factor" value={result.loudness.crest} min={0} max={24} target={[8, 14]} unit="dB" />
                <RangeMeter label="Peak-to-loudness" value={result.loudness.plr} min={0} max={20} target={[7, 12]} unit="dB" />
                <RangeMeter label="Suelo de ruido" value={result.loudness.noiseFloor} min={-90} max={-30} target={[-78, -56]} unit="dBFS" />
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-head">
                <span className="chart-title">Estéreo y fase</span>
                <span className="chart-note">{result.stereo.isMono ? "FUENTE MONO" : "M/S"}</span>
              </div>
              {result.stereo.isMono ? (
                <div className="empty" style={{ padding: "26px 16px" }}>
                  <Lock size={18} />
                  <p>El archivo es mono. El análisis estéreo no aplica, pero conviene revisar la anchura al doblar la pista.</p>
                </div>
              ) : (
                <div className="range-list">
                  <RangeMeter label="Correlación" value={result.stereo.correlation} min={-1} max={1} target={[0.1, 0.7]} unit="" decimals={2} />
                  <RangeMeter label="Anchura estéreo" value={result.stereo.width} min={0} max={1} target={[0.2, 0.6]} unit="" decimals={2} />
                  <RangeMeter label="Balance L/R" value={result.stereo.balance} min={-1} max={1} target={[-0.15, 0.15]} unit="" decimals={2} />
                </div>
              )}
              <div className="divider" />
              <div className="statlines">
                <div><span>RMS</span><b>{result.loudness.rms.toFixed(1)} dBFS</b></div>
                <div><span>Peak</span><b>{result.loudness.peak.toFixed(1)} dBFS</b></div>
                <div><span>Clipping</span><b>{result.loudness.clipping} samples</b></div>
                <div><span>DC offset</span><b>{result.loudness.dcOffset.toFixed(5)}</b></div>
              </div>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-head">
              <span className="chart-title">Estructura y dinámica por sección</span>
              <span className="chart-note">ENERGÍA RELATIVA</span>
            </div>
            <div className="section-timeline">
              {result.sections.map((s, i) => (
                <div className="section-timeline__item" key={`${s.start}-${i}`} style={{ flex: Math.max(0.35, s.end - s.start) }}>
                  <div className="section-timeline__bar">
                    <span style={{ height: `${Math.max(6, s.energy * 100)}%` }} />
                  </div>
                  <div className="section-timeline__label">{s.label}</div>
                  <div className="section-timeline__time mono">{formatDuration(s.start)}</div>
                </div>
              ))}
            </div>
            <div className="divider" />
            <div className="row-flex">
              <span className="chip chip--emerald">HOOK {formatDuration(result.hook.start)}–{formatDuration(result.hook.end)}</span>
              <span className="chip">{result.modules.find((m) => m.id === "dynamics")?.detail}</span>
            </div>
          </div>
        </div>
      )}

      {tab === "modulos" && (
        <div className="result-panel">
          <div className="modules-head">
            <div>
              <div className="chart-title">Módulos del motor local</div>
              <p className="chart-note" style={{ marginTop: 6, letterSpacing: 0 }}>
                Cada módulo mide una huella distinta. El porcentaje es su lectura de “señal sintética”, no una
                probabilidad independiente.
              </p>
            </div>
            <span className="chip">{result.modules.length} MÓDULOS</span>
          </div>
          <div className="modules" style={{ marginTop: 16 }}>
            {result.modules.map((m) => (
              <div className="module" key={m.id}>
                <div className="module__head">
                  <span className="module__name">{m.name}</span>
                  <span className="module__score">{m.score}/100</span>
                </div>
                <div className="module__bar">
                  <span
                    className={`module__fill ${m.score > 55 ? "module__fill--high" : m.score > 30 ? "module__fill--mid" : "module__fill--low"}`}
                    style={{ width: `${Math.max(2, m.score)}%` }}
                  />
                </div>
                <div className="module__text mono" style={{ textTransform: "none", letterSpacing: 0, fontSize: 10.5 }}>
                  {m.detail}
                </div>
                <div className="module__advice">{m.advice}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "recos" && (
        <div className="result-panel">
          <div className="report-grid">
            <div className="chart-card">
              <div className="chart-head">
                <span className="chart-title">Plan de mejora</span>
                <span className="chart-note">ORDENADO POR IMPACTO</span>
              </div>
              {result.recommendations.length ? (
                result.recommendations.map((r, i) => (
                  <div className="reco" key={r.title}>
                    <div className="reco__num">{String(i + 1).padStart(2, "0")}</div>
                    <div style={{ flex: 1 }}>
                      <div className="reco__title">{r.title}</div>
                      <p className="reco__text">{r.detail}</p>
                      <div className="row-flex" style={{ marginTop: 8 }}>
                        <span className={`chip ${r.impact === "alto" ? "chip--gold" : r.impact === "medio" ? "chip--emerald" : ""}`}>
                          IMPACTO {r.impact.toUpperCase()}
                        </span>
                        <span className="chip">{r.area.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty">
                  <CheckCircle2 size={22} color="var(--emerald-ink)" />
                  <h3>Sin correcciones urgentes</h3>
                  <p>El track está dentro de los rangos medidos. Sigue así.</p>
                </div>
              )}
            </div>

            <div className="stack-4">
              <div className="chart-card warn-card">
                <div className="row-flex" style={{ alignItems: "flex-start" }}>
                  <Info size={16} color="var(--gold-ink)" style={{ marginTop: 2, flex: "none" }} />
                  <div>
                    <div className="chart-title" style={{ color: "var(--gold-ink)" }}>Cómo leer este índice</div>
                    <p className="chart-note" style={{ marginTop: 8, letterSpacing: 0, lineHeight: 1.7 }}>
                      Este índice se calcula con DSP local sobre el archivo. No tiene acceso a servicios externos de detección:
                      calcula un índice heurístico con Web Audio DSP, explica cada señal y no envía tu audio a ningún
                      servidor. Úsalo como diagnóstico técnico, no como certificado.
                    </p>
                  </div>
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-head">
                  <span className="chart-title">Trazabilidad</span>
                  <span className="chart-note">LOCAL</span>
                </div>
                <div className="statlines">
                  <div><span>Motor</span><b>{result.engine}</b></div>
                  <div><span>Versión</span><b>{result.version}</b></div>
                  <div><span>Análisis</span><b>{new Date(result.createdAt).toLocaleString("es-ES")}</b></div>
                  <div><span>Archivo</span><b>{result.file.name}</b></div>
                  <div><span>Muestreo</span><b>{formatNumber(result.file.sampleRate)} Hz</b></div>
                  <div><span>Canales</span><b>{result.file.channels}</b></div>
                </div>
              </div>

              <div className="chart-card">
                <div className="row-flex" style={{ alignItems: "flex-start" }}>
                  <Fingerprint size={16} color="var(--emerald-ink)" style={{ marginTop: 2, flex: "none" }} />
                  <div>
                    <div className="chart-title">Siguiente paso</div>
                    <p className="chart-note" style={{ marginTop: 8, letterSpacing: 0, lineHeight: 1.7 }}>
                      Compara este resultado con un diagnóstico forense por género y sella el master con el Escudo
                      Protector para dejar una prueba de existencia local.
                    </p>
                    <div className="row-flex" style={{ marginTop: 12 }}>
                      <Link className="btn btn--soft btn--sm" to={`/forensic?scan=${scan.id}`}>
                        <Gauge size={13} /> Forense
                      </Link>
                      <Link className="btn btn--ghost btn--sm" to={`/shield?scan=${scan.id}`}>
                        <Lock size={13} /> Certificar
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="engine-note">
        <Lightbulb size={14} />
        <span>
          <b>Motor {result.engine}.</b> Índice heurístico y explicable. No es ACRCloud ni una garantía de resultados
          en Spotify, YouTube o TikTok. {result.ai.confidence === "baja" ? "Muestra corta: confianza baja." : ""}
        </span>
      </div>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="meta-item">
      <div className="meta-item__k">{k}</div>
      <div className="meta-item__v">{v}</div>
    </div>
  );
}

export function zoneTone(zone: RiskZone): RingTone {
  return TONE[zone];
}

export function zoneClass(zone: RiskZone): string {
  return ZONE_CLASS[zone];
}

export function ProbabilityPill({ probability }: { probability: number }) {
  const zone = zoneFromProbability(probability);
  return (
    <span className={`prob-pill prob-pill--${ZONE_CLASS[zone]}`}>
      <b>{probability.toFixed(0)}%</b>
      <span>IA</span>
    </span>
  );
}

export function ScanMini({ scan }: { scan: ScanRecord }) {
  const { result } = scan;
  const zone = result.ai.zone;
  return (
    <div className="scan-mini">
      <div className={`scan-mini__score scan-mini__score--${ZONE_CLASS[zone]}`}>{result.ai.probability.toFixed(0)}%</div>
      <div className="scan-mini__body">
        <div className="scan-mini__title">{result.file.name}</div>
        <div className="scan-mini__meta">
          {formatDuration(result.file.duration)} · {result.tonal.key} · {ZONE_LABEL[zone]}
        </div>
      </div>
      <AlertTriangle size={14} style={{ opacity: 0 }} />
    </div>
  );
}
