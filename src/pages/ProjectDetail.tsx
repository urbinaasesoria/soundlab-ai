import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  AudioWaveform,
  Copy,
  Download,
  FileText,
  Fingerprint,
  Lock,
  ScanLine,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useStudio } from "../lib/storage/store";
import {
  copyText,
  downloadSavedAudio,
  downloadText,
  formatDate,
  formatDateTime,
  shortHash,
} from "../lib/utils";
import { ZONE_LABEL } from "../lib/audio/analyzer";
import { ResultView, ProbabilityPill, resultHeadline } from "../components/ResultView";
import { AudioPlayer } from "../components/AudioPlayer";
import { Modal } from "../components/Modal";
import { RadarChart } from "../components/RadarChart";
import type { ScanRecord } from "../lib/storage/types";

type Tab = "scan" | "forensic" | "humanizer" | "shield" | "mixing" | "mastering";

export function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, scans, renders, certs, deleteScan, toast } = useStudio();
  const [tab, setTab] = useState<Tab>("scan");
  const [expandedScan, setExpandedScan] = useState<string | null>(null);
  const [removing, setRemoving] = useState<ScanRecord | null>(null);

  const project = projects.find((p) => p.id === id);
  const projectScans = useMemo(
    () => scans.filter((s) => s.projectId === id).sort((a, b) => b.createdAt - a.createdAt),
    [scans, id],
  );
  const scanOnly = projectScans.filter((s) => s.source === "scan");
  const forensicOnly = projectScans.filter((s) => s.source === "forensic");
  const projectRenders = renders.filter((r) => r.projectId === id).sort((a, b) => b.createdAt - a.createdAt);
  const projectCerts = certs.filter((c) => c.projectId === id).sort((a, b) => b.createdAt - a.createdAt);
  const best = projectScans.length ? Math.min(...projectScans.map((s) => s.result.ai.probability)) : null;
  const latest = projectScans[0];

  if (!project) {
    return (
      <div className="page page--narrow">
        <div className="empty" style={{ marginTop: 40 }}>
          <ScanLine size={26} />
          <h3>Proyecto no encontrado</h3>
          <p>Puede que se haya eliminado o que el enlace sea antiguo.</p>
          <Link className="btn btn--primary btn--sm" to="/projects" style={{ marginTop: 8 }}>
            <ArrowLeft size={13} /> Volver a proyectos
          </Link>
        </div>
      </div>
    );
  }

  const tabs: [Tab, string, number | null][] = [
    ["scan", "Escáner", scanOnly.length],
    ["forensic", "Forense", forensicOnly.length],
    ["humanizer", "Humanizador", projectRenders.filter((r) => r.kind === "humanizer").length],
    ["shield", "Escudo", projectCerts.length],
    ["mixing", "Mixing IA", null],
    ["mastering", "Mastering IA", null],
  ];

  return (
    <div className="page">
      <Link to="/projects" className="back-link">
        <ArrowLeft size={14} /> MIS PROYECTOS
      </Link>

      <div className="page-head project-head">
        <div>
          <h1>{project.trackName}</h1>
          <div className="project-head__meta">
            <span>{project.artistName}</span>
            <span className="dot" />
            <span>{projectScans.length} análisis</span>
            <span className="dot" />
            <span>creado {formatDate(project.createdAt)}</span>
            {project.isDemo && <span className="chip chip--gold">DEMO</span>}
          </div>
        </div>
        <div className="page-head__actions">
          <Link className="btn btn--ghost btn--sm" to={`/shield?project=${project.id}`}>
            <ShieldCheck size={14} /> Certificar
          </Link>
          <Link className="btn btn--primary" to={`/scan?project=${project.id}`}>
            <ScanLine size={15} /> Escanear track
          </Link>
        </div>
      </div>

      <div className="project-stats-row">
        <div className="mini-stat">
          <span className="mini-stat__k">Mejor resultado</span>
          <span className="mini-stat__v">{best === null ? "—" : <ProbabilityPill probability={best} />}</span>
        </div>
        <div className="mini-stat">
          <span className="mini-stat__k">Último análisis</span>
          <span className="mini-stat__v">{latest ? formatDate(latest.createdAt) : "—"}</span>
        </div>
        <div className="mini-stat">
          <span className="mini-stat__k">Humanizaciones</span>
          <span className="mini-stat__v">{projectRenders.filter((r) => r.kind === "humanizer").length}</span>
        </div>
        <div className="mini-stat">
          <span className="mini-stat__k">Certificados</span>
          <span className="mini-stat__v">{projectCerts.length}</span>
        </div>
        <div className="mini-stat">
          <span className="mini-stat__k">Estado</span>
          <span className="mini-stat__v">{latest ? resultHeadline(latest.result.ai.zone) : "SIN ANALIZAR"}</span>
        </div>
      </div>

      <div className="tabs project-tabs" role="tablist" aria-label="Herramientas del proyecto">
        {tabs.map(([id, label, count]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`tab ${tab === id ? "tab--active" : ""}`} onClick={() => setTab(id)}>
            {label}
            {count !== null ? <span className="tab__count">{count}</span> : <span className="badge badge--soon">PRO</span>}
          </button>
        ))}
      </div>

      {tab === "scan" && (
        <div className="stack-4">
          {scanOnly.length === 0 ? (
            <div className="empty">
              <ScanLine size={24} />
              <h3>Este proyecto aún no tiene análisis</h3>
              <p>Sube el master para medir 12 módulos de detección, loudness, estéreo y estructura.</p>
              <Link className="btn btn--primary btn--sm" to={`/scan?project=${project.id}`} style={{ marginTop: 8 }}>
                <ScanLine size={13} /> Escanear ahora
              </Link>
            </div>
          ) : (
            scanOnly.map((scan, i) => (
              <div className="scan-card" key={scan.id}>
                <div className="scan-card__top">
                  <div className="scan-card__index">{i + 1}</div>
                  <div className="scan-card__identity">
                    <div className="scan-card__chips">
                      <span className="chip chip--emerald">ESCÁNER</span>
                      <span className="chip">{scan.tier === "rapido" ? "RÁPIDO" : "PROFUNDO"}</span>
                      {project.isDemo && <span className="chip chip--gold">DEMO</span>}
                    </div>
                    <div className="scan-card__file">{scan.result.file.name}</div>
                    <div className="scan-card__date">{formatDateTime(scan.createdAt)}</div>
                  </div>
                  <div className="scan-card__result">
                    <span className={`scan-card__pct scan-card__pct--${scan.result.ai.zone}`}>
                      {scan.result.ai.probability.toFixed(0)}<small>%</small>
                    </span>
                    <span className="scan-card__ia">IA</span>
                    <span className={`chip chip--${scan.result.ai.zone === "optimo" || scan.result.ai.zone === "seguro" ? "emerald" : scan.result.ai.zone === "riesgo" ? "gold" : "danger"}`}>
                      {ZONE_LABEL[scan.result.ai.zone]}
                    </span>
                  </div>
                </div>

                <div className="scan-card__actions">
                  <Link className="btn btn--ghost btn--sm" to={`/report/${scan.id}`}>
                    <Download size={13} /> Descargar informe
                  </Link>
                  <button className="btn btn--soft btn--sm" onClick={() => navigate(`/forensic?scan=${scan.id}`)}>
                    <Sparkles size={13} /> Analizar forense
                  </button>
                  <button className="btn btn--ghost btn--sm" onClick={() => setExpandedScan(expandedScan === scan.id ? null : scan.id)}>
                    <FileText size={13} /> {expandedScan === scan.id ? "Ocultar detalle" : "Ver análisis"}
                  </button>
                  <AudioPlayer audioId={scan.audioId} name="Master original" duration={scan.result.file.duration} peaks={scan.result.waveform.peaks} compact note="DEMO" />
                  <button className="icon-action icon-action--danger" aria-label="Eliminar análisis" onClick={() => setRemoving(scan)}>
                    <Trash2 size={14} />
                  </button>
                </div>

                {expandedScan === scan.id && (
                  <div className="scan-card__expanded">
                    <ResultView result={scan.result} scan={scan} onForensic={() => navigate(`/forensic?scan=${scan.id}`)} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "forensic" && (
        <div className="stack-4">
          {forensicOnly.length === 0 ? (
            <div className="empty">
              <Sparkles size={24} />
              <h3>Sin diagnóstico forense</h3>
              <p>Compara el master con el estándar de tu género y detecta qué parámetros están fuera de rango.</p>
              <Link className="btn btn--primary btn--sm" to={`/forensic?scan=${latest?.id ?? ""}`} style={{ marginTop: 8 }}>
                <Sparkles size={13} /> Analizar forense
              </Link>
            </div>
          ) : (
            forensicOnly.map((scan) => (
              <div className="scan-card" key={scan.id}>
                <div className="scan-card__top">
                  <div className="scan-card__index scan-card__index--gold">F</div>
                  <div className="scan-card__identity">
                    <div className="scan-card__chips">
                      <span className="chip chip--gold">FORENSE</span>
                      <span className="chip">{scan.tier === "rapido" ? "TRACK COMPLETO" : "PROFUNDO"}</span>
                    </div>
                    <div className="scan-card__file">{scan.result.file.name}</div>
                    <div className="scan-card__date">{formatDateTime(scan.createdAt)}</div>
                  </div>
                  <div className="scan-card__result">
                    <span className={`scan-card__pct scan-card__pct--${scan.result.ai.zone}`}>
                      {scan.result.ai.probability.toFixed(0)}<small>%</small>
                    </span>
                    <span className="scan-card__ia">IA</span>
                  </div>
                </div>
                <div className="scan-card__actions">
                  <Link className="btn btn--ghost btn--sm" to={`/report/${scan.id}`}>
                    <Download size={13} /> Informe forense
                  </Link>
                  <button className="btn btn--ghost btn--sm" onClick={() => setExpandedScan(expandedScan === scan.id ? null : scan.id)}>
                    <FileText size={13} /> {expandedScan === scan.id ? "Ocultar" : "Ver diagnóstico"}
                  </button>
                  <AudioPlayer audioId={scan.audioId} name="Track analizado" duration={scan.result.file.duration} peaks={scan.result.waveform.peaks} compact note="DEMO" />
                  <button className="icon-action icon-action--danger" onClick={() => setRemoving(scan)} aria-label="Eliminar análisis">
                    <Trash2 size={14} />
                  </button>
                </div>
                {expandedScan === scan.id && (
                  <div className="scan-card__expanded">
                    <ForensicSummary result={scan.result} />
                    <ResultView result={scan.result} scan={scan} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "humanizer" && (
        <div className="stack-4">
          <div className="callout">
            <AudioWaveform size={18} />
            <div>
              <b>Humanizador local</b>
              <p>Procesa el master con wow & flutter, saturación de cinta, transitorios y aire. Genera un WAV 24-bit descargable.</p>
            </div>
            <Link className="btn btn--primary btn--sm" to={`/humanizer?project=${project.id}`}>
              Humanizar <ArrowRight size={13} />
            </Link>
          </div>
          {projectRenders.filter((r) => r.kind === "humanizer").length === 0 ? (
            <div className="empty">
              <AudioWaveform size={24} />
              <h3>Sin humanizaciones</h3>
              <p>Genera una versión humanizada y compárala contra el original con el mismo motor de análisis.</p>
            </div>
          ) : (
            projectRenders
              .filter((r) => r.kind === "humanizer")
              .map((r) => (
                <div className="render-card" key={r.id}>
                  <div className="render-card__head">
                    <div>
                      <div className="render-card__title">{r.label}</div>
                      <div className="render-card__date">{formatDateTime(r.createdAt)} · WAV 24-bit · {(r.sampleRate / 1000).toFixed(1)} kHz</div>
                    </div>
                    <div className="row-flex">
                      {r.before && <span className="chip">ANTES {r.before.ai.probability.toFixed(1)}%</span>}
                      {r.after && <span className={`chip chip--${r.after.ai.probability < r.before!.ai.probability ? "emerald" : "gold"}`}>DESPUÉS {r.after.ai.probability.toFixed(1)}%</span>}
                      <button className="btn btn--ghost btn--sm" onClick={() => downloadSavedAudio(r.audioId, `${r.label}.wav`).then((ok) => toast(ok ? "WAV descargado." : "No se encontró el audio.", ok ? "ok" : "err"))}>
                        <Download size={13} /> WAV
                      </button>
                    </div>
                  </div>
                  <AudioPlayer audioId={r.audioId} name={r.label} duration={r.duration} note="WAV 24-BIT" />
                </div>
              ))
          )}
        </div>
      )}

      {tab === "shield" && (
        <div className="stack-4">
          <div className="callout callout--gold">
            <ShieldCheck size={18} />
            <div>
              <b>Escudo Protector</b>
              <p>Un sello local de existencia: SHA-256 del archivo + fecha. Sirve como prueba técnica interna; no es un ancla en Bitcoin.</p>
            </div>
            <Link className="btn btn--gold btn--sm" to={`/shield?project=${project.id}`}>
              Certificar track <ArrowRight size={13} />
            </Link>
          </div>
          {projectCerts.length === 0 ? (
            <div className="empty">
              <Fingerprint size={24} />
              <h3>Sin certificados</h3>
              <p>Certifica el master para dejar una huella verificable con fecha.</p>
            </div>
          ) : (
            projectCerts.map((c) => (
              <div className="cert-row" key={c.id}>
                <div className="cert-row__icon"><ShieldCheck size={18} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cert-row__title">{c.trackName}</div>
                  <div className="cert-row__hash mono">{shortHash(c.hash, 18, 10)}</div>
                  <div className="cert-row__meta">SHA-256 · {formatDateTime(c.createdAt)} · {c.network}</div>
                </div>
                <button className="icon-action" title="Copiar hash" onClick={() => copyText(c.hash).then((ok) => toast(ok ? "Hash copiado." : "No se pudo copiar.", ok ? "ok" : "err"))}>
                  <Copy size={14} />
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() =>
                    downloadText(
                      JSON.stringify({ urbina: "certificado local", ...c, disclaimer: "Sello local de existencia. No es una transacción Bitcoin." }, null, 2),
                      `certificado-${c.trackName}.json`,
                      "application/json",
                    )
                  }
                >
                  <Download size={13} /> JSON
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {(tab === "mixing" || tab === "mastering") && (
        <div className="locked-panel">
          <div className="locked-panel__icon">
            {tab === "mixing" ? <SlidersHorizontal size={26} /> : <AudioWaveform size={26} />}
          </div>
          <div className="chip chip--gold">{tab === "mixing" ? "MIXING IA" : "MASTERING IA"} · PRÓXIMAMENTE</div>
          <h2>{tab === "mixing" ? "Mezcla asistida por IA" : "Mastering adaptativo"}</h2>
          <p>
            Esta función está en desarrollo. No simulamos resultados que no podemos
            calcular: preferimos dejarlo bloqueado antes que inventar una mezcla.
          </p>
          <Link className="btn btn--gold btn--sm" to="/billing">
            <Lock size={13} /> Ver planes Pro
          </Link>
        </div>
      )}

      <Modal
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        eyebrow="ELIMINAR ANÁLISIS"
        title="¿Borrar este análisis?"
        footer={
          <div className="row-flex" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn--ghost" onClick={() => setRemoving(null)}>Cancelar</button>
            <button
              className="btn btn--danger"
              onClick={async () => {
                if (!removing) return;
                await deleteScan(removing.id);
                toast("Análisis eliminado.", "ok");
                setRemoving(null);
              }}
            >
              <Trash2 size={14} /> Eliminar
            </button>
          </div>
        }
      >
        <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.65 }}>
          Se borrará el informe y el audio guardado de este análisis. El proyecto y el resto de análisis se
          conservan.
        </p>
      </Modal>
    </div>
  );
}

function ForensicSummary({ result }: { result: import("../lib/audio/analyzer").AnalysisResult }) {
  const axes = [
    { label: "Loudness", value: Math.max(0, 100 - Math.abs(result.loudness.lufs + 11.5) * 12) },
    { label: "Dinámica", value: Math.max(0, 100 - Math.abs(result.loudness.lra - 7.5) * 9) },
    { label: "Estéreo", value: Math.max(0, 100 - Math.abs(result.stereo.width - 0.4) * 160) },
    { label: "Tono", value: Math.max(0, 100 - Math.abs(result.tonal.centroid - 2200) / 22) },
    { label: "Ritmo", value: result.rhythm.bpmConfidence },
    { label: "Aire", value: Math.max(0, Math.min(100, (result.tonal.hfCutoff / 20000) * 100)) },
  ];
  return (
    <div className="report-grid" style={{ marginBottom: 18 }}>
      <div className="chart-card">
        <div className="chart-head">
          <span className="chart-title">Ajuste al estándar</span>
          <span className="chart-note">6 EJES</span>
        </div>
        <RadarChart axes={axes} size={300} />
      </div>
      <div className="chart-card">
        <div className="chart-head">
          <span className="chart-title">Lectura rápida</span>
          <span className="chart-note">FORENSE</span>
        </div>
        <div className="statlines">
          <div><span>Loudness</span><b>{result.loudness.lufs.toFixed(1)} LUFS</b></div>
          <div><span>Rango</span><b>{result.loudness.lra.toFixed(1)} LU</b></div>
          <div><span>Crest</span><b>{result.loudness.crest.toFixed(1)} dB</b></div>
          <div><span>Estéreo</span><b>{result.stereo.isMono ? "MONO" : result.stereo.correlation.toFixed(2)}</b></div>
          <div><span>BPM</span><b>{result.rhythm.bpm.toFixed(1)}</b></div>
          <div><span>Corte HF</span><b>{Math.round(result.tonal.hfCutoff)} Hz</b></div>
        </div>
        <div className="divider" />
        <p className="chart-note" style={{ lineHeight: 1.7, letterSpacing: 0 }}>
          El radar normaliza cada eje contra rangos de streaming. Un valor bajo señala desviación, no una nota
          artística.
        </p>
      </div>
    </div>
  );
}
