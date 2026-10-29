import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Crown,
  FolderPlus,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useStudio } from "../lib/storage/store";
import { formatDate, formatDateTime } from "../lib/utils";
import { Modal } from "../components/Modal";
import { ProbabilityPill } from "../components/ResultView";
import type { Project } from "../lib/storage/types";

export function ProjectsPage() {
  const { prefs, projects, scans, renders, certs, createProject, renameProject, deleteProject, toast } = useStudio();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"todos" | "analizados" | "sin" | "demo">("todos");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [removing, setRemoving] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [artist, setArtist] = useState(prefs.artistName);

  const enriched = useMemo(
    () =>
      projects
        .map((p) => {
          const ps = scans.filter((s) => s.projectId === p.id).sort((a, b) => b.createdAt - a.createdAt);
          const probs = ps.map((s) => s.result.ai.probability);
          return {
            project: p,
            scans: ps,
            best: probs.length ? Math.min(...probs) : null,
            last: ps[0]?.createdAt ?? p.createdAt,
            renders: renders.filter((r) => r.projectId === p.id).length,
            certs: certs.filter((c) => c.projectId === p.id).length,
          };
        })
        .sort((a, b) => b.last - a.last),
    [projects, scans, renders, certs],
  );

  const list = enriched.filter(({ project, scans: ps }) => {
    const q = query.trim().toLowerCase();
    const matches =
      !q ||
      project.trackName.toLowerCase().includes(q) ||
      project.artistName.toLowerCase().includes(q) ||
      ps.some((s) => s.result.file.name.toLowerCase().includes(q));
    if (!matches) return false;
    if (filter === "analizados") return ps.length > 0;
    if (filter === "sin") return ps.length === 0;
    if (filter === "demo") return Boolean(project.isDemo);
    return true;
  });

  const submitCreate = async () => {
    if (!name.trim()) {
      toast("Ponle un nombre al proyecto.", "err");
      return;
    }
    const project = await createProject(name, artist);
    setCreateOpen(false);
    setName("");
    toast(`Proyecto “${project.trackName}” creado. Sube un track para analizarlo.`, "ok");
    navigate(`/projects/${project.id}`);
  };

  const submitRename = async () => {
    if (!editing) return;
    await renameProject(editing.id, name);
    setEditing(null);
    toast("Proyecto actualizado.", "ok");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Mis Proyectos Musicales</h1>
          <p className="page-head__sub">Cada proyecto reúne tu track y todo lo que hiciste con él.</p>
        </div>
        <div className="page-head__actions">
          <button className="btn btn--primary" onClick={() => { setName(""); setArtist(prefs.artistName); setCreateOpen(true); }}>
            <Plus size={15} /> Nuevo proyecto
          </button>
        </div>
      </div>

      {prefs.plan === "free" && (
        <div className="pro-banner" style={{ marginBottom: 20 }}>
          <div className="pro-banner__icon">
            <Crown size={20} />
          </div>
          <div className="pro-banner__body">
            <div className="pro-banner__title">Desbloquea todo el poder de URBINA Studio</div>
            <p className="pro-banner__text">
              Pásate a Pro y accede a las herramientas premium, el análisis por stems y créditos que se renuevan con
              cada ciclo de tu plan.
            </p>
          </div>
          <Link className="btn btn--gold" to="/billing">
            Ver planes Pro
          </Link>
        </div>
      )}

      <div className="projects-toolbar">
        <div className="search" style={{ flex: 1, minWidth: 220 }}>
          <Search size={15} />
          <input
            className="input"
            placeholder="Buscar proyecto por nombre, artista o archivo…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar proyecto"
          />
        </div>
        <div className="tabs">
          {(
            [
              ["todos", "Todos", projects.length],
              ["analizados", "Con análisis", enriched.filter((e) => e.scans.length).length],
              ["sin", "Sin análisis", enriched.filter((e) => !e.scans.length).length],
              ["demo", "Demo", enriched.filter((e) => e.project.isDemo).length],
            ] as [typeof filter, string, number][]
          ).map(([id, label, count]) => (
            <button key={id} className={`tab ${filter === id ? "tab--active" : ""}`} onClick={() => setFilter(id)}>
              {label} <span className="tab__count">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="empty" style={{ marginTop: 18 }}>
          <FolderPlus size={26} />
          <h3>{query ? "No hay coincidencias" : "Tu estudio está vacío"}</h3>
          <p>
            {query
              ? "Prueba con otro nombre o cambia el filtro."
              : "Crea un proyecto o analiza un track: el proyecto se genera automáticamente con el nombre del archivo."}
          </p>
          <div className="row-flex" style={{ marginTop: 8 }}>
            <button className="btn btn--primary btn--sm" onClick={() => setCreateOpen(true)}>
              <Plus size={13} /> Crear proyecto
            </button>
            <Link className="btn btn--ghost btn--sm" to="/scan">
              Analizar un track
            </Link>
          </div>
        </div>
      ) : (
        <div className="stack-3" style={{ marginTop: 18 }}>
          {list.map(({ project, scans: ps, best, last, renders: rcount, certs: ccount }) => (
            <div key={project.id} className="project-row">
              <span className="project-row__accent" style={{ background: `linear-gradient(${project.accent}, transparent)` }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link to={`/projects/${project.id}`} className="project-row__name">
                  {project.trackName}
                  {project.isDemo && <span className="chip chip--gold" style={{ marginLeft: 10, verticalAlign: "middle" }}>DEMO</span>}
                </Link>
                <div className="project-row__artist">{project.artistName}</div>
                <div className="project-row__meta">
                  {ps.length} {ps.length === 1 ? "análisis" : "análisis"} · {rcount} humanización{rcount === 1 ? "" : "es"} · {ccount} sello{ccount === 1 ? "" : "s"}
                </div>
              </div>

              <div className="project-row__stats">
                <div className="project-stat">
                  <div className="project-stat__v">{ps.length}</div>
                  <div className="project-stat__k">Escaneos</div>
                </div>
                <div className="project-stat">
                  <div className="project-stat__v">
                    {best === null ? "—" : <ProbabilityPill probability={best} />}
                  </div>
                  <div className="project-stat__k">Mejor resultado</div>
                </div>
                <div className="project-stat project-stat--date">
                  <div className="project-stat__v" style={{ fontSize: 12 }}>{formatDate(last)}</div>
                  <div className="project-stat__k">Último</div>
                </div>
              </div>

              <div className="project-row__actions">
                <Link to={`/projects/${project.id}`} className="icon-action" title="Abrir proyecto" aria-label={`Abrir ${project.trackName}`}>
                  <ArrowUpRight size={15} />
                </Link>
                <button
                  className="icon-action"
                  title="Renombrar"
                  aria-label="Renombrar proyecto"
                  onClick={() => {
                    setEditing(project);
                    setName(project.trackName);
                  }}
                >
                  <Pencil size={14} />
                </button>
                <button className="icon-action icon-action--danger" title="Eliminar" aria-label="Eliminar proyecto" onClick={() => setRemoving(project)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="projects-footer">
        <Sparkles size={14} />
        <span>{summarizeCount(enriched)}</span>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        eyebrow="MIS PROYECTOS"
        title="Nuevo proyecto"
        footer={
          <div className="row-flex" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn--ghost" onClick={() => setCreateOpen(false)}>Cancelar</button>
            <button className="btn btn--primary" onClick={submitCreate}>
              Crear proyecto <ArrowRight size={14} />
            </button>
          </div>
        }
      >
        <div className="stack-4">
          <div className="field">
            <label className="label" htmlFor="np-name">Nombre del track</label>
            <input id="np-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Neon Dusk" autoFocus />
          </div>
          <div className="field">
            <label className="label" htmlFor="np-artist">Artista</label>
            <input id="np-artist" className="input" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Tu nombre artístico" />
          </div>
          <p className="chart-note" style={{ lineHeight: 1.7, letterSpacing: 0 }}>
            El proyecto se crea vacío. Después podrás escanear, analizar y certificar el mismo track desde su ficha.
          </p>
        </div>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        eyebrow="RENOMBRAR"
        title="Editar proyecto"
        footer={
          <div className="row-flex" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn--ghost" onClick={() => setEditing(null)}>Cancelar</button>
            <button className="btn btn--primary" onClick={submitRename}>Guardar</button>
          </div>
        }
      >
        <div className="field">
          <label className="label" htmlFor="rp-name">Nombre del track</label>
          <input id="rp-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
      </Modal>

      <Modal
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        eyebrow="ELIMINAR"
        title="¿Eliminar este proyecto?"
        footer={
          <div className="row-flex" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn--ghost" onClick={() => setRemoving(null)}>Cancelar</button>
            <button
              className="btn btn--danger"
              onClick={async () => {
                if (!removing) return;
                await deleteProject(removing.id);
                toast(`Proyecto “${removing.trackName}” eliminado.`, "ok");
                setRemoving(null);
              }}
            >
              <Trash2 size={14} /> Eliminar definitivamente
            </button>
          </div>
        }
      >
        <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.65 }}>
          Se borrarán el proyecto, sus análisis, los audios guardados y los sellos asociados. Esta acción no se puede
          deshacer.
          {removing?.isDemo && " Es el proyecto de ejemplo que viene con la aplicación."}
        </p>
      </Modal>
    </div>
  );
}

function summarizeCount(items: { scans: unknown[] }[]): string {
  const total = items.reduce((a, b) => a + b.scans.length, 0);
  return `${items.length} proyecto${items.length === 1 ? "" : "s"} · ${total} análisis · ordenados por actividad (${formatDateTime(Date.now())})`;
}
