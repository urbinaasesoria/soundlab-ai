import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Menu, Moon, ScanLine, Sun } from "lucide-react";
import { useStudio } from "../lib/storage/store";
import { formatDateTime } from "../lib/utils";
import { zoneFromProbability } from "../lib/audio/analyzer";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { prefs, scans, projects, toggleTheme, toast } = useStudio();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const sorted = scans.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  const projectName = (id: string) => projects.find((p) => p.id === id)?.trackName ?? "Proyecto";

  return (
    <header className="topbar">
      <button className="icon-btn menu-toggle" onClick={onMenu} aria-label="Abrir menú">
        <Menu size={18} />
      </button>

      <div className="topbar__actions">
        <span className="local-chip" title="100 % local: tu audio nunca sale del navegador">
          <span className="local-chip__dot" /> LOCAL · PRIVADO
        </span>

        <div className="dropdown-wrap" ref={ref}>
          <button
            className="icon-btn"
            aria-label="Notificaciones"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <Bell size={17} />
            {sorted.length > 0 && <span className="icon-btn__dot" />}
          </button>
          {open && (
            <div className="dropdown" role="menu">
              <div className="dropdown__head">
                <span>Notificaciones</span>
                <span className="mono">{sorted.length}</span>
              </div>
              {sorted.length === 0 ? (
                <div className="dropdown__empty">Aún no hay actividad. Escanea tu primer track.</div>
              ) : (
                sorted.map((s) => {
                  const zone = zoneFromProbability(s.result.ai.probability);
                  return (
                    <Link
                      key={s.id}
                      to={`/projects/${s.projectId}`}
                      className="dropdown__item"
                      role="menuitem"
                      onClick={() => setOpen(false)}
                    >
                      <span className={`dropdown__icon dropdown__icon--${zone}`}>
                        <ScanLine size={14} />
                      </span>
                      <span className="dropdown__body">
                        <span className="dropdown__title">{projectName(s.projectId)}</span>
                        <span className="dropdown__meta">
                          Análisis {s.source === "forensic" ? "forense" : "de IA"} · {formatDateTime(s.createdAt)}
                        </span>
                      </span>
                      <span className={`dropdown__score dropdown__score--${zone}`}>
                        {s.result.ai.probability.toFixed(1)}%
                      </span>
                    </Link>
                  );
                })
              )}
              <div className="dropdown__foot">
                <Link to="/projects" onClick={() => setOpen(false)}>
                  Ver todos los proyectos
                </Link>
                <button onClick={() => { setOpen(false); toast("Notificaciones marcadas como leídas.", "ok"); }}>
                  Marcar leídas
                </button>
              </div>
            </div>
          )}
        </div>

        <button className="icon-btn" onClick={toggleTheme} aria-label={prefs.theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"} title="Tema claro / oscuro">
          {prefs.theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  );
}
