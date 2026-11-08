import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Ear, Eye, Play, RotateCcw, Sparkles, Square, Upload, Zap } from "lucide-react";
import { useStudio } from "../lib/storage/store";
import { decodeFile } from "../lib/audio/decode";
import { commonTarget, interpret, levelMatch, type LevelMatch } from "../lib/audio/loudnessMatch";
import { formatBytes, formatDuration, prettyName } from "../lib/utils";

type Role = "original" | "procesada";
type Side = "x" | "y";

interface Loaded {
  file: File;
  url: string;
  duration: number;
  level: LevelMatch;
}

interface Trial {
  at: number;
  pref: Side | "tie";
  hit: boolean;
  lufsOriginal: number;
  lufsProcesada: number;
}

const STORE_KEY = "soundlab.blind.v1";

function loadTrials(): Trial[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Trial[]) : [];
  } catch {
    return [];
  }
}

export function BlindTestPage() {
  const { toast } = useStudio();
  const [original, setOriginal] = useState<Loaded | null>(null);
  const [processed, setProcessed] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState("");
  const [xIsA, setXIsA] = useState(true);
  const [active, setActive] = useState<Side | null>(null);
  const [revealed, setRevealed] = useState<Side | "tie" | null>(null);
  const [trials, setTrials] = useState<Trial[]>(() => loadTrials());

  const audioA = useRef<HTMLAudioElement | null>(null);
  const audioB = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (original) URL.revokeObjectURL(original.url);
      if (processed) URL.revokeObjectURL(processed.url);
    };
    // solo al desmontar
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(trials.slice(-200)));
    } catch {
      /* almacenamiento lleno o bloqueado: la sesión sigue funcionando */
    }
  }, [trials]);

  const pick = async (file: File, role: Role) => {
    setBusy(`Preparando ${role}…`);
    setRevealed(null);
    setActive(null);
    try {
      const decoded = await decodeFile(file);
      const level = levelMatch(decoded.channels, decoded.sampleRate);
      const loaded: Loaded = {
        file,
        url: URL.createObjectURL(file),
        duration: decoded.duration,
        level,
      };
      if (role === "original") setOriginal(loaded);
      else setProcessed(loaded);
      toast(`${prettyName(file.name)} cargado · ${level.loudnessLufs.toFixed(1)} LUFS`, "ok");
    } catch (err) {
      toast(err instanceof Error ? err.message : "No se pudo decodificar el audio.", "err");
    } finally {
      setBusy("");
    }
  };

  const [gains, setGains] = useState<{ a: number; b: number; target: number } | null>(null);

  /* Aplica la nivelación al elemento de audio correspondiente. */
  useEffect(() => {
    if (!gains) return;
    if (audioA.current) audioA.current.volume = gains.a;
    if (audioB.current) audioB.current.volume = gains.b;
  }, [gains, original, processed]);

  const applyTarget = () => {
    if (!original || !processed) return;
    const target = commonTarget(original.level.loudnessLufs, processed.level.loudnessLufs);
    const a = Math.pow(10, Math.min(0, target - original.level.loudnessLufs) / 20);
    const b = Math.pow(10, Math.min(0, target - processed.level.loudnessLufs) / 20);
    setGains({ a, b, target });
    setXIsA(Math.random() < 0.5);
    toast(`Niveles igualados a ${target.toFixed(1)} LUFS · orden aleatorizado.`, "ok");
  };

  const audioFor = (side: Side) => (side === "x" ? (xIsA ? audioA : audioB) : xIsA ? audioB : audioA);

  const stopAll = () => {
    audioA.current?.pause();
    audioB.current?.pause();
    setActive(null);
  };

  const playSide = (side: Side) => {
    const next = audioFor(side).current;
    if (!next) return;
    const previous = active && active !== side ? audioFor(active).current : null;
    const offset = previous?.currentTime ?? next.currentTime;
    audioA.current?.pause();
    audioB.current?.pause();
    next.currentTime = offset;
    void next.play();
    setActive(side);
  };

  const roleOf = (side: Side): Role => (xIsA ? (side === "x" ? "original" : "procesada") : side === "x" ? "procesada" : "original");

  const vote = (pref: Side | "tie") => {
    stopAll();
    const hit = pref === "tie" ? false : roleOf(pref) === "procesada";
    setRevealed(pref);
    if (pref !== "tie") {
      setTrials((prev) => [
        ...prev,
        {
          at: Date.now(),
          pref,
          hit,
          lufsOriginal: original?.level.loudnessLufs ?? 0,
          lufsProcesada: processed?.level.loudnessLufs ?? 0,
        },
      ]);
    }
    toast(pref === "tie" ? "Registrado como empate: no cuenta para la estadística." : hit ? "Acertaste." : "Fallaste.", "info");
  };

  const stats = useMemo(() => {
    const n = trials.length;
    const hits = trials.filter((t) => t.hit).length;
    return { n, hits, pct: n ? Math.round((hits / n) * 100) : 0, text: interpret(hits, n) };
  }, [trials]);

  const reset = () => {
    stopAll();
    setOriginal(null);
    setProcessed(null);
    setGains(null);
    setRevealed(null);
  };

  const ready = Boolean(original && processed && gains);

  return (
    <div className="page blind-page">
      <div className="page-head">
        <div>
          <div className="eyebrow">PRUEBA A CIEGAS · NIVELACIÓN ITU-R BS.1770</div>
          <h1>
            Comparador <span className="accent-serif">a ciegas</span>
          </h1>
          <p className="page-head__sub">
            El oído engaña: lo que suena más fuerte casi siempre parece mejor. Aquí se iguala la sonoridad
            de las dos versiones, se oculta cuál es cuál y se mide tu preferencia. Sin IE, sin trampa y con
            la estadística explicada sin adornos.
          </p>
        </div>
        <div className="page-head__actions">
          <button className="btn btn--ghost btn--sm" onClick={reset} disabled={!original && !processed}>
            <RotateCcw size={13} /> Reiniciar
          </button>
        </div>
      </div>

      <div className="blind-load">
        <label className={`blind-slot ${original ? "is-loaded" : ""}`}>
          <Upload size={16} />
          <b>Versión original</b>
          <span>{original ? prettyName(original.file.name) : "Arrastra o selecciona un audio"}</span>
          {original && (
            <span className="mono blind-slot__meta">
              {formatDuration(original.duration)} · {formatBytes(original.file.size)} ·{" "}
              {original.level.loudnessLufs.toFixed(1)} LUFS
            </span>
          )}
          <input
            type="file"
            accept="audio/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void pick(file, "original");
              e.target.value = "";
            }}
          />
        </label>

        <label className={`blind-slot ${processed ? "is-loaded" : ""}`}>
          <Upload size={16} />
          <b>Versión procesada</b>
          <span>{processed ? prettyName(processed.file.name) : "El resultado del humanizador o del máster"}</span>
          {processed && (
            <span className="mono blind-slot__meta">
              {formatDuration(processed.duration)} · {formatBytes(processed.file.size)} ·{" "}
              {processed.level.loudnessLufs.toFixed(1)} LUFS
            </span>
          )}
          <input
            type="file"
            accept="audio/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void pick(file, "procesada");
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {busy && <p className="blind-busy mono">{busy}</p>}

      {!ready && !busy && (
        <div className="card blind-hint">
          <Ear size={16} />
          <p>
            Carga las dos versiones del mismo fragmento. Se atenúa la más alta hasta el nivel de la más baja
            para que la comparación mida <b>calidad</b> y no volumen. Nada se sube a ningún servidor.
          </p>
        </div>
      )}

      {ready && gains && (
        <>
          <div className="card blind-room">
            <div className="blind-room__head">
              <span className="eyebrow">SALA DE ESCUCHA</span>
              <span className="chip chip--emerald mono">{gains.target.toFixed(1)} LUFS IGUALADOS</span>
            </div>

            <div className="blind-ab">
              {(["x", "y"] as Side[]).map((side) => {
                const isActive = active === side;
                return (
                  <button
                    key={side}
                    className={`blind-side ${isActive ? "is-active" : ""}`}
                    onClick={() => (isActive ? stopAll() : playSide(side))}
                    aria-pressed={isActive}
                  >
                    {isActive ? <Square size={26} /> : <Play size={26} />}
                    <b>{side.toUpperCase()}</b>
                    <span className="mono">
                      {isActive ? "REPRODUCIENDO" : "ESCUCHAR"}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="blind-room__tip">
              Cambia entre X e Y tantas veces como quieras: la reproducción se reanuda en el mismo punto.
              No hay pista visual, ni nombres, ni orden fijo.
            </p>

            {!revealed ? (
              <div className="blind-vote">
                <span className="mono">¿CUÁL PREFIERES?</span>
                <div>
                  <button className="btn btn--primary btn--sm" onClick={() => vote("x")}>
                    Me gusta más X
                  </button>
                  <button className="btn btn--primary btn--sm" onClick={() => vote("y")}>
                    Me gusta más Y
                  </button>
                  <button className="btn btn--ghost btn--sm" onClick={() => vote("tie")}>
                    No noto diferencia
                  </button>
                </div>
              </div>
            ) : (
              <div className="blind-reveal">
                <Ear size={16} />
                <div style={{ flex: 1 }}>
                  <b>
                    X era la versión {roleOf("x")} · Y era la versión {roleOf("y")}
                  </b>
                  <p>
                    {revealed === "tie"
                      ? "Marcaste empate: no se añade al recuento, porque un empate no informa sobre preferencia."
                      : `Preferiste la versión ${roleOf(revealed)}. ${
                          roleOf(revealed) === "procesada"
                            ? "¡Comprobado! Tu oído seleccionó la pista tratada con SoundLab AI (calidez analógica y de-harshing)."
                            : "Cuenta como fallo: el procesado no convenció en esta toma."
                        }`}
                  </p>

                  {/* CRO: Oferta Inmediata Eureka */}
                  {revealed !== "tie" && roleOf(revealed) === "procesada" && (
                    <div
                      style={{
                        marginTop: 14,
                        padding: "12px 16px",
                        background: "linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(16, 185, 129, 0.1))",
                        border: "1px solid rgba(212, 175, 55, 0.4)",
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                        <b style={{ color: "var(--color-gold, #e5b84b)", display: "block" }}>
                          ✨ Tu oído lo confirma: SoundLab AI suena a estudio comercial.
                        </b>
                        <span style={{ opacity: 0.88 }}>
                          Desbloquea exportación WAV 24-bit y tu Pasaporte Distro-Ready por solo <b>S/ 9.90 ($2.99)</b> en Tripwire o <b>S/ 15 ($4.90)</b> en Pack Starter.
                        </span>
                      </div>
                      <Link to="/billing" className="btn btn--gold btn--sm" style={{ fontWeight: 700 }}>
                        <Zap size={14} /> Aprovechar Oferta Especial
                      </Link>
                    </div>
                  )}

                  <button className="btn btn--gold btn--sm" onClick={() => { setRevealed(null); setXIsA(Math.random() < 0.5); }} style={{ marginTop: 12 }}>
                    Otra ronda con el mismo par
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="card blind-stats">
            <div className="blind-stats__head">
              <BarChart3 size={16} />
              <b>Resultado acumulado</b>
              <span className="mono">
                {stats.hits}/{stats.n} ACIERTOS · {stats.pct} %
              </span>
            </div>
            <div className="blind-bar">
              <span style={{ width: `${stats.pct}%` }} />
              <i style={{ left: "50%" }} />
            </div>
            <p className="blind-stats__text">{stats.text}</p>
            <p className="blind-stats__note">
              «Acierto» significa que preferiste la versión procesada. La línea central marca el 50 %: el
              azar. Los empates no cuentan. La prueba no mide si el procesado es técnicamente mejor, solo si
              te gusta más al escucharlo sin saber cuál es.
            </p>
            {stats.n > 0 && (
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  setTrials([]);
                  toast("Historial de pruebas borrado.", "info");
                }}
              >
                Borrar historial
              </button>
            )}
          </div>
        </>
      )}

      {original && processed && !gains && (
        <button className="btn btn--gold" onClick={applyTarget}>
          <Eye size={14} /> Igualar niveles y empezar
        </button>
      )}

      <audio ref={audioA} src={original?.url} preload="metadata" hidden />
      <audio ref={audioB} src={processed?.url} preload="metadata" hidden />
    </div>
  );
}
