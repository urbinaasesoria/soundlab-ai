/**
 * Comparación contra referencias de género.
 * © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 *
 * Contrasta lo medido en el archivo con los rangos objetivo de los géneros de
 * referencia para responder a una pregunta concreta: «¿en qué se desvía esto
 * del estándar del estilo que dice ser?».
 *
 * Honestidad: la referencia es orientativa. Estar fuera de rango no es un
 * defecto —una balada puede tener LRA 12 y estar perfecta—, sino una pista de
 * hacia dónde quiere moverse la mezcla. La interfaz lo dice explícitamente.
 */
import type { AnalysisResult } from "../lib/audio/analyzer";
import { GENRE_TARGETS, type GenreTarget } from "../lib/data/genres";

interface Metric {
  key: string;
  label: string;
  unit: string;
  decimals: number;
  value: number | null;
  range: [number, number];
  weight: number;
}

interface Candidate {
  genre: GenreTarget;
  metrics: Metric[];
  /** Desviación normalizada (0 = todo dentro de rango). */
  score: number;
}

function buildMetrics(result: AnalysisResult, genre: GenreTarget): Metric[] {
  return [
    {
      key: "bpm",
      label: "Tempo",
      unit: "BPM",
      decimals: 0,
      value: Number.isFinite(result.rhythm?.bpm) ? result.rhythm.bpm : null,
      range: genre.bpm,
      weight: 1,
    },
    {
      key: "lufs",
      label: "Loudness",
      unit: "LUFS",
      decimals: 1,
      value: result.loudness?.lufs ?? null,
      range: genre.lufs,
      weight: 1.5,
    },
    {
      key: "lra",
      label: "Rango dinámico",
      unit: "LU",
      decimals: 1,
      value: result.loudness?.lra ?? null,
      range: genre.lra,
      weight: 1,
    },
    {
      key: "crest",
      label: "Crest",
      unit: "dB",
      decimals: 1,
      value: result.loudness?.crest ?? null,
      range: genre.crest,
      weight: 0.6,
    },
    {
      key: "width",
      label: "Anchura estéreo",
      unit: "",
      decimals: 2,
      value: result.stereo?.isMono ? null : (result.stereo?.width ?? null),
      range: genre.width,
      weight: 1,
    },
    {
      key: "hf",
      label: "Extensión de agudos",
      unit: "Hz",
      decimals: 0,
      value: result.tonal?.hfCutoff ?? null,
      range: genre.hf,
      weight: 0.6,
    },
  ];
}

/** 0 si está dentro del rango; crece según cuánto se aleja. */
function deviation(metric: Metric): number {
  if (metric.value === null || !Number.isFinite(metric.value)) return 0.5;
  const [lo, hi] = metric.range;
  if (metric.value >= lo && metric.value <= hi) return 0;
  const span = Math.max(1e-6, hi - lo);
  const excess = metric.value < lo ? lo - metric.value : metric.value - hi;
  return Math.min(2, excess / span);
}

function scoreOf(metrics: Metric[]): number {
  const total = metrics.reduce((sum, metric) => sum + metric.weight, 0);
  return metrics.reduce((sum, metric) => sum + deviation(metric) * metric.weight, 0) / total;
}

function statusOf(metric: Metric): "in" | "low" | "high" | "na" {
  if (metric.value === null || !Number.isFinite(metric.value)) return "na";
  const [lo, hi] = metric.range;
  if (metric.value < lo) return "low";
  if (metric.value > hi) return "high";
  return "in";
}

function fmt(value: number | null, decimals: number): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return value.toFixed(decimals);
}

export function GenreReference({ result }: { result: AnalysisResult }) {
  const candidates: Candidate[] = GENRE_TARGETS.map((genre) => {
    const metrics = buildMetrics(result, genre);
    return { genre, metrics, score: scoreOf(metrics) };
  }).sort((a, b) => a.score - b.score);

  const best = candidates[0];
  if (!best) return null;

  const total = best.metrics.length;
  const inRange = best.metrics.filter((metric) => statusOf(metric) === "in").length;
  const affinity = Math.max(0, Math.round((1 - Math.min(1, best.score)) * 100));

  /* Si el tempo medido no encaja en NINGÚN género, es muy probable que sea un
     error de estimación (microtiming fuerte) y no una característica del estilo. */
  const bpmValue = best.metrics.find((metric) => metric.key === "bpm")?.value ?? null;
  const bpmUnreliable =
    bpmValue !== null && !GENRE_TARGETS.some((genre) => bpmValue >= genre.bpm[0] && bpmValue <= genre.bpm[1]);

  const others = candidates.slice(1, 3);

  return (
    <div className="chart-card genre-ref">
      <div className="chart-head">
        <span className="chart-title">Referencia de género</span>
        <span className="chart-note">ORIENTATIVO · NO ES UN VEREDICTO</span>
      </div>

      <div className="genre-ref__head">
        <div>
          <span className="genre-ref__eyebrow mono">MÁS PARECIDO A</span>
          <b className="genre-ref__name">{best.genre.name}</b>
          <p className="genre-ref__note">{best.genre.note}</p>
        </div>
        <div className="genre-ref__score">
          <b>
            {inRange}/{total}
          </b>
          <span className="mono">
            MÉTRICAS EN RANGO
            <br />
            AFINIDAD {affinity} %
          </span>
        </div>
      </div>

      <div className="genre-ref__table">
        {best.metrics.map((metric) => {
          const status = statusOf(metric);
          return (
            <div key={metric.key} className={`genre-ref__row is-${status}`}>
              <span className="genre-ref__label">{metric.label}</span>
              <b className="mono">
                {fmt(metric.value, metric.decimals)}
                {metric.unit ? ` ${metric.unit}` : ""}
              </b>
              <span className="genre-ref__range mono">
                {fmt(metric.range[0], metric.decimals)} – {fmt(metric.range[1], metric.decimals)}
              </span>
              <span className="genre-ref__status">
                {status === "in" ? "en rango" : status === "low" ? "por debajo" : status === "high" ? "por encima" : "sin dato"}
              </span>
            </div>
          );
        })}
      </div>

      {others.length > 0 && (
        <p className="genre-ref__others">
          También se acerca a{" "}
          {others.map((candidate, index) => (
            <span key={candidate.genre.id}>
              <b>{candidate.genre.name}</b> (afinidad{" "}
              {Math.max(0, Math.round((1 - Math.min(1, candidate.score)) * 100))} %)
              {index < others.length - 1 ? " y " : ""}
            </span>
          ))}
          .
        </p>
      )}

      {bpmUnreliable && (
        <p className="genre-ref__caveat">
          El tempo medido (<b>{fmt(bpmValue, 0)} BPM</b>) queda fuera del rango de todos los géneros de
          referencia. Es más probable que sea un error de estimación del tempo —el microtiming fuerte lo
          descoloca— que una característica del estilo: confírmalo antes de tomar decisiones por él.
        </p>
      )}

      <p className="genre-ref__caveat">
        Los rangos son medias de referencia del estilo, no reglas. Un archivo fuera de rango puede ser una
        decisión artística deliberada; lo útil es saber <b>en qué dirección</b> se desvía respecto al sonido
        comercial del género.
      </p>
    </div>
  );
}
