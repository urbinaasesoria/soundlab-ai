/**
 * Diagnóstico: imprime características y contribuciones del modelo para los
 * dos perfiles de referencia. Uso:
 *   node --import ./tests/register.mjs tests/diagnose.ts
 */
import { extractFeatures } from "../src/lib/audio/features.ts";
import { evaluate } from "../src/lib/audio/model.ts";
import { makeHuman, makeSynthetic } from "./fixtures.ts";

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "—");

async function report(name: string, track: Awaited<ReturnType<typeof makeSynthetic>>) {
  const f = await extractFeatures(track);
  const m = evaluate(f);
  console.log(`\n=== ${name} ===`);
  console.log(
    [
      `prob=${m.probability}%  logit=${fmt(m.logit)}  conf=${m.confidence}`,
      `bpm=${fmt(f.bpm, 1)} conf=${fmt(f.bpmConfidence)} jitter=${fmt(f.transientJitterMs, 1)}ms gridLock=${fmt(f.gridLock)} velVar=${fmt(f.velocityVariation)}`,
      `edge=${Math.round(f.spectralEdgeHz)}Hz hf>16k=${fmt(f.hfAbove16kRatio, 4)} slope=${fmt(f.hfSlopeDbOct, 1)}dB/oct air=${fmt(f.airRatio, 4)}`,
      `noiseFloor=${fmt(f.noiseFloorDbfs, 1)}dBFS silence=${fmt(f.silenceRatio, 3)} LRA=${fmt(f.lra, 1)}LU crest=${fmt(f.crestDb, 1)}dB`,
      `stereo corr=${fmt(f.correlation)} hfCorr=${fmt(f.hfDecorrelation, 4)} width=${fmt(f.width)} lvlDiff=${fmt(f.channelLevelDiffDb)}dB`,
      `flatness=${fmt(f.flatnessMean, 4)} fluxCv=${fmt(f.fluxCv)} centroid=${Math.round(f.centroidMean)}Hz sections=${f.sections.length} onsets=${f.onsetDensity}`,
    ].join("\n"),
  );
  console.log("señales:");
  for (const c of m.contributions) {
    console.log(
      `  ${c.id.padEnd(11)} ${c.applicable ? String(c.value).padStart(5) : "  n/a"}  imp=${String(c.impact).padStart(7)}  ${c.evidence}`,
    );
  }
}

await report("SINTÉTICO", makeSynthetic(30, 11));
await report("HUMANO", makeHuman(30, 12));
