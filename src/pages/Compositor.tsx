import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, ClipboardCopy, Download, Info, Loader2, Sparkles, Upload, X } from "lucide-react";
import { useStudio } from "../lib/storage/store";
import { downloadBlob, downloadText } from "../lib/utils";
import { analyzeTrackAsync } from "../lib/audio/analyzeClient";
import { decodeFile, sliceTrack } from "../lib/audio/decode";
import {
  buildPack,
  compileSet,
  EMPTY_FORM,
  formatPlainText,
  formForPreset,
  KEY_SCALES,
  MOODS,
  MUSICAL_MODES,
  packFileName,
  PRODUCTION_KEYWORDS,
  EXCLUSIONS,
  VOCAL_ATTITUDES,
  VOCAL_TECHNIQUES,
  type CompositorForm,
  type CreativeProfile,
  type VocalGender,
} from "../lib/suno/composer";
import { PRESET_GROUPS, SUNO_PRESETS, findPreset } from "../lib/suno/presets";
import { deriveFromAnalysis, type ReferenceDerivation } from "../lib/suno/fromAnalysis";
import { SUNO_LIMITS } from "../lib/suno/limits";

const PROFILES: { id: CreativeProfile; label: string; hint: string }[] = [
  { id: "fiel", label: "Fiel", hint: "Obedece al prompt. Weirdness 12 · Influencia 92" },
  { id: "equilibrado", label: "Equilibrado", hint: "Estilo respetado con margen creativo. 28 · 80" },
  { id: "experimental", label: "Experimental", hint: "Más libertad del modelo. 58 · 62" },
];

export function CompositorPage() {
  const { toast } = useStudio();
  const [form, setForm] = useState<CompositorForm>(EMPTY_FORM);
  const [reference, setReference] = useState<ReferenceDerivation | null>(null);
  const [refBusy, setRefBusy] = useState("");
  const refInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof CompositorForm>(key: K, value: CompositorForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleIn = (key: "productionKeywords" | "exclude", value: string) =>
    setForm((prev) => {
      const list = prev[key];
      return { ...prev, [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
    });

  const applyProfile = (id: CreativeProfile) => {
    const weirdness = id === "fiel" ? 12 : id === "equilibrado" ? 28 : 58;
    const styleInfluence = id === "fiel" ? 92 : id === "equilibrado" ? 80 : 62;
    setForm((prev) => ({ ...prev, profile: id, weirdness, styleInfluence }));
  };

  /** Cambiar de preset restablece BPM y exclusiones a las del género. */
  const applyPreset = (presetId: string) => {
    const preset = findPreset(presetId);
    setForm((prev) => ({
      ...prev,
      presetId,
      bpm: prev.bpm || (preset ? String(Math.round((preset.bpmMin + preset.bpmMax) / 2)) : ""),
      exclude: preset ? preset.defaultExclusions : prev.exclude,
    }));
  };

  /** Analiza una referencia con el motor DSP y deriva decisiones de producción. */
  const analyzeReference = async (file: File) => {
    setRefBusy("Decodificando…");
    setReference(null);
    try {
      const decoded = await decodeFile(file);
      setRefBusy("Midiendo…");
      const target = decoded.duration > 75 ? sliceTrack(decoded, 75) : decoded;
      const result = await analyzeTrackAsync(target, {
        tier: "rapido",
        onProgress: (p) => setRefBusy(`${p.stage} · ${Math.round(p.pct)} %`),
      });
      const derived = deriveFromAnalysis(result);
      setReference(derived);
      setRefBusy("");
      toast("Referencia analizada: propuesta lista para aplicar.", "ok");
    } catch (err) {
      setRefBusy("");
      toast(err instanceof Error ? err.message : "No se pudo analizar la referencia.", "err");
    } finally {
      if (refInput.current) refInput.current.value = "";
    }
  };

  const applyReference = () => {
    if (!reference) return;
    setForm((prev) => ({
      ...prev,
      presetId: reference.presetId,
      bpm: reference.bpm ? String(reference.bpm) : prev.bpm,
      keyScale: reference.keyScale || prev.keyScale,
      moodId: reference.moodId,
      productionKeywords: Array.from(new Set([...prev.productionKeywords, ...reference.productionKeywords])),
      exclude: findPreset(reference.presetId)?.defaultExclusions ?? prev.exclude,
    }));
    toast("Análisis aplicado al set de producción.", "ok");
  };

  const result = useMemo(() => compileSet(form), [form]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${label} copiado.`, "ok");
    } catch {
      toast("No se pudo copiar al portapapeles.", "err");
    }
  };

  const exportPack = () => {
    const pack = buildPack(result);
    downloadBlob(
      new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" }),
      packFileName(result.title),
    );
    toast("Pack exportado en JSON.", "ok");
  };

  const exportText = () => {
    downloadText(formatPlainText(result), `${packFileName(result.title).replace(".json", "")}.txt`);
    toast("Set exportado en texto plano.", "ok");
  };

  const stylePct = Math.min(100, (result.checks.styleChars / result.checks.styleLimit) * 100);
  const lyricsPct = Math.min(100, (result.checks.lyricsChars / result.checks.lyricsLimit) * 100);

  return (
    <div className="page compositor-page">
      <div className="page-head">
        <div>
          <div className="eyebrow">PRO FLOW · 5 PASOS</div>
          <h1>
            Compositor <span className="accent-serif">Suno</span>
          </h1>
          <p className="page-head__sub">
            Convierte una idea en un set de producción listo para pegar: style prompt en inglés, letra
            estructurada, exclusiones y parámetros óptimos. Motor determinista, sin modelos externos y sin
            enviar nada a ningún servidor.
          </p>
        </div>
        <div className="page-head__actions">
          <Link to="/suno" className="btn btn--ghost btn--sm">
            <ArrowLeft size={13} /> Catálogo
          </Link>
          <button className="btn btn--gold btn--sm" onClick={exportPack}>
            <Download size={13} /> Exportar pack
          </button>
        </div>
      </div>

      <div className="composer-grid">
        {/* ------------------------------ formulario ------------------------------ */}
        <div className="composer-form stack-4">
          <section className="card composer-step composer-ref">
            <div className="composer-step__head">
              <span className="composer-step__num mono">AI</span>
              <div>
                <b>Analiza tu referencia</b>
                <p>
                  Sube un track que te guste: el motor mide tempo, tonalidad, dinámica, estéreo y aire, y
                  propone preset, emoción e instrumentación. El audio se analiza en tu equipo y no se envía
                  a ningún servidor.
                </p>
              </div>
            </div>

            <div className="composer-ref__actions">
              <input
                ref={refInput}
                type="file"
                accept="audio/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void analyzeReference(file);
                }}
              />
              <button
                className="btn btn--soft btn--sm"
                onClick={() => refInput.current?.click()}
                disabled={Boolean(refBusy)}
              >
                {refBusy ? <Loader2 size={13} className="composer-spin" /> : <Upload size={13} />}
                {refBusy || "Subir referencia"}
              </button>
              {reference && (
                <button className="btn btn--gold btn--sm" onClick={applyReference}>
                  <Sparkles size={13} /> Aplicar al set
                </button>
              )}
            </div>

            {reference && (
              <>
                <div className="composer-ref__chips">
                  {reference.measurements.map((m) => (
                    <span key={m.label} className="chip">
                      <b>{m.label}</b>&nbsp;{m.value}
                    </span>
                  ))}
                </div>
                <div className="composer-ref__pick">
                  <span className="mono">PROPUESTA</span>
                  <b>{reference.presetName}</b>
                  {reference.bpm !== null && <span className="mono">{reference.bpm} BPM</span>}
                  {reference.keyScale && <span className="mono">{reference.keyScale}</span>}
                  <span className="mono">MOOD {reference.moodId}</span>
                </div>
                <ul className="composer-ref__why">
                  {reference.rationale.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                {reference.caveats.length > 0 && (
                  <ul className="composer-ref__caveats">
                    {reference.caveats.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                )}
                {reference.missing.length > 0 && (
                  <p className="composer-ref__missing">
                    Sin datos suficientes para: {reference.missing.join(", ")}. Esos campos se respetan tal
                    como los tengas.
                  </p>
                )}
              </>
            )}
          </section>

          <section className="card composer-step">
            <div className="composer-step__head">
              <span className="composer-step__num mono">01</span>
              <div>
                <b>Idea de partida</b>
                <p>Tema, historia o letra. Si pegas tu letra, se respeta palabra por palabra.</p>
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="c-idea">
                Tema o letra
              </label>
              <textarea
                id="c-idea"
                className="input composer-textarea"
                rows={4}
                placeholder="Ej. una despedida en un aeropuerto a las 4 de la mañana"
                value={form.idea}
                onChange={(e) => set("idea", e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="c-lyrics">
                Tu letra completa (opcional)
              </label>
              <textarea
                id="c-lyrics"
                className="input composer-textarea"
                rows={6}
                placeholder="Pega aquí tu letra. Se conserva intacta y solo se le añaden etiquetas de estructura."
                value={form.lyrics}
                onChange={(e) => set("lyrics", e.target.value)}
              />
              <span className="field__hint">
                {form.lyrics.length} caracteres · máximo {SUNO_LIMITS.lyricsMaxChars}. Sin IA no inventamos
                versos: si lo dejas vacío recibirás un esqueleto de estructura.
              </span>
            </div>
            <label className="composer-check">
              <input
                type="checkbox"
                checked={form.keepLyrics}
                onChange={(e) => set("keepLyrics", e.target.checked)}
              />
              Mantener la letra intacta (no reescribir ni corregir)
            </label>
          </section>

          <section className="card composer-step">
            <div className="composer-step__head">
              <span className="composer-step__num mono">02</span>
              <div>
                <b>Precisión de género</b>
                <p>Cuanto más específico el subgénero, mejor obedece el modelo.</p>
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label className="label" htmlFor="c-genre">
                  Preset de género
                </label>
                <select
                  id="c-genre"
                  className="select"
                  value={form.presetId}
                  onChange={(e) => applyPreset(e.target.value)}
                >
                  {PRESET_GROUPS.map((group) => (
                    <optgroup key={group} label={group}>
                      {SUNO_PRESETS.filter((x) => x.group === group).map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.name} · {preset.bpmLabel} BPM
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <span className="field__hint">
                  {(findPreset(form.presetId) ?? SUNO_PRESETS[0]).description}
                </span>
              </div>
              <div className="field">
                <label className="label" htmlFor="c-custom">
                  Matiz sobre el preset (opcional)
                </label>
                <input
                  id="c-custom"
                  className="input"
                  placeholder="Ej. con cuerdas andinas y coros"
                  value={form.customGenre}
                  onChange={(e) => set("customGenre", e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="card composer-step">
            <div className="composer-step__head">
              <span className="composer-step__num mono">03</span>
              <div>
                <b>Dirección emocional</b>
                <p>Una emoción clara y una imagen concreta valen más que diez adjetivos.</p>
              </div>
            </div>
            <div className="composer-chips">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  className={`pill ${form.moodId === m.id ? "pill--active" : ""}`}
                  onClick={() => set("moodId", m.id)}
                >
                  {m.es}
                </button>
              ))}
            </div>
            <div className="field">
              <label className="label" htmlFor="c-cinematic">
                Imagen cinematográfica
              </label>
              <input
                id="c-cinematic"
                className="input"
                placeholder="Ej. conducir a las 3 de la mañana después de una ruptura"
                value={form.cinematic}
                onChange={(e) => set("cinematic", e.target.value)}
              />
            </div>
          </section>

          <section className="card composer-step">
            <div className="composer-step__head">
              <span className="composer-step__num mono">04</span>
              <div>
                <b>Instrumentación y voz</b>
                <p>De uno a tres protagonistas. Sin nombres de artistas reales.</p>
              </div>
            </div>
            <div className="field">
              <span className="label">Etiquetas de producción (máx. 3)</span>
              <div className="composer-chips">
                {PRODUCTION_KEYWORDS.map((k) => (
                  <button
                    key={k}
                    className={`pill ${form.productionKeywords.includes(k) ? "pill--active" : ""}`}
                    onClick={() => toggleIn("productionKeywords", k)}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-grid form-grid--three">
              <div className="field">
                <label className="label" htmlFor="c-vg">
                  Voz
                </label>
                <select
                  id="c-vg"
                  className="select"
                  value={form.vocalGender}
                  onChange={(e) => set("vocalGender", e.target.value as VocalGender)}
                >
                  <option value="">Sin definir</option>
                  <option value="female">Femenina</option>
                  <option value="male">Masculina</option>
                  <option value="duet">Dúo</option>
                  <option value="instrumental">Instrumental</option>
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="c-vt">
                  Técnica
                </label>
                <select
                  id="c-vt"
                  className="select"
                  value={form.vocalTechnique}
                  onChange={(e) => set("vocalTechnique", e.target.value)}
                >
                  <option value="">Sin definir</option>
                  {VOCAL_TECHNIQUES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="c-va">
                  Actitud
                </label>
                <select
                  id="c-va"
                  className="select"
                  value={form.vocalAttitude}
                  onChange={(e) => set("vocalAttitude", e.target.value)}
                >
                  <option value="">Sin definir</option>
                  {VOCAL_ATTITUDES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="card composer-step">
            <div className="composer-step__head">
              <span className="composer-step__num mono">05</span>
              <div>
                <b>Metadatos técnicos y ajustes</b>
                <p>BPM y tonalidad son lo que Suno respeta con más consistencia.</p>
              </div>
            </div>
            <div className="form-grid form-grid--three">
              <div className="field">
                <label className="label" htmlFor="c-bpm">
                  BPM
                </label>
                <input
                  id="c-bpm"
                  className="input"
                  placeholder="Ej. 118"
                  inputMode="numeric"
                  value={form.bpm}
                  onChange={(e) => set("bpm", e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="c-key">
                  Tonalidad
                </label>
                <select
                  id="c-key"
                  className="select"
                  value={form.keyScale}
                  onChange={(e) => set("keyScale", e.target.value)}
                >
                  {KEY_SCALES.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="c-mode">
                  Modo
                </label>
                <select
                  id="c-mode"
                  className="select"
                  value={form.musicalMode}
                  onChange={(e) => set("musicalMode", e.target.value)}
                >
                  {MUSICAL_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <span className="label">Excluir del resultado</span>
              <div className="composer-chips">
                {EXCLUSIONS.map((x) => (
                  <button
                    key={x.id}
                    className={`pill ${form.exclude.includes(x.id) ? "pill--active" : ""}`}
                    onClick={() => toggleIn("exclude", x.id)}
                  >
                    {x.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="composer-checks">
              <label className="composer-check">
                <input
                  type="checkbox"
                  checked={form.maxMode}
                  onChange={(e) => set("maxMode", e.target.checked)}
                />
                MAX MODE (bloques de acondicionamiento)
              </label>
              <label className="composer-check">
                <input
                  type="checkbox"
                  checked={form.vocalEntryHack}
                  onChange={(e) => set("vocalEntryHack", e.target.checked)}
                />
                Entrada vocal inmediata <code>[***]</code>
              </label>
              <label className="composer-check">
                <input
                  type="checkbox"
                  checked={form.instrumentalBridge}
                  onChange={(e) => set("instrumentalBridge", e.target.checked)}
                />
                Puente instrumental tras el primer coro
              </label>
            </div>
          </section>

          <section className="card composer-step">
            <div className="composer-step__head">
              <span className="composer-step__num mono">※</span>
              <div>
                <b>Perfil creativo</b>
                <p>Ajusta cuánta libertad le das al modelo.</p>
              </div>
            </div>
            <div className="composer-profiles">
              {PROFILES.map((p) => (
                <button
                  key={p.id}
                  className={`composer-profile ${form.profile === p.id ? "is-active" : ""}`}
                  onClick={() => applyProfile(p.id)}
                >
                  <b>{p.label}</b>
                  <span>{p.hint}</span>
                </button>
              ))}
            </div>
            <div className="form-grid">
              <div className="field">
                <label className="label" htmlFor="c-weird">
                  Weirdness · {form.weirdness}
                </label>
                <input
                  id="c-weird"
                  type="range"
                  min={0}
                  max={100}
                  value={form.weirdness}
                  onChange={(e) => set("weirdness", Number(e.target.value))}
                  className="composer-range"
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="c-infl">
                  Style influence · {form.styleInfluence}
                </label>
                <input
                  id="c-infl"
                  type="range"
                  min={0}
                  max={100}
                  value={form.styleInfluence}
                  onChange={(e) => set("styleInfluence", Number(e.target.value))}
                  className="composer-range"
                />
              </div>
            </div>
          </section>
        </div>

        {/* -------------------------------- salida -------------------------------- */}
        <aside className="composer-output">
          <div className="card composer-out">
            <div className="composer-out__head">
              <span className="eyebrow">SET DE PRODUCCIÓN</span>
              <span className={`chip ${result.checks.fitsSuno ? "chip--emerald" : "chip--gold"}`}>
                {result.checks.fitsSuno ? "CABE EN SUNO" : "REVISAR LÍMITES"}
              </span>
            </div>

            <div className="composer-out__block">
              <div className="composer-out__row">
                <span className="mono">STYLE PROMPT</span>
                <span className="mono">
                  {result.checks.styleChars}/{result.checks.styleLimit}
                </span>
              </div>
              <div className="composer-meter">
                <span style={{ width: `${stylePct}%` }} />
              </div>
              <p className="composer-out__text">{result.stylePrompt || "—"}</p>
              <button className="btn btn--ghost btn--sm" onClick={() => copy(result.stylePrompt, "Style prompt")}>
                <ClipboardCopy size={12} /> Copiar
              </button>
            </div>

            <div className="composer-out__block">
              <div className="composer-out__row">
                <span className="mono">EXCLUDE STYLES</span>
                <span className="mono">{result.checks.excludeChars}</span>
              </div>
              <p className="composer-out__text">{result.excludeStyles || "—"}</p>
            </div>

            <div className="composer-out__block">
              <div className="composer-out__row">
                <span className="mono">LETRA</span>
                <span className="mono">
                  {result.checks.lyricsChars}/{result.checks.lyricsLimit}
                </span>
              </div>
              <div className="composer-meter">
                <span style={{ width: `${lyricsPct}%` }} />
              </div>
              <pre className="composer-lyrics">{result.lyrics}</pre>
              <button className="btn btn--ghost btn--sm" onClick={() => copy(result.lyrics, "Letra")}>
                <ClipboardCopy size={12} /> Copiar
              </button>
            </div>

            <div className="composer-out__block">
              <div className="composer-out__row">
                <span className="mono">PARÁMETROS</span>
              </div>
              <div className="composer-params mono">
                <span>WEIRDNESS {result.weirdness}</span>
                <span>INFLUENCE {result.styleInfluence}</span>
              </div>
            </div>

            {result.checks.warnings.length > 0 && (
              <div className="composer-warn">
                <Info size={14} />
                <ul>
                  {result.checks.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.checks.notes.length > 0 && (
              <div className="composer-notes">
                <Info size={13} />
                <ul>
                  {result.checks.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="composer-out__actions">
              <button className="btn btn--primary" onClick={exportPack}>
                <Download size={14} /> Exportar .sunopack.json
              </button>
              <button className="btn btn--soft btn--sm" onClick={exportText}>
                Descargar texto
              </button>
            </div>
          </div>

          <div className="card composer-why">
            <span className="eyebrow">QUÉ HA DECIDIDO EL MOTOR</span>
            <ul>
              {result.decisions.map((d) => (
                <li key={d.step}>
                  <b>{d.step}</b>
                  <span>{d.detail}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card composer-caveat">
            <div className="composer-caveat__head">
              {result.checks.fitsSuno ? <Check size={14} /> : <X size={14} />}
              <b>Sin promesas de más</b>
            </div>
            <p>
              Este compositor <b>no</b> genera música ni letras: construye el set de parámetros que Suno
              interpreta mejor. La calidad final depende del modelo de Suno y de tu criterio al escuchar.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
