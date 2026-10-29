import { clamp } from "../lib/utils";
import { zoneFromProbability, ZONE_LABEL } from "../lib/audio/analyzer";

export function ScaleGauge({ probability, showZone = true }: { probability: number; showZone?: boolean }) {
  const pct = clamp(probability, 0, 100);
  const zone = zoneFromProbability(pct);
  return (
    <div className="scale">
      <div className="scale__bar" role="img" aria-label={`Probabilidad de IA ${pct}% · ${ZONE_LABEL[zone]}`}>
        <div className="scale__marker" style={{ left: `${pct}%` }}>
          <span className="scale__flag">AQUÍ ESTÁS · {pct.toFixed(1).replace(".0", "")}%</span>
        </div>
      </div>
      <div className="scale__labels">
        <span style={{ left: "0%" }}>0</span>
        <span style={{ left: "30%" }}>30</span>
        <span style={{ left: "50%" }}>50</span>
        <span style={{ left: "70%" }}>70</span>
        <span style={{ left: "100%" }}>100</span>
      </div>
      {showZone && (
        <div className="scale__legend">
          <span className="scale__zone scale__zone--opt">Óptimo ≤30</span>
          <span className="scale__zone scale__zone--safe">Seguro 30–50</span>
          <span className="scale__zone scale__zone--risk">Riesgo 50–70</span>
          <span className="scale__zone scale__zone--danger">Peligro &gt;70</span>
        </div>
      )}
    </div>
  );
}
