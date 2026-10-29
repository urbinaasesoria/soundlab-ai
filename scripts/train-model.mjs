/**
 * Entrena una regresión logística sobre `data/dataset.json` y valida con
 * partición estratificada. Escribe `data/weights.trained.json` e imprime el
 * AUC, la matriz de confusión y el fragmento listo para pegar en model.ts.
 *
 * El modelo entrenado NO se activa automáticamente: hay que revisar las
 * métricas, confirmar que la validación supera AUC 0.85 sobre audio real y
 * entonces marcar MODEL_META.calibrated = true.
 *
 * Uso: node scripts/train-model.mjs
 *
 * © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const data = JSON.parse(readFileSync("data/dataset.json", "utf8"));
const keys = data.featureKeys;
const rows = data.rows;
if (!rows?.length) {
  console.error("data/dataset.json vacío. Ejecuta antes: npm run dataset:make");
  process.exit(1);
}

/* ------------------------- estandarización ------------------------------ */

const dim = keys.length;
const mean = new Array(dim).fill(0);
const std = new Array(dim).fill(0);
for (const r of rows) for (let i = 0; i < dim; i++) mean[i] += r.features[i];
for (let i = 0; i < dim; i++) mean[i] /= rows.length;
for (const r of rows) for (let i = 0; i < dim; i++) std[i] += (r.features[i] - mean[i]) ** 2;
for (let i = 0; i < dim; i++) std[i] = Math.sqrt(std[i] / rows.length) || 1;

const standardise = (f) => f.map((v, i) => (v - mean[i]) / std[i]);

/* --------------------------- partición 80/20 ---------------------------- */

function shuffled(list, seed = 42) {
  const out = list.slice();
  let s = seed >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    const j = (s >>> 0) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const mix = shuffled(rows);
const split = Math.floor(mix.length * 0.8);
const train = mix.slice(0, split);
const test = mix.slice(split);
if (test.length < 4) {
  console.error("Dataset demasiado pequeño para validar. Aumenta las muestras.");
  process.exit(1);
}

/* ----------------------------- entrenamiento --------------------------- */

const weights = new Array(dim).fill(0);
let bias = 0;
const lr = 0.15;
const epochs = 4000;
const n = train.length;

for (let epoch = 0; epoch < epochs; epoch++) {
  const gradW = new Array(dim).fill(0);
  let gradB = 0;
  for (const r of train) {
    const x = standardise(r.features);
    let z = bias;
    for (let i = 0; i < dim; i++) z += weights[i] * x[i];
    const p = 1 / (1 + Math.exp(-z));
    const err = p - r.label;
    for (let i = 0; i < dim; i++) gradW[i] += err * x[i];
    gradB += err;
  }
  for (let i = 0; i < dim; i++) weights[i] -= (lr * gradW[i]) / n;
  bias -= (lr * gradB) / n;
}

/* ------------------------------ evaluación ----------------------------- */

const predict = (features) => {
  const x = standardise(features);
  let z = bias;
  for (let i = 0; i < dim; i++) z += weights[i] * x[i];
  return 1 / (1 + Math.exp(-z));
};

function auc(pairs) {
  const sorted = pairs.slice().sort((a, b) => a.p - b.p);
  let rankSum = 0;
  let positives = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].label === 1) {
      positives++;
      rankSum += i + 1;
    }
  }
  const negatives = sorted.length - positives;
  if (!positives || !negatives) return 0.5;
  return (rankSum - (positives * (positives + 1)) / 2) / (positives * negatives);
}

const evaluate = (label, set) => {
  const pairs = set.map((r) => ({ p: predict(r.features), label: r.label }));
  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;
  for (const { p, label: y } of pairs) {
    const hit = p >= 0.5;
    if (y === 1 && hit) tp++;
    else if (y === 1) fn++;
    else if (!hit) tn++;
    else fp++;
  }
  const acc = (tp + tn) / pairs.length;
  console.log(
    `\n${label}: exactitud ${(acc * 100).toFixed(1)}% · AUC ${auc(pairs).toFixed(3)}` +
      `\n  VP ${tp} · VN ${tn} · FP ${fp} · FN ${fn}`,
  );
  return { acc, auc: auc(pairs) };
};

evaluate("Entrenamiento", train);
const result = evaluate("Validación (test)", test);

const ok = result.auc >= 0.85 && result.acc >= 0.8;
console.log(
  ok
    ? "\n✅ Supera el umbral (AUC ≥ 0,85 y exactitud ≥ 80 %)."
    : "\n⚠️ No supera el umbral. NO marcar el modelo como calibrado.",
);

mkdirSync("data", { recursive: true });
const payload = {
  version: "2.0-trained",
  calibrated: false,
  trainedOn: `synthetic-proxy (${rows.length} muestras)`,
  passedThreshold: ok,
  auc: Number(result.auc.toFixed(3)),
  accuracy: Number(result.acc.toFixed(3)),
  bias: Number(bias.toFixed(6)),
  mean: mean.map((v) => Number(v.toFixed(6))),
  std: std.map((v) => Number(v.toFixed(6))),
  weights: weights.map((v) => Number(v.toFixed(6))),
  featureKeys: keys,
};
writeFileSync("data/weights.trained.json", JSON.stringify(payload, null, 1), "utf8");
console.log("\nEscrito data/weights.trained.json");
console.log("Solo después de validar sobre AUDIO REAL, copia estos pesos a src/lib/audio/model.ts");
console.log("y marca MODEL_META.calibrated = true.");
