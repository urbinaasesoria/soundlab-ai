import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  Crown,
  FileAudio,
  Info,
  Lock,
  ScanLine,
  Sparkles,
} from "lucide-react";
import { useStudio } from "../lib/storage/store";
import { COST, type ScanRecord } from "../lib/storage/types";
import type { AnalysisResult } from "../lib/audio/analyzer";
import { GENRE_TARGETS, type GenreTarget } from "../lib/data/genres";
import { formatDate, formatDuration, formatNumber } from "../lib/utils";
import { RadarChart } from "../components/RadarChart";
import { Modal } from "../components/Modal";

type Mode = "track" | "stems";

interface ForensicMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  decimals: number;
  target: [number, number];
  fit: number;
  note: string;
  advice: string;
}

interface Report {
  baseScanId: string;
  savedScanId: string;
  genreId: string;
  metrics: ForensicMetric[];
  overall: number;
  createdAt: number;
}

const WEIGHTS: Record<string, number> = {
  lufs: 1.2,
  truePeak: 1,
  lra: 1,
  crest: 0.8,
  width: 0.8,
  correlation: 0.6,
  bpm: 0.6,
  hf: 0.6,
};

function rangeFit(value: number, target: [number, number]): number {
  const [lo, hi] = target;
  if (value >= lo && value <= hi) return 100;
  const span = Math.max(0.5, hi - lo);
  const distance = value < lo ? lo - value : value - hi;
  return Math.max(0, Math.round((1 - distance / (span * 0.85)) * 100));
}

function buildMetrics(result: AnalysisResult, genre: GenreTarget): ForensicMetric[] {
  const { loudness, stereo, rhythm, tonal } = result;
  const mono = stereo.isMono;

  const define = (
    id: string,
    label: string,
    value: number,
    unit: string,
    decimals: number,
    target: [number, number],
    note: string,
    advice: string,
    forcedFit?: number,
  ): ForensicMetric => ({
    id,
    label,
    value,
    unit,
    decimals,
    target,
    fit: forcedFit ?? rangeFit(value, target),
    note,
    advice,
  });

  const metrics: ForensicMetric[] = [
    define(
      "lufs",
      "Loudness integrado",
      loudness.lufs,
      "LUFS",
      1,
      genre.lufs,
      `El genre ${genre.name.toLowerCase()} se mueve entre ${genre.lufs[0]} y ${genre.lufs[1]} LUFS.`,
      loudness.lufs > genre.lufs[1]
        ? "Baja el limitador 0,5–1 dB y deja respirar el bus. Un master demasiado caliente pierde transitorios y dispara la fatiga."
        : "Sube la ganancia de entrada o el limitador hasta entrar en el rango, cuidando que el pico real no supere el techo.",
    ),
    define(
      "truePeak",
      "Pico real",
      loudness.truePeak,
      "dBTP",
      2,
      genre.truePeak,
      `Techo recomendado: ${genre.truePeak[0]} a ${genre.truePeak[1]} dBTP.`,
      loudness.truePeak > genre.truePeak[1]
        ? "Baja el techo del limitador: los codecs de streaming pueden inter-samplear por encima de 0 dBTP y distortar."
        : "Todavía tienes margen. Puedes subir 0,2–0,4 dB el limitador si necesitas más nivel percibido.",
    ),
    define(
      "lra",
      "Rango de loudness",
      loudness.lra,
      "LU",
      1,
      genre.lra,
      `Rango esperado para ${genre.name.toLowerCase()}: ${genre.lra[0]}–${genre.lra[1]} LU.`,
      loudness.lra < genre.lra[0]
        ? "La mezcla está sobrecomprimida. Automatiza el bus y recupera contraste entre verso y coro."
        : "Hay más dinámica de la habitual. Revisa si los cambios de sección necesitan control de nivel o compresión suave.",
    ),
    define(
      "crest",
      "Crest factor",
      loudness.crest,
      "dB",
      1,
      genre.crest,
      `Crest objetivo: ${genre.crest[0]}–${genre.crest[1]} dB.`,
      loudness.crest < genre.crest[0]
        ? "Los transitorios están aplastados. Reduce la compresión del bus y revisa el ataque de los limitadores."
        : "Crest alto: el master puede sonar desparejo frente a referencias. Controla picos con clip suave o limitación.",
    ),
    define(
      "width",
      "Anchura estéreo",
      stereo.width,
      "",
      2,
      genre.width,
      `Anchura objetivo: ${genre.width[0]}–${genre.width[1]}.`,
      mono
        ? "La fuente es mono. Si el género pide amplitud, dobla guitarras o sintetizadores y abre el campo sin tocar el centro."
        : stereo.width < genre.width[0]
          ? "El campo está estrecho. Automatiza paneos y usa M/S con cuidado para no perder el centro."
          : "El campo es más ancho que la referencia. Comprueba la suma mono y reduce el side en graves.",
      mono ? 45 : undefined,
    ),
    define(
      "correlation",
      "Correlación de fase",
      stereo.correlation,
      "",
      2,
      genre.correlation,
      `Correlación objetivo: ${genre.correlation[0]}–${genre.correlation[1]}.`,
      mono
        ? "Sin señal estéreo no hay correlación que medir. Este eje queda fuera del veredicto."
        : stereo.correlation < genre.correlation[0]
          ? "Hay riesgo de cancelación al sumar en mono. Revisa los elementos laterales y el ancho de los pads."
          : "La imagen es muy coherente. Si suena sintética, introduce pequeñas diferencias de fase naturales entre capas.",
      mono ? 50 : undefined,
    ),
    define(
      "bpm",
      "Tempo",
      rhythm.bpm,
      "BPM",
      1,
      genre.bpm,
      `Rango habitual: ${genre.bpm[0]}–${genre.bpm[1]} BPM.`,
      rhythm.bpm < genre.bpm[0]
        ? "El tempo está por debajo del rango. Si buscas el género, sube 2–4 BPM y reevalúa el groove."
        : "El tempo está por encima del rango. Comprueba si el doble tiempo es intencional antes de corregir.",
    ),
    define(
      "hf",
      "Extensión de agudos",
      tonal.hfCutoff,
      "Hz",
      0,
      genre.hf,
      `Corte de agudos esperado: ${formatNumber(genre.hf[0])}–${formatNumber(genre.hf[1])} Hz.`,
      tonal.hfCutoff < genre.hf[0]
        ? "El master pierde aire por encima de 15 kHz. Revisa la cadena de limitación y si hay un códec intermedio recortando agudos."
        : "La extensión de agudos está dentro de la referencia. Cuida que el aire no sea solo ruido añadido.",
    ),
  ];

  return metrics;
}

function overallScore(metrics: ForensicMetric[]): number {
  let sum = 0;
  let total = 0;
  for (const metric of metrics) {
    const weight = WEIGHTS[metric.id] ?? 0.5;
    sum += metric.fit * weight;
    total += weight;
  }
  return total ? Math.round(sum / total) : 0;
}

function toneFor(score: number) {
  return score >= 80 ? "emerald" : score >= 55 ? "gold" : "danger";
}

export function ForensicPage() {
  const { prefs, projects, scans, addScan, spend, addCredits, toast } = useStudio();
  const [params] = useSearchParams();
  const queryScanId = params.get("scan");
  const sortedScans = useMemo(() => scans.slice().sort((a, b) => b.createdAt - a.createdAt), [scans]);
  const initialScan = sortedScans.find((s) => s.id === queryScanId) ?? sortedScans[0];
  const [scanId, setScanId] = useState(initialScan?.id ?? "");
  const [genreId, setGenreId] = useState(GENRE_TARGETS[0].id);
  const [mode, setMode] = useState<Mode>("track");
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [proOpen, setProOpen] = useState(false);

  const scan = scans.find((s) => s.id === scanId) ?? sortedScans[0];
  const project = scan ? projects.find((p) => p.id === scan.projectId) : undefined;
  const genre = GENRE_TARGETS.find((g) => g.id === genreId) ?? GENRE_TARGETS[0];
  const pro = prefs.plan === "pro";

  const liveMetrics = useMemo(
    () => (scan ? buildMetrics(scan.result, genre) : []),
    [scan, genre],
  );

  const generate = async () => {
    if (!scan) return;
    if (!spend(COST.forensic, "el análisis forense")) return;
    setBusy(true);
    try {
      const metrics = buildMetrics(scan.result, genre);
      const saved = await addScan({
        projectId: scan.projectId,
        result: scan.result,
        source: "forensic",
        tier: "rapido",
        label: `Forense · ${genre.name}`,
      });
      setReport({
        baseScanId: scan.id,
        savedScanId: saved.id,
        genreId: genre.id,
        metrics,
        overall: overallScore(metrics),
        createdAt: Date.now(),
      });
      toast(`Diagnóstico forense guardado contra el estándar de ${genre.name}.`, "ok");
    } catch (err) {
      addCredits(COST.forensic, "Reembolso del análisis forense");
      toast(err instanceof Error ? err.message : "No se pudo generar el diagnóstico.", "err");
    } finally {
      setBusy(false);
    }
  };

  const chooseStems = () => {
    if (!pro) {
      setProOpen(true);
      return;
    }
    setMode("stems");
  };

  const activeMetrics = report ? report.metrics : liveMetrics;
  const radarAxes = activeMetrics
    .filter((m) => ["lufs", "truePeak", "lra", "crest", "width", "hf"].includes(m.id))
    .map((m) => ({ label: m.label.replace(" integrado", "").replace(" real", "").replace(" de loudness", ""), value: m.fit }));
  const deviations = activeMetrics.filter((m) => m.fit < 100).sort((a, b) => a.fit - b.fit);

  return (
    <div className="page forensic">
      <div className="page-head page-head--center">
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>DIAGNÓSTICO DE MASTER</div>
          <h1>Análisis Forense</h1>
          <p className="page-head__sub">
            Medimos loudness, dinámica, frecuencia y estéreo contra el estándar de tu género, con gráfico espectral y el
            detalle exacto de qué corregir.
          </p>
        </div>
      </div>

      <div className="forensic-mode-label">Elige qué quieres diagnosticar</div>
      <div className="mode-grid">
        <button className={`mode-card ${mode === "track" ? "mode-card--selected" : ""}`} onClick={() => setMode("track")}>
          <div className="mode-card__top">
            <span className="eyebrow">ANÁLISIS</span>
            {mode === "track" && <span className="chip chip--emerald"><Check size={11} /> ACTIVO</span>}
          </div>
          <div className="mode-card__title"><Activity size={16} /> TRACK COMPLETO</div>
          <p className="mode-card__text">
            Mide la mezcla ya unida y te muestra qué parámetros están fuera del rango de tu género.
          </p>
          <span className="mode-card__foot mono">8 PARÁMETROS · {COST.forensic} CRÉDITOS</span>
        </button>

        <button className={`mode-card mode-card--pro ${mode === "stems" ? "mode-card--selected" : ""}`} onClick={chooseStems}>
          <div className="mode-card__top">
            <span className="eyebrow">ANÁLISIS <span className="chip chip--gold">HIGH</span></span>
            <span className="chip chip--gold">{pro ? "PRO" : <><Lock size={10} /> PRO</>}</span>
          </div>
          <div className="mode-card__title"><Sparkles size={16} /> POR STEMS</div>
          <p className="mode-card__text">
            Mide cada pista contra su propio estándar y detecta dónde se tapan entre ellas.
          </p>
          <span className="mode-card__foot mono">{pro ? "ABRIR MÓDULO" : "PÁSATE A PRO"}</span>
        </button>
      </div>

      {mode === "stems" ? (
        <div className="locked-panel" style={{ marginTop: 20 }}>
          <div className="locked-panel__icon"><Lock size={26} /></div>
          <div className="chip chip--gold">ANÁLISIS POR STEMS · EN INVESTIGACIÓN</div>
          <h2>No vamos a inventar un análisis que no podemos hacer</h2>
          <p>
            El análisis por stems requiere separar o recibir las pistas individuales (voz, bajo, batería, etc.) y medir
            cada una contra su referencia. Este análisis no incluye separación de fuentes ni un modelo entrenado para
            juzgar el masking entre stems, así que deja el módulo bloqueado en lugar de generar números falsos.
          </p>
          <div className="row-flex" style={{ justifyContent: "center" }}>
            <button className="btn btn--ghost btn--sm" onClick={() => setMode("track")}>
              Volver al track completo
            </button>
            <Link className="btn btn--primary btn--sm" to="/scan?project=">
              <ScanLine size={13} /> Analizar un track
            </Link>
          </div>
        </div>
      ) : !scan ? (
        <div className="empty" style={{ marginTop: 20 }}>
          <FileAudio size={26} />
          <h3>Aún no hay un track analizado</h3>
          <p>El diagnóstico forense compara un análisis existente con el estándar de un género. Escanea primero tu master.</p>
          <Link className="btn btn--primary btn--sm" to="/scan" style={{ marginTop: 8 }}>
            <ScanLine size={13} /> Escanear un track
          </Link>
        </div>
      ) : (
        <>
          <div className="forensic-setup">
            <div className="forensic-setup__field">
              <label className="label" htmlFor="forensic-scan">1 · Análisis de referencia</label>
              <select id="forensic-scan" className="select" value={scan?.id ?? ""} onChange={(e) => { setScanId(e.target.value); setReport(null); }}>
                {sortedScans.map((s) => (
                  <option key={s.id} value={s.id}>
                    {projects.find((p) => p.id === s.projectId)?.trackName ?? "Proyecto"} — {s.result.ai.probability.toFixed(1)}% IA
                  </option>
                ))}
              </select>
              <div className="forensic-setup__hint">
                {scan.result.file.name} · {formatDuration(scan.result.file.duration)} · {scan.result.tonal.key}
                {scan.source === "forensic" ? " · ya es un análisis forense" : ""}
              </div>
            </div>

            <div className="forensic-setup__field forensic-setup__field--wide">
              <span className="label">2 · Género de referencia</span>
              <div className="genre-pick" role="listbox" aria-label="Género de referencia">
                {GENRE_TARGETS.map((g) => (
                  <button
                    key={g.id}
                    role="option"
                    aria-selected={g.id === genre.id}
                    className={`genre-pick__item ${g.id === genre.id ? "is-active" : ""}`}
                    onClick={() => { setGenreId(g.id); setReport(null); }}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
              <div className="forensic-setup__hint">{genre.note}</div>
            </div>

            <div className="forensic-setup__action">
              <div className="forensic-setup__cost mono">
                <span>{COST.forensic} créditos</span>
                <span className="mute">saldo {formatNumber(prefs.credits)}</span>
              </div>
              <button className="btn btn--primary btn--lg" onClick={generate} disabled={busy || prefs.credits < COST.forensic}>
                {busy ? <span className="spinner" /> : <Activity size={16} />} Generar diagnóstico
              </button>
              <Link className="link link--mono" to={`/scan?project=${scan.projectId}`}>Escanear otra toma</Link>
            </div>
          </div>

          <div className="forensic-report">
            <div className="forensic-report__head">
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>
                  {report ? "DIAGNÓSTICO GUARDADO" : "VISTA PREVIA · AÚN SIN GUARDAR"}
                </div>
                <h2>
                  Ajuste a <strong>{genre.name}</strong>
                </h2>
                <p className="chart-note" style={{ letterSpacing: 0, marginTop: 6 }}>
                  {report
                    ? `Guardado el ${formatDate(report.createdAt)} en ${project?.trackName ?? "tu proyecto"}.`
                    : "Los valores se recalculan al cambiar de género. Genera el diagnóstico para guardarlo en el proyecto."}
                </p>
              </div>
              <div className={`fit-badge fit-badge--${toneFor(overallScore(activeMetrics))}`}>
                <span className="fit-badge__value">{overallScore(activeMetrics)}</span>
                <span className="fit-badge__label">AJUSTE AL ESTÁNDAR</span>
              </div>
            </div>

            <div className="report-grid" style={{ marginTop: 18 }}>
              <div className="chart-card">
                <div className="chart-head">
                  <span className="chart-title">Radar de ajuste</span>
                  <span className="chart-note">6 EJES · 100 = DENTRO DEL RANGO</span>
                </div>
                <RadarChart axes={radarAxes} size={360} />
                <p className="chart-note" style={{ marginTop: 10, letterSpacing: 0, lineHeight: 1.7 }}>
                  El radar normaliza cada medición contra el rango orientativo de {genre.name.toLowerCase()}. Un valor
                  bajo señala una desviación técnica, no una nota artística.
                </p>
              </div>

              <div className="chart-card">
                <div className="chart-head">
                  <span className="chart-title">Lectura del master</span>
                  <span className="chart-note">{scan.result.engine.split(" · ")[0]}</span>
                </div>
                <div className="statlines">
                  <div><span>Archivo</span><b>{scan.result.file.name}</b></div>
                  <div><span>Duración</span><b>{formatDuration(scan.result.file.duration)}</b></div>
                  <div><span>Loudness</span><b>{scan.result.loudness.lufs.toFixed(1)} LUFS</b></div>
                  <div><span>Pico real</span><b>{scan.result.loudness.truePeak.toFixed(2)} dBTP</b></div>
                  <div><span>LRA</span><b>{scan.result.loudness.lra.toFixed(1)} LU</b></div>
                  <div><span>Crest</span><b>{scan.result.loudness.crest.toFixed(1)} dB</b></div>
                  <div><span>Estéreo</span><b>{scan.result.stereo.isMono ? "MONO" : `${scan.result.stereo.correlation.toFixed(2)} corr.`}</b></div>
                  <div><span>Tempo</span><b>{scan.result.rhythm.bpm.toFixed(1)} BPM</b></div>
                </div>
                <div className="divider" />
                <div className="row-flex">
                  <span className={`chip chip--${toneFor(overallScore(activeMetrics))}`}>
                    {deviations.length === 0 ? "SIN DESVIACIONES" : `${deviations.length} PARÁMETROS A REVISAR`}
                  </span>
                  <span className="chip">{genre.bpm[0]}–{genre.bpm[1]} BPM REF.</span>
                </div>
                {report ? (
                  <div className="row-flex" style={{ marginTop: 14 }}>
                    <Link className="btn btn--primary btn--sm" to={`/report/${report.savedScanId}`}>
                      <FileAudio size={13} /> Ver informe
                    </Link>
                    <Link className="btn btn--ghost btn--sm" to={`/projects/${scan.projectId}`}>
                      Ir al proyecto <ArrowRight size={13} />
                    </Link>
                  </div>
                ) : (
                  <div className="inline-note" style={{ marginTop: 14 }}>
                    <Info size={14} />
                    <span>Vista previa local. Generar descuenta {COST.forensic} créditos y guarda el diagnóstico.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="chart-card" style={{ marginTop: 18 }}>
              <div className="chart-head">
                <span className="chart-title">Parámetro por parámetro</span>
                <span className="chart-note">VALOR · REFERENCIA · AJUSTE</span>
              </div>
              <div className="metric-table">
                {activeMetrics.map((m) => (
                  <div className="metric-row" key={m.id}>
                    <div className="metric-row__label">
                      <span>{m.label}</span>
                      <span className="metric-row__hint">{m.note}</span>
                    </div>
                    <div className="metric-row__value mono">
                      {m.value.toFixed(m.decimals)} <small>{m.unit}</small>
                    </div>
                    <div className="metric-row__ref mono">
                      {m.target[0]}{m.unit === "Hz" ? "" : ""}–{m.target[1]} {m.unit}
                    </div>
                    <div className="metric-row__bar">
                      <span className={`metric-row__fill metric-row__fill--${toneFor(m.fit)}`} style={{ width: `${Math.max(3, m.fit)}%` }} />
                    </div>
                    <span className={`metric-row__fit metric-row__fit--${toneFor(m.fit)}`}>{m.fit}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="chart-card" style={{ marginTop: 18 }}>
              <div className="chart-head">
                <span className="chart-title">Qué corregir primero</span>
                <span className="chart-note">{deviations.length} DESVIACIONES · ORDENADAS POR IMPACTO</span>
              </div>
              {deviations.length === 0 ? (
                <div className="forensic-clean">
                  <Check size={22} color="var(--emerald-ink)" />
                  <div>
                    <b>Todo dentro del estándar de {genre.name}</b>
                    <p>El master cumple los rangos orientativos del género. Revisa igualmente la intención artística y la suma mono.</p>
                  </div>
                </div>
              ) : (
                <div className="deviation-list">
                  {deviations.map((m, i) => (
                    <div className="deviation-card" key={m.id}>
                      <div className="deviation-card__num">{String(i + 1).padStart(2, "0")}</div>
                      <div style={{ flex: 1 }}>
                        <div className="deviation-card__head">
                          <b>{m.label}</b>
                          <span className={`chip chip--${toneFor(m.fit)}`}>{m.fit}% AJUSTE</span>
                        </div>
                        <p>{m.advice}</p>
                        <div className="deviation-card__meta mono">
                          MEDIDO {m.value.toFixed(m.decimals)} {m.unit} · OBJETIVO {m.target[0]}–{m.target[1]} {m.unit}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="engine-note" style={{ marginTop: 18 }}>
                <AlertTriangle size={14} />
                <span>
                  <b>Rangos orientativos.</b> Cada género y cada oyente son distintos. Esta comparación mide el master
                  con DSP local; no sustituye la escucha crítica ni una medición certificada.
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      <Modal
        open={proOpen}
        onClose={() => setProOpen(false)}
        eyebrow="FUNCIÓN PRO"
        title="Análisis por stems"
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
          El análisis por stems es una función avanzada del producto completo. Este entorno puede activar el modo Pro, pero no
          puede separar un master en pistas sin un modelo de source separation: preferimos bloquear el módulo antes que
          inventar un diagnóstico por stem.
        </p>
        <div className="pro-feature-list">
          {[
            "Comparación de cada stem contra su referencia",
            "Detección de masking y solapamiento",
            "Ajuste de niveles y paneo por pista",
            "Disponible cuando el motor local pueda separar fuentes",
          ].map((t) => (
            <div key={t} className="pro-feature"><Lock size={13} /> {t}</div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
