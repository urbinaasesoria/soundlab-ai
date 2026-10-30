import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  AudioWaveform,
  Crown,
  FolderOpen,
  Plus,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Coins,
  Activity,
  ChevronRight,
} from "lucide-react";
import { useStudio } from "../lib/storage/store";
import { formatDate, formatNumber, formatTime } from "../lib/utils";
import { zoneFromProbability, ZONE_LABEL } from "../lib/audio/analyzer";
import { resultHeadline } from "../components/ResultView";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

const ZONE_CLASS: Record<string, string> = { optimo: "ok", seguro: "ok", riesgo: "warn", peligro: "bad" };

export function HomePage() {
  const { prefs, projects, scans, renders, certs } = useStudio();
  const sorted = scans.slice().sort((a, b) => b.createdAt - a.createdAt);
  const latest = sorted[0];
  const latestProject = projects.find((p) => p.id === latest?.projectId);
  const recent = sorted.slice(0, 4);
  const projectName = (id: string) => projects.find((p) => p.id === id)?.trackName ?? "Proyecto";
  const creditsMax = prefs.plan === "pro" ? 1_000_000 : 2950;
  const creditsPct = Math.min(100, (prefs.credits / creditsMax) * 100);

  return (
    <div className="page home">
      <div className="page-head home-greeting">
        <div>
          <h1>
            {greeting()}, <strong>{prefs.artistName}</strong>
          </h1>
          <p className="page-head__sub">Este es el resumen de tu estudio.</p>
        </div>
        <div className="page-head__actions">
          <Link className="btn btn--primary" to="/scan">
            <Plus size={15} /> Nuevo análisis
          </Link>
        </div>
      </div>

      {prefs.plan === "free" ? (
        <div className="pro-banner">
          <div className="pro-banner__icon">
            <Crown size={22} />
          </div>
          <div className="pro-banner__body">
            <div className="pro-banner__title">Desbloquea todo el poder de SoundLab AI</div>
            <p className="pro-banner__text">
              Pásate a Pro y accede a las herramientas premium, el análisis por stems y créditos que se renuevan con
              cada ciclo de tu plan.
            </p>
          </div>
          <Link className="btn btn--gold" to="/billing">
            Ver planes Pro <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="pro-banner">
          <div className="pro-banner__icon">
            <Crown size={22} />
          </div>
          <div className="pro-banner__body">
            <div className="pro-banner__title">Plan Pro activo</div>
            <p className="pro-banner__text">Créditos anuales, herramientas premium y retención extendida de proyectos.</p>
          </div>
          <Link className="btn btn--ghost" to="/billing">
            Gestionar plan
          </Link>
        </div>
      )}

      <div className="home-grid">
        <div className="card stat-card stat-card--credits">
          <div className="stat-card__top">
            <span className="card__label">Créditos disponibles</span>
            <span className={`chip ${prefs.plan === "pro" ? "chip--gold" : ""}`}>{prefs.plan === "pro" ? "PRO" : "FREE"}</span>
          </div>
          <div className="stat-card__big">{formatNumber(prefs.credits)}</div>
          <div className="credit-bar">
            <span style={{ width: `${creditsPct}%` }} />
          </div>
          <p className="stat-card__hint">
            {prefs.plan === "pro"
              ? "Se renuevan con tu ciclo anual. Cada análisis descuenta créditos de tu saldo."
              : "Créditos de bienvenida. Se gastan al analizar, humanizar o certificar; puedes comprar más cuando quieras."}
          </p>
          <div className="stat-card__foot">
            <Link to="/billing" className="link link--mono">
              Comprar créditos <ArrowUpRight size={12} />
            </Link>
            <span className="mute">·</span>
            <span className="mute">{formatNumber(creditsMax)} máx.</span>
          </div>
        </div>

        <Link to="/projects" className="card card--hover stat-card">
          <div className="stat-card__top">
            <span className="card__label">Mis proyectos</span>
            <FolderOpen size={16} className="mute" />
          </div>
          <div className="stat-card__big">{projects.length}</div>
          <p className="stat-card__hint">
            {latestProject ? (
              <>
                Último: <b style={{ color: "var(--text)" }}>{latestProject.trackName}</b>
              </>
            ) : (
              "Crea tu primer proyecto subiendo un track."
            )}
          </p>
          <div className="stat-card__foot">
            <span className="link link--mono">Ir a mis proyectos</span>
            <ArrowRight size={12} />
          </div>
        </Link>

        <Link to="/scan" className="card card--hover stat-card">
          <div className="stat-card__top">
            <span className="card__label">Escaneos</span>
            <ScanLine size={16} className="mute" />
          </div>
          <div className="stat-card__big">{scans.length}</div>
          <p className="stat-card__hint">
            {latest ? (
              <>
                Último resultado: <b style={{ color: `var(--${latest.result.ai.zone === "optimo" ? "emerald" : latest.result.ai.zone === "riesgo" ? "gold" : latest.result.ai.zone === "peligro" ? "danger" : "emerald"})` }}>{latest.result.ai.probability.toFixed(0)}% IA</b>
                {latest.result.isDemo && (
                  <>
                    {" "}
                    <span className="chip chip--gold" style={{ fontSize: 9, padding: "1px 6px" }}>
                      DEMO · SIN AUDIO
                    </span>
                  </>
                )}
                <br />
                {resultHeadline(zoneFromProbability(latest.result.ai.probability))}
              </>
            ) : (
              "Aún no has analizado ningún track."
            )}
          </p>
          <div className="stat-card__foot">
            <span className="link link--mono">Escanear ahora</span>
            <ArrowRight size={12} />
          </div>
        </Link>

        <Link to="/humanizer" className="card card--hover stat-card">
          <div className="stat-card__top">
            <span className="card__label">Detecciones</span>
            <AudioWaveform size={16} className="mute" />
          </div>
          <div className="stat-card__big">{renders.filter((r) => r.kind === "humanizer").length}</div>
          <p className="stat-card__hint">Procesado local con wow & flutter, cinta y aire real.</p>
          <div className="stat-card__foot">
            <span className="link link--mono">Abrir detector</span>
            <ArrowRight size={12} />
          </div>
        </Link>

        <Link to="/shield" className="card card--hover stat-card">
          <div className="stat-card__top">
            <span className="card__label">Certificados</span>
            <ShieldCheck size={16} className="mute" />
          </div>
          <div className="stat-card__big">{certs.length}</div>
          <p className="stat-card__hint">Sellos de existencia SHA-256 con fecha y huella del master.</p>
          <div className="stat-card__foot">
            <span className="link link--mono">Ver certificados</span>
            <ArrowRight size={12} />
          </div>
        </Link>
      </div>

      <div className="quick-actions">
        <Link to="/scan" className="btn btn--primary btn--lg">
          <ScanLine size={16} /> Escanear un track
        </Link>
        <Link to="/billing" className="btn btn--gold">
          <Coins size={15} /> Comprar créditos
        </Link>
        <Link to="/suno" className="btn btn--ghost">
          <Sparkles size={15} /> Prompts Suno
        </Link>
        <Link to="/forensic" className="btn btn--ghost">
          <Activity size={15} /> Análisis forense
        </Link>
      </div>

      <div className="section-title">
        <h2>Últimos escaneos</h2>
        <Link to="/projects" className="link link--mono">
          Ver todos <ArrowUpRight size={12} />
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="empty">
          <div className="dropzone__icon" style={{ width: 54, height: 54 }}>
            <ScanLine size={22} />
          </div>
          <h3>Todavía no hay escaneos</h3>
          <p>Sube tu primer master y el motor local medirá 12 módulos de detección, loudness, estéreo y espectro.</p>
          <Link className="btn btn--primary btn--sm" to="/scan" style={{ marginTop: 8 }}>
            <Plus size={13} /> Escanear un track
          </Link>
        </div>
      ) : (
        <div className="stack-2">
          {recent.map((s) => {
            const zone = s.result.ai.zone;
            return (
              <Link to={`/projects/${s.projectId}`} key={s.id} className="scan-row">
                <div className="scan-row__date">
                  {formatDate(s.createdAt, { day: "2-digit", month: "short", year: "numeric" })}
                  <br />
                  <span style={{ opacity: 0.7 }}>{formatTime(s.createdAt)}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="scan-row__name">{projectName(s.projectId)}</div>
                  <div className="scan-row__sub">
                    {s.result.file.name} · {s.source === "forensic" ? "FORENSE" : s.tier === "rapido" ? "ESCÁNER RÁPIDO" : "ESCÁNER PROFUNDO"}
                  </div>
                </div>
                <span className={`chip chip--${zone === "optimo" || zone === "seguro" ? "emerald" : zone === "riesgo" ? "gold" : "danger"}`}>
                  {ZONE_LABEL[zone]}
                </span>
                <div className={`scan-row__score scan-row__score--${ZONE_CLASS[zone]}`}>
                  {s.result.ai.probability.toFixed(0)}
                  <small>%</small>
                </div>
                <ChevronRight size={16} className="mute" />
              </Link>
            );
          })}
        </div>
      )}

      <div className="section-title">
        <h2>Herramientas</h2>
        <span className="chart-note">TODO SE PROCESA EN TU NAVEGADOR</span>
      </div>
      <div className="grid-4">
        <Link to="/scan" className="tool-card">
          <ScanLine size={18} />
          <span className="tool-card__name">Escáner de IA</span>
          <span className="tool-card__text">12 módulos de detección explicable.</span>
        </Link>
        <Link to="/forensic" className="tool-card">
          <Activity size={18} />
          <span className="tool-card__name">Análisis forense</span>
          <span className="tool-card__text">Compara tu master con el estándar del género.</span>
        </Link>
        <Link to="/humanizer" className="tool-card">
          <AudioWaveform size={18} />
          <span className="tool-card__name">Detector de textura</span>
          <span className="tool-card__text">Qué tan generado suena y qué cambiar en SUNO.</span>
        </Link>
        <Link to="/coverizador" className="tool-card">
          <Sparkles size={18} />
          <span className="tool-card__name">Coverizador</span>
          <span className="tool-card__text">Tres reinterpretaciones de tu track.</span>
        </Link>
      </div>
    </div>
  );
}
