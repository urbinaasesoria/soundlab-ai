import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Copy,
  Heart,
  Music2,
  Search,
  Sparkles,
  Star,
  Tags,
  Users,
} from "lucide-react";
import {
  buildSunoPrompt,
  INSTRUMENTS,
  MOODS,
  SUNO_GENRES,
  SUNO_GROUPS,
  SUNO_TIPS,
  type SunoGenre,
} from "../lib/data/suno";
import { useStudio } from "../lib/storage/store";
import { copyText } from "../lib/utils";

type SunoTab = "data" | "tags" | "artists" | "prompts";

const FAV_KEY = "urbina.suno.favorites.v1";

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function SunoPage() {
  const { toast } = useStudio();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string>("pop");
  const [selectedId, setSelectedId] = useState(SUNO_GENRES[0].id);
  const [tab, setTab] = useState<SunoTab>("data");
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [mood, setMood] = useState(MOODS[3]);
  const [instrument, setInstrument] = useState(INSTRUMENTS[2]);
  const [bpm, setBpm] = useState("110");
  const [vocals, setVocals] = useState("female vocals");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
    } catch {
      /* almacenamiento bloqueado */
    }
  }, [favorites]);

  const searching = query.trim().length > 0;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SUNO_GENRES.filter((g) => {
      if (onlyFavorites && !favorites.includes(g.id)) return false;
      if (!searching && group !== "all" && g.group !== group) return false;
      if (!q) return true;
      return (
        g.name.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.group.toLowerCase().includes(q) ||
        g.tags.some((t) => t.toLowerCase().includes(q)) ||
        g.artists.some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [query, group, onlyFavorites, favorites, searching]);

  const selected: SunoGenre =
    filtered.find((g) => g.id === selectedId) ?? filtered[0] ?? SUNO_GENRES.find((g) => g.id === selectedId) ?? SUNO_GENRES[0];

  const promptCount = SUNO_GENRES.reduce((acc, g) => acc + g.prompts.length, 0);
  const groupLabel = SUNO_GROUPS.find((g) => g.id === selected.group)?.label ?? selected.group;
  const favorite = favorites.includes(selected.id);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      toast(prev.includes(id) ? "Género quitado de favoritos." : "Género guardado en favoritos.", "ok");
      return next;
    });
  };

  const copy = async (text: string, label: string) => {
    const ok = await copyText(text);
    toast(ok ? `${label} copiado al portapapeles.` : "No se pudo copiar. Selecciona el texto manualmente.", ok ? "ok" : "err");
  };

  const customPrompt = buildSunoPrompt({
    genre: selected.name,
    mood,
    instrument,
    bpm: bpm.trim() || "110",
    vocals: vocals.trim(),
  });

  return (
    <div className="page suno">
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>CATÁLOGO CURADO · SINCRONIZADO LOCAL</div>
          <h1>Prompts Suno</h1>
          <p className="page-head__sub">
            Explora la taxonomía de géneros y copia prompts listos para Suno. Sin cuentas, sin claves y sin enviar nada
            a un servidor.
          </p>
        </div>
        <div className="page-head__actions">
          <button className={`btn ${onlyFavorites ? "btn--gold" : "btn--ghost"}`} onClick={() => setOnlyFavorites((v) => !v)}>
            <Star size={15} /> Favoritos <span className="mono">{favorites.length}</span>
          </button>
        </div>
      </div>

      <div className="suno-stats">
        <div className="suno-stat">
          <div className="suno-stat__v">{SUNO_GROUPS.length}</div>
          <div className="suno-stat__k">Grupos</div>
        </div>
        <div className="suno-stat">
          <div className="suno-stat__v">{SUNO_GENRES.length}</div>
          <div className="suno-stat__k">Géneros</div>
        </div>
        <div className="suno-stat">
          <div className="suno-stat__v">{promptCount}</div>
          <div className="suno-stat__k">Prompts</div>
        </div>
        <div className="suno-stat">
          <div className="suno-stat__v">{favorites.length}</div>
          <div className="suno-stat__k">Favoritos</div>
        </div>
        <div className="suno-stats__note">
          Catálogo curado propio. Priorizamos fichas con datos
          verificables y prompts útiles.
        </div>
      </div>

      <div className="suno-search-row">
        <div className="search" style={{ flex: 1, minWidth: 240 }}>
          <Search size={15} />
          <input
            className="input"
            placeholder="Buscar género, etiqueta o artista de referencia…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar género"
          />
        </div>
        <div className="row-flex">
          <span className="chip">{filtered.length} RESULTADOS</span>
          {searching && (
            <button className="link link--mono" onClick={() => setQuery("")}>
              Limpiar búsqueda
            </button>
          )}
        </div>
      </div>

      <div className="group-pills" aria-label="Filtrar por grupo">
        <button className={`pill ${group === "all" && !searching ? "pill--active" : ""}`} onClick={() => { setGroup("all"); setOnlyFavorites(false); }}>
          <Sparkles size={12} /> TODOS
        </button>
        {SUNO_GROUPS.map((g) => (
          <button
            key={g.id}
            className={`pill ${group === g.id && !searching ? "pill--active" : ""}`}
            onClick={() => { setGroup(g.id); setQuery(""); setOnlyFavorites(false); }}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="suno-layout">
        <aside className="suno-list chart-card">
          <div className="chart-head">
            <span className="chart-title">{onlyFavorites ? "Favoritos" : searching ? "Búsqueda" : groupLabel}</span>
            <span className="chart-note">{filtered.length}</span>
          </div>
          {filtered.length === 0 ? (
            <div className="suno-empty">
              <Music2 size={20} />
              <b>Sin coincidencias</b>
              <p>Prueba con otra etiqueta, artista o grupo.</p>
              <button className="btn btn--ghost btn--sm" onClick={() => { setQuery(""); setOnlyFavorites(false); setGroup("all"); }}>
                Ver todo el catálogo
              </button>
            </div>
          ) : (
            <div className="genre-list">
              {filtered.map((g) => (
                <button
                  key={g.id}
                  className={`genre-list__item ${g.id === selected.id ? "is-active" : ""}`}
                  onClick={() => { setSelectedId(g.id); setTab("data"); }}
                >
                  <span className="genre-list__dot" />
                  <span className="genre-list__body">
                    <span className="genre-list__name">{g.name}</span>
                    <span className="genre-list__meta">{g.bpm}</span>
                  </span>
                  {favorites.includes(g.id) && <Heart size={12} fill="currentColor" />}
                  <ChevronRight size={14} className="genre-list__chev" />
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="suno-detail">
          <div className="suno-hero chart-card">
            <div className="suno-hero__top">
              <div>
                <div className="eyebrow">{groupLabel} · {selected.origin}</div>
                <h2>{selected.name}</h2>
              </div>
              <div className="row-flex">
                <button className={`icon-action ${favorite ? "is-fav" : ""}`} aria-label={favorite ? "Quitar de favoritos" : "Guardar en favoritos"} onClick={() => toggleFavorite(selected.id)}>
                  <Heart size={15} fill={favorite ? "currentColor" : "none"} />
                </button>
                <button className="btn btn--primary btn--sm" onClick={() => copy(selected.prompts[0], "Prompt principal")}>
                  <Copy size={13} /> Copiar primer prompt
                </button>
              </div>
            </div>
            <p className="suno-hero__desc">{selected.description}</p>
            <div className="suno-hero__tags">
              {selected.tags.map((t) => (
                <span className="chip" key={t}>{t}</span>
              ))}
            </div>
            <div className="suno-hero__foot mono">
              <span>{selected.birth}</span>
              <span>·</span>
              <span>{selected.bpm}</span>
              <span>·</span>
              <span>{selected.prompts.length} PROMPTS</span>
              <span>·</span>
              <span>{selected.artists.length} REFERENCIAS</span>
            </div>
          </div>

          <div className="tabs suno-tabs" role="tablist" aria-label="Detalle del género">
            {(
              [
                ["data", "Historia & Datos", null],
                ["tags", "Etiquetas Suno", null],
                ["artists", "Representantes", null],
                ["prompts", "Prompts", String(selected.prompts.length)],
              ] as [SunoTab, string, string | null][]
            ).map(([id, label, count]) => (
              <button key={id} role="tab" aria-selected={tab === id} className={`tab ${tab === id ? "tab--active" : ""}`} onClick={() => setTab(id)}>
                {label}
                {count && <span className="tab__count">{count}</span>}
              </button>
            ))}
          </div>

          {tab === "data" && (
            <div className="suno-panel chart-card">
              <div className="suno-data-grid">
                <div className="suno-data">
                  <span className="suno-data__k">ORIGEN</span>
                  <span className="suno-data__v">{selected.origin}</span>
                </div>
                <div className="suno-data">
                  <span className="suno-data__k">NACIMIENTO</span>
                  <span className="suno-data__v">{selected.birth}</span>
                </div>
                <div className="suno-data">
                  <span className="suno-data__k">MOMENTO DE AUGE</span>
                  <span className="suno-data__v">{selected.peak}</span>
                </div>
                <div className="suno-data">
                  <span className="suno-data__k">BPM TÍPICO</span>
                  <span className="suno-data__v">{selected.bpm}</span>
                </div>
              </div>
              <div className="divider" />
              <div className="suno-notes">
                <div className="suno-notes__icon"><Tags size={16} /></div>
                <div>
                  <div className="chart-title">Cómo lo entiende Suno</div>
                  <p>
                    Empieza el prompt con «{selected.name.toLowerCase()}», añade el mood y describe la mezcla. Las
                    etiquetas de esta ficha son las que mejor funcionan en modelos de música por texto: género,
                    instrumentación, textura y carácter vocal.
                  </p>
                  <div className="row-flex" style={{ marginTop: 10 }}>
                    {selected.tags.slice(0, 4).map((t) => (
                      <span className="chip chip--emerald" key={t}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="divider" />
              <div className="grid-2">
                <div className="suno-tip-card">
                  <div className="chart-title">Fortalezas del género</div>
                  <ul className="suno-list-check">
                    <li><Check size={12} /> {selected.description.split(".")[0]}.</li>
                    <li><Check size={12} /> Tempo de referencia: {selected.bpm}.</li>
                    <li><Check size={12} /> {selected.origin} como punto de partida.</li>
                  </ul>
                </div>
                <div className="suno-tip-card">
                  <div className="chart-title">Riesgos al promptear</div>
                  <ul className="suno-list-check suno-list-check--warn">
                    <li><Check size={12} /> Pedir artistas concretos suele dar resultados inconsistentes.</li>
                    <li><Check size={12} /> Demasiadas etiquetas diluyen el género principal.</li>
                    <li><Check size={12} /> Si el BPM no aparece, el modelo elige uno por ti.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {tab === "tags" && (
            <div className="suno-panel chart-card">
              <div className="chart-head">
                <span className="chart-title">Etiquetas recomendadas</span>
                <span className="chart-note">COPIA Y PEGA EN SUNO</span>
              </div>
              <div className="tag-cloud">
                {selected.tags.map((t) => (
                  <button key={t} className="tag-cloud__item" onClick={() => copy(t, `Etiqueta “${t}”`)}>
                    {t} <Copy size={10} />
                  </button>
                ))}
              </div>
              <div className="divider" />
              <div className="chart-title">Bloque de estilo</div>
              <div className="prompt-box" style={{ marginTop: 10 }}>{selected.tags.join(", ")}</div>
              <div className="row-flex" style={{ marginTop: 12 }}>
                <button className="btn btn--soft btn--sm" onClick={() => copy(selected.tags.join(", "), "Bloque de etiquetas")}>
                  <Copy size={13} /> Copiar bloque
                </button>
              </div>
              <div className="divider" />
              <div className="suno-tips">
                {SUNO_TIPS.map((tip) => (
                  <div className="suno-tip" key={tip}><Sparkles size={12} /> {tip}</div>
                ))}
              </div>
            </div>
          )}

          {tab === "artists" && (
            <div className="suno-panel chart-card">
              <div className="chart-head">
                <span className="chart-title">Referencias sonoras</span>
                <span className="chart-note">PARA ORIENTAR, NO PARA IMITAR</span>
              </div>
              <p className="chart-note" style={{ letterSpacing: 0, lineHeight: 1.7, marginBottom: 14 }}>
                Estos artistas definen el sonido del género. No los pidas por nombre en Suno: describe sus rasgos
                (textura, instrumentación, tipo de voz y mezcla) para obtener resultados más consistentes y legales.
              </p>
              <div className="artist-list">
                {selected.artists.map((a, i) => (
                  <div className="artist-row" key={a}>
                    <span className="artist-row__index mono">{String(i + 1).padStart(2, "0")}</span>
                    <span className="artist-row__avatar">{a.charAt(0)}</span>
                    <span className="artist-row__name">{a}</span>
                    <span className="chip">REFERENCIA</span>
                  </div>
                ))}
              </div>
              <div className="divider" />
              <div className="row-flex">
                <Users size={15} className="mute" />
                <span className="chart-note" style={{ letterSpacing: 0 }}>
                  Este catálogo solo incluye referencias
                  públicas de estilo.
                </span>
              </div>
            </div>
          )}

          {tab === "prompts" && (
            <div className="suno-panel stack-4">
              <div className="chart-card">
                <div className="chart-head">
                  <span className="chart-title">Prompts listos</span>
                  <span className="chart-note">{selected.name.toUpperCase()}</span>
                </div>
                <div className="suno-prompt-list">
                  {selected.prompts.map((p, i) => (
                    <div className="suno-prompt" key={p}>
                      <div className="suno-prompt__head">
                        <span className="mono">PROMPT {String(i + 1).padStart(2, "0")}</span>
                        <button className="link link--mono" onClick={() => copy(p, `Prompt ${i + 1}`)}>
                          <Copy size={11} /> Copiar
                        </button>
                      </div>
                      <p>{p}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-head">
                  <span className="chart-title">Constructor de prompt</span>
                  <span className="chart-note">GÉNERO + MOOD + INSTRUMENTO</span>
                </div>
                <div className="prompt-builder">
                  <div className="field">
                    <label className="label" htmlFor="pb-mood">Mood</label>
                    <select id="pb-mood" className="select" value={mood} onChange={(e) => setMood(e.target.value)}>
                      {MOODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="pb-inst">Instrumento</label>
                    <select id="pb-inst" className="select" value={instrument} onChange={(e) => setInstrument(e.target.value)}>
                      {INSTRUMENTS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="pb-bpm">BPM</label>
                    <input id="pb-bpm" className="input" inputMode="numeric" value={bpm} onChange={(e) => setBpm(e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="pb-vocals">Voz</label>
                    <input id="pb-vocals" className="input" value={vocals} onChange={(e) => setVocals(e.target.value)} placeholder="female vocals, intimate" />
                  </div>
                </div>
                <div className="prompt-box" style={{ marginTop: 14 }}>{customPrompt}</div>
                <div className="row-flex" style={{ marginTop: 12 }}>
                  <button className="btn btn--primary btn--sm" onClick={() => copy(customPrompt, "Prompt personalizado")}>
                    <Copy size={13} /> Copiar prompt
                  </button>
                  <button className="btn btn--ghost btn--sm" onClick={() => { setMood(MOODS[3]); setInstrument(INSTRUMENTS[2]); setBpm("110"); setVocals("female vocals"); }}>
                    Restablecer
                  </button>
                  <span className="chart-note" style={{ letterSpacing: 0 }}>Longitud {customPrompt.length} caracteres</span>
                </div>
              </div>
            </div>
          )}

          <div className="suno-footnote">
            <Sparkles size={13} />
            <span>
              Catálogo y prompts propios, elaborados a partir de taxonomías públicas de género. No son prompts
              oficiales de Suno ni garantizan un resultado concreto.
            </span>
            <a className="link link--mono" href="https://suno.com" target="_blank" rel="noreferrer">
              SUNO.COM <ArrowUpRight size={11} />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
