import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, ClipboardCopy, Download, HelpCircle, Info, Loader2, Sparkles, Upload, Wand2, X } from "lucide-react";
import { useStudio } from "../lib/storage/store";
import { downloadBlob, downloadText } from "../lib/utils";
import { analyzeTrackAsync } from "../lib/audio/analyzeClient";
import { decodeFile, sliceTrack } from "../lib/audio/decode";
import {
  buildPack,
  compileSet,
  calculateDynamicParameters,
  EMPTY_FORM,
  formatPlainText,
  KEY_SCALES,
  LYRIC_LANGUAGES,
  LYRIC_POVS,
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
import { aiConfigured, composeSet, improveSet, refineReferenceWithAi } from "../lib/ai/client";
import { SUNO_LIMITS } from "../lib/suno/limits";
import { SunoMcpModal } from "../components/SunoMcpModal";

const PROFILES: { id: CreativeProfile; label: string; hint: string }[] = [
  { id: "fiel", label: "Fiel", hint: "Máxima obediencia al brief · Mayor Style Influence" },
  { id: "equilibrado", label: "Equilibrado", hint: "Estilo respetado con margen creativo balanceado" },
  { id: "experimental", label: "Experimental", hint: "Mayor apertura tímbrica y libertad generativa" },
];

export function CompositorPage() {
  const { toast } = useStudio();
  const [form, setForm] = useState<CompositorForm>(EMPTY_FORM);
  const [reference, setReference] = useState<ReferenceDerivation | null>(null);
  const [refBusy, setRefBusy] = useState("");
  const [mcpModalOpen, setMcpModalOpen] = useState(false);
  const [showMoodGuide, setShowMoodGuide] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<{ kind: "ok" | "err"; text: string; rationale?: string[] } | null>(null);
  const [aiSnapshot, setAiSnapshot] = useState<{
    lyrics: string;
    styleOverride: string;
    moodId: string;
    keyScale: string;
  } | null>(null);
  const [aiVariants, setAiVariants] = useState<string[]>([]);
  const refInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof CompositorForm>(key: K, value: CompositorForm[K]) =>
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key !== "weirdness" && key !== "styleInfluence") {
        const dyn = calculateDynamicParameters(next);
        next.weirdness = dyn.weirdness;
        next.styleInfluence = dyn.styleInfluence;
      }
      return next;
    });

  const toggleIn = (key: "productionKeywords" | "exclude", value: string) =>
    setForm((prev) => {
      const list = prev[key];
      const nextList = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      const next = { ...prev, [key]: nextList };
      if (key === "productionKeywords") {
        const dyn = calculateDynamicParameters(next);
        next.weirdness = dyn.weirdness;
        next.styleInfluence = dyn.styleInfluence;
      }
      return next;
    });

  const applyProfile = (id: CreativeProfile) => {
    setForm((prev) => {
      const next = { ...prev, profile: id };
      const dyn = calculateDynamicParameters(next);
      next.weirdness = dyn.weirdness;
      next.styleInfluence = dyn.styleInfluence;
      return next;
    });
  };

  /** Cambiar de preset restablece BPM y exclusiones a las del género y recalcula parámetros. */
  const applyPreset = (presetId: string) => {
    const preset = findPreset(presetId);
    setForm((prev) => {
      const next = {
        ...prev,
        presetId,
        bpm: preset ? String(Math.round((preset.bpmMin + preset.bpmMax) / 2)) : prev.bpm,
        exclude: preset ? preset.defaultExclusions : prev.exclude,
      };
      const dyn = calculateDynamicParameters(next);
      next.weirdness = dyn.weirdness;
      next.styleInfluence = dyn.styleInfluence;
      return next;
    });
  };

  /** Analiza una referencia con el motor DSP multidimensional + validación musicológica IA. */
  const analyzeReference = async (file: File) => {
    setRefBusy("Decodificando…");
    setReference(null);
    try {
      const decoded = await decodeFile(file);
      setRefBusy("Midiendo huella espectral y rítmica…");
      // Si la canción dura más de 95 s, saltamos los primeros 14 s de intro para medir el cuerpo real (verso + estribillo)
      const startSec = decoded.duration > 95 ? 14 : decoded.duration > 50 ? 6 : 0;
      const target = decoded.duration > 75 ? sliceTrack(decoded, 75, startSec) : decoded;
      const result = await analyzeTrackAsync(target, {
        tier: "profundo",
        onProgress: (p) => setRefBusy(`${p.stage} · ${Math.round(p.pct)} %`),
      });
      let derived = deriveFromAnalysis(result);

      if (aiConfigured) {
        setRefBusy("Verificando género y estilo con IA musicológica…");
        const telemetry = {
          fileName: file.name,
          duration: decoded.duration,
          dspCandidates: derived.candidates,
          dspBpm: derived.bpm,
          dspKey: derived.keyScale,
          dspMood: derived.moodId,
          loudness: result.loudness,
          rhythm: result.rhythm,
          tonal: result.tonal,
          stereo: result.stereo,
          spectrum: result.spectrum,
        };
        const aiRef = await refineReferenceWithAi(telemetry);
        if (aiRef.ok && aiRef.data) {
          const pickedPreset = findPreset(aiRef.data.presetId);
          if (pickedPreset) {
            derived = {
              ...derived,
              presetId: pickedPreset.id,
              presetName: pickedPreset.name,
              bpm: aiRef.data.bpm ? Math.round(aiRef.data.bpm) : derived.bpm,
              keyScale: aiRef.data.keyScale || derived.keyScale,
              moodId: (aiRef.data.moodId as ReferenceDerivation["moodId"]) || derived.moodId,
              vocalGender: aiRef.data.vocalGender ?? derived.vocalGender,
              vocalTechnique: aiRef.data.vocalTechnique ?? derived.vocalTechnique,
              vocalAttitude: aiRef.data.vocalAttitude ?? derived.vocalAttitude,
              productionKeywords:
                aiRef.data.productionKeywords && aiRef.data.productionKeywords.length > 0
                  ? aiRef.data.productionKeywords.slice(0, 3)
                  : derived.productionKeywords,
              rationale: [
                ...(aiRef.data.rationale ?? []),
                ...derived.rationale.slice(0, 2),
              ],
            };
          }
        }
      }

      setReference(derived);
      setRefBusy("");
      toast("Referencia analizada con éxito: revisa la propuesta y aplícala al set.", "ok");
    } catch (err) {
      setRefBusy("");
      toast(err instanceof Error ? err.message : "No se pudo analizar la referencia.", "err");
    } finally {
      if (refInput.current) refInput.current.value = "";
    }
  };

  const applyReference = (overridePresetId?: string) => {
    if (!reference) return;
    const chosenPresetId = overridePresetId || reference.presetId;
    const chosenPreset = findPreset(chosenPresetId);
    setForm((prev) => {
      const next: CompositorForm = {
        ...prev,
        presetId: chosenPresetId,
        bpm: reference.bpm ? String(reference.bpm) : prev.bpm,
        keyScale: reference.keyScale || prev.keyScale,
        moodId: reference.moodId,
        vocalGender: reference.vocalGender || prev.vocalGender,
        vocalTechnique: reference.vocalTechnique || prev.vocalTechnique,
        vocalAttitude: reference.vocalAttitude || prev.vocalAttitude,
        productionKeywords: Array.from(new Set([...reference.productionKeywords])).slice(0, 3),
        exclude: chosenPreset?.defaultExclusions ?? prev.exclude,
      };
      const dyn = calculateDynamicParameters(next);
      next.weirdness = dyn.weirdness;
      next.styleInfluence = dyn.styleInfluence;
      return next;
    });
    toast(
      `Análisis aplicado al set (${chosenPreset?.name ?? reference.presetName}). Todos los campos se han sincronizado.`,
      "ok",
    );
  };

  const result = useMemo(() => compileSet(form), [form]);

  const selectedMoodObj = useMemo(
    () => MOODS.find((m) => m.id === form.moodId) ?? MOODS[0],
    [form.moodId],
  );
  const effectiveMoodObj = useMemo(
    () => MOODS.find((m) => m.id === result.effectiveMoodId) ?? MOODS[1],
    [result.effectiveMoodId],
  );

  /** Copiloto opcional solo para pulir el style prompt sin alterar la letra. */
  const askAi = async () => {
    setAiBusy(true);
    setAiNote(null);
    const response = await improveSet({
      set: result.stylePrompt,
      preset: result.presetName,
      extras: form.idea || form.cinematic,
    });
    setAiBusy(false);
    if (!response.ok || !response.suggestion) {
      setAiNote({ kind: "err", text: response.error ?? "La IA no respondió." });
      return;
    }
    set("styleOverride", response.suggestion.stylePrompt);
    setAiNote({
      kind: "ok",
      text: `Matiz de estilo aplicado con ${response.suggestion.model ?? "el modelo"}. Cualquier cambio posterior en los controles actualizará el pack en tiempo real.`,
      rationale: response.suggestion.rationale,
    });
  };

  /**
   * PASO FINAL: Genera el Pack Completo con IA tomando en cuenta TODOS los parámetros
   * de los pasos 01 al 06 (género, dirección emocional, instrumentación, voz, BPM,
   * tonalidad, exclusiones y perfil creativo).
   * - Si solo hay idea/temática: crea la letra desde cero.
   * - Si hay letra y NO se marcó "Mantener la letra intacta": optimiza y mejora la letra.
   * - Si hay letra y SÍ se marcó "Mantener la letra intacta": conserva la letra intacta y estructura metatags.
   */
  const generateFullPackWithAi = async () => {
    let currentIdea = form.idea.trim();
    const hasUserLyrics = Boolean(form.lyrics.trim());

    if (!currentIdea && !hasUserLyrics) {
      currentIdea = `Una canción memorable y auténtica de ${result.presetName} con atmósfera ${effectiveMoodObj.es.toLowerCase()}`;
      set("idea", currentIdea);
      toast("Generando temática automática según el género y atmósfera seleccionados…", "info");
    }

    setAiBusy(true);
    setAiNote(null);
    const previous = aiVariants[0] ?? "";

    const isOwnLyrics = hasUserLyrics && !aiVariants.includes(form.lyrics);
    let mode: "create" | "rewrite" | "keep" = "create";
    if (hasUserLyrics) {
      if (form.keepLyrics) {
        mode = "keep";
      } else if (isOwnLyrics) {
        mode = "rewrite";
      } else {
        mode = "create";
      }
    }

    const variant = mode === "create" ? aiVariants.length + 1 : 1;
    const moodWasAuto = !form.moodId || form.moodId === "auto";
    const keyWasAuto = !form.keyScale || !form.keyScale.trim();

    const response = await composeSet({
      idea: currentIdea,
      preset: result.presetName,
      customGenre: form.customGenre,
      set: result.stylePrompt,
      stylePrompt: result.stylePrompt,
      bpm: result.bpm,
      keyScale: form.keyScale,
      musicalMode: form.musicalMode,
      mood: moodWasAuto ? "auto" : selectedMoodObj.es,
      moodAuto: moodWasAuto,
      keyAuto: keyWasAuto,
      cinematic: form.cinematic,
      vocal: [form.vocalGender, form.vocalTechnique, form.vocalAttitude].filter(Boolean).join(", "),
      productionKeywords: form.productionKeywords,
      excludeStyles: result.excludeStyles,
      profile: form.profile,
      weirdness: form.weirdness,
      styleInfluence: form.styleInfluence,
      maxMode: form.maxMode,
      vocalEntryHack: form.vocalEntryHack,
      instrumentalBridge: form.instrumentalBridge,
      keepLyrics: form.keepLyrics,
      language: form.language,
      pov: form.pov,
      existingLyrics: hasUserLyrics && mode !== "create" ? form.lyrics : "",
      mode,
      variant,
      avoid: previous,
    });
    setAiBusy(false);

    if (!response.ok || !response.suggestion) {
      setAiNote({ kind: "err", text: response.error ?? "La IA no pudo generar el pack." });
      return;
    }

    const suggestion = response.suggestion;
    if (!aiSnapshot) {
      setAiSnapshot({
        lyrics: form.lyrics,
        styleOverride: form.styleOverride,
        moodId: form.moodId,
        keyScale: form.keyScale,
      });
    }
    setAiVariants((prev) => [suggestion.lyrics, ...prev].slice(0, 5));

    setForm((prev) => {
      const resolvedMoodId =
        (!prev.moodId || prev.moodId === "auto") &&
        suggestion.suggestedMoodId &&
        MOODS.some((m) => m.id === suggestion.suggestedMoodId)
          ? suggestion.suggestedMoodId
          : prev.moodId;

      const resolvedKeyScale =
        !prev.keyScale.trim() &&
        suggestion.suggestedKeyScale &&
        KEY_SCALES.some((k) => k.value.toLowerCase() === suggestion.suggestedKeyScale!.toLowerCase())
          ? KEY_SCALES.find((k) => k.value.toLowerCase() === suggestion.suggestedKeyScale!.toLowerCase())!.value
          : prev.keyScale;

      const resolvedBpm =
        !prev.bpm.trim() && suggestion.suggestedBpm
          ? String(Math.round(suggestion.suggestedBpm))
          : prev.bpm;

      const next: CompositorForm = {
        ...prev,
        lyrics: suggestion.lyrics,
        moodId: resolvedMoodId,
        keyScale: resolvedKeyScale,
        bpm: resolvedBpm,
        // Guardamos el matiz de la IA de modo que compileSet siga recalculando en vivo si el usuario cambia controles después
        styleOverride: suggestion.styleNuance || suggestion.stylePrompt || prev.styleOverride,
      };
      const dyn = calculateDynamicParameters(next);
      next.weirdness = dyn.weirdness;
      next.styleInfluence = dyn.styleInfluence;
      return next;
    });

    const modeLabel =
      mode === "keep"
        ? "letra intacta + metatags"
        : mode === "rewrite"
          ? "optimización de letra del usuario"
          : "creación integral desde idea";

    const extraDecisions: string[] = [];
    if (moodWasAuto && suggestion.suggestedMoodId) {
      const mName = MOODS.find((m) => m.id === suggestion.suggestedMoodId)?.es ?? suggestion.suggestedMoodId;
      extraDecisions.push(`Dirección emocional elegida por la IA: ${mName}`);
    }
    if (keyWasAuto && suggestion.suggestedKeyScale) {
      extraDecisions.push(`Tonalidad determinada por la IA: ${suggestion.suggestedKeyScale}`);
    }

    setAiNote({
      kind: "ok",
      text:
        `Pack completo generado con ${suggestion.model ?? "IA"} (${modeLabel}). ` +
        "Si cambias ahora cualquier parámetro (género, emoción, voz, BPM, tonalidad o etiquetas), el pack se actualizará automáticamente en tiempo real.",
      rationale: [
        ...extraDecisions,
        ...(suggestion.lyricsNotes ? [`Estructura: ${suggestion.lyricsNotes}`] : []),
        ...(suggestion.warnings ?? []),
        ...suggestion.rationale,
      ],
    });
    toast("Pack completo generado y sincronizado.", "ok");
  };

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
          <div className="eyebrow">PRO FLOW · OPTIMIZADO PARA SUNO 6.0</div>
          <h1>
            Compositor <span className="accent-serif">Suno</span>
          </h1>
          <p className="page-head__sub">
            Convierte una idea o letra en un set de producción completo para SUNO 6.0: style prompt reactivo en
            inglés, letra estructurada con metatags, exclusiones y parámetros dinámicos.
          </p>
        </div>
        <div className="page-head__actions">
          <Link to="/suno" className="btn btn--ghost btn--sm">
            <ArrowLeft size={13} /> Catálogo
          </Link>
          <button className="btn btn--gold btn--sm" onClick={() => setMcpModalOpen(true)}>
            <Sparkles size={13} /> Generar en SUNO (1-Click MCP)
          </button>
          <button className="btn btn--soft btn--sm" onClick={exportPack}>
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
                  Sube un track que te guste: el clasificador acústico de 8 dimensiones mide balance espectral en 7
                  bandas, subdivisión rítmica real (half-time/double-time), entropía armónica, microtiming y rango
                  dinámico para detectar con precisión el género, emoción, tonalidad y perfil vocal.
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
                <button className="btn btn--gold btn--sm" onClick={() => applyReference()}>
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
                  <span className="mono">PROPUESTA PRINCIPAL</span>
                  <b>{reference.presetName}</b>
                  {reference.bpm !== null && <span className="mono">{reference.bpm} BPM</span>}
                  {reference.keyScale && <span className="mono">{reference.keyScale}</span>}
                  <span className="mono">
                    MOOD {MOODS.find((m) => m.id === reference.moodId)?.es ?? reference.moodId}
                  </span>
                </div>

                {reference.candidates && reference.candidates.length > 1 && (
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    <span className="mono" style={{ fontSize: 11, opacity: 0.75 }}>
                      CANDIDATOS DETECTADOS (clic para aplicar):
                    </span>
                    {reference.candidates.map((cand, idx) => (
                      <button
                        key={cand.presetId}
                        type="button"
                        className={`pill ${cand.presetId === reference.presetId ? "pill--active" : ""}`}
                        style={{ fontSize: 12, padding: "3px 10px" }}
                        onClick={() => {
                          setReference((prev) =>
                            prev ? { ...prev, presetId: cand.presetId, presetName: cand.presetName } : prev,
                          );
                          applyReference(cand.presetId);
                        }}
                      >
                        #{idx + 1} {cand.presetName} ({cand.confidence}%)
                      </button>
                    ))}
                  </div>
                )}

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
                <b>Idea de partida o letra</b>
                <p>
                  Escribe la historia o temática de tu canción, o pega tu propia letra. Al final del formulario podrás
                  generar el pack completo con IA integrando todos los parámetros de producción.
                </p>
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="c-idea">
                Historia, temática o idea de la canción
              </label>
              <textarea
                id="c-idea"
                className="input composer-textarea"
                rows={3}
                placeholder="Ej. una despedida en un aeropuerto a las 4 de la mañana prometiendo volver"
                value={form.idea}
                onChange={(e) => set("idea", e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="c-lyrics">
                Tu letra (opcional)
              </label>
              <textarea
                id="c-lyrics"
                className="input composer-textarea"
                rows={6}
                placeholder="Si ya tienes una letra o borrador, pégala aquí. Si la dejas vacía, la IA la escribirá al final tomando en cuenta todos los parámetros."
                value={form.lyrics}
                onChange={(e) => set("lyrics", e.target.value)}
              />
              <span className="field__hint">
                {form.lyrics.length} caracteres · máximo {SUNO_LIMITS.lyricsMaxChars}.{" "}
                {form.lyrics.trim()
                  ? form.keepLyrics
                    ? "Modo activo: tu letra se mantendrá intacta palabra por palabra."
                    : "Modo activo: al generar el pack al final, la IA optimizará y mejorará tu letra para encajar con la producción."
                  : "Si lo dejas vacío, el botón de generación al final creará la letra completa a partir de tu idea y parámetros."}
              </span>
            </div>

            <div className="form-grid">
              <div className="field">
                <label className="label" htmlFor="c-language">
                  Idioma de la letra
                </label>
                <select
                  id="c-language"
                  className="select"
                  value={form.language}
                  onChange={(e) => set("language", e.target.value)}
                >
                  {LYRIC_LANGUAGES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="field__hint">Los metatags entre corchetes siguen en inglés.</span>
              </div>
              <div className="field">
                <label className="label" htmlFor="c-pov">
                  Punto de vista
                </label>
                <select
                  id="c-pov"
                  className="select"
                  value={form.pov}
                  onChange={(e) => set("pov", e.target.value)}
                >
                  {LYRIC_POVS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="field__hint">
                  Se mantiene de principio a fin; no cambia de narrador a mitad de canción.
                </span>
              </div>
            </div>

            <label className="composer-check">
              <input
                type="checkbox"
                checked={form.keepLyrics}
                onChange={(e) => set("keepLyrics", e.target.checked)}
              />
              Mantener mi letra intacta (si no lo marcas, la IA mejorará y optimizará tu letra al generar el pack)
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
            <div className="composer-step__head" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 12 }}>
                <span className="composer-step__num mono">03</span>
                <div>
                  <b>Dirección emocional</b>
                  <p>
                    Elige el carácter interpretativo o deja que la IA lo determine según tu historia y género.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setShowMoodGuide((v) => !v)}
                style={{ flexShrink: 0 }}
              >
                <HelpCircle size={13} /> {showMoodGuide ? "Ocultar guía" : "Guía de estilos"}
              </button>
            </div>

            <div className="composer-chips">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`pill ${form.moodId === m.id ? "pill--active" : ""}`}
                  onClick={() => set("moodId", m.id)}
                  title={`${m.description} — ${m.reference}`}
                >
                  {m.es}
                </button>
              ))}
            </div>

            {/* Tarjeta de definición y referencias del estado emocional activo */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.09)",
                borderRadius: 10,
                padding: "12px 14px",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {form.moodId === "auto" ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span className="chip chip--gold" style={{ fontSize: 11 }}>
                      MODO AUTOMÁTICO IA
                    </span>
                    <b>
                      Emoción detectada en vivo: <span style={{ color: "var(--gold, #e5b84b)" }}>{effectiveMoodObj.es}</span>
                    </b>
                  </div>
                  <p style={{ margin: "4px 0", opacity: 0.9 }}>{effectiveMoodObj.description}</p>
                  <p className="mono" style={{ margin: "4px 0 0", fontSize: 11.5, opacity: 0.75 }}>
                    {effectiveMoodObj.reference}
                  </p>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: 4 }}>
                    <b>{selectedMoodObj.es}:</b> <span>{selectedMoodObj.description}</span>
                  </div>
                  <p className="mono" style={{ margin: 0, fontSize: 11.5, opacity: 0.78, color: "var(--gold, #e5b84b)" }}>
                    {selectedMoodObj.reference}
                  </p>
                </>
              )}
            </div>

            {showMoodGuide && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: 8,
                  padding: 10,
                  borderRadius: 10,
                  background: "rgba(0, 0, 0, 0.25)",
                  border: "1px solid rgba(255, 255, 255, 0.07)",
                }}
              >
                {MOODS.filter((m) => m.id !== "auto").map((m) => (
                  <div
                    key={m.id}
                    onClick={() => set("moodId", m.id)}
                    style={{
                      cursor: "pointer",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border:
                        form.moodId === m.id
                          ? "1px solid rgba(229, 184, 75, 0.6)"
                          : "1px solid rgba(255, 255, 255, 0.06)",
                      background: form.moodId === m.id ? "rgba(229, 184, 75, 0.08)" : "rgba(255, 255, 255, 0.02)",
                      fontSize: 12,
                    }}
                  >
                    <b style={{ display: "block", marginBottom: 2 }}>{m.es}</b>
                    <span style={{ display: "block", opacity: 0.82, marginBottom: 4 }}>{m.description}</span>
                    <span className="mono" style={{ fontSize: 10.5, opacity: 0.7, color: "var(--gold, #e5b84b)" }}>
                      {m.reference}
                    </span>
                  </div>
                ))}
              </div>
            )}

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
                    key={k.value}
                    type="button"
                    className={`pill ${form.productionKeywords.includes(k.value) ? "pill--active" : ""}`}
                    onClick={() => toggleIn("productionKeywords", k.value)}
                  >
                    {k.label}
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
                  Técnica vocal
                </label>
                <select
                  id="c-vt"
                  className="select"
                  value={form.vocalTechnique}
                  onChange={(e) => set("vocalTechnique", e.target.value)}
                >
                  <option value="">Sin definir</option>
                  {VOCAL_TECHNIQUES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="c-va">
                  Aptitud / Actitud vocal
                </label>
                <select
                  id="c-va"
                  className="select"
                  value={form.vocalAttitude}
                  onChange={(e) => set("vocalAttitude", e.target.value)}
                >
                  <option value="">Sin definir</option>
                  {VOCAL_ATTITUDES.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
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
                <p>
                  BPM y tonalidad son lo que Suno respeta con más consistencia. Si no conoces la tonalidad, déjala en
                  «Sin definir» para que la IA la elija por ti.
                </p>
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
                  placeholder={`Auto (${result.bpm})`}
                  inputMode="numeric"
                  value={form.bpm}
                  onChange={(e) => set("bpm", e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                />
                <span className="field__hint">Activo: {result.bpm} BPM</span>
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
                <span className="field__hint">
                  {form.keyScale ? `Fijada en ${form.keyScale}` : `Sugerida por IA/motor: ${result.keyScale}`}
                </span>
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
                    type="button"
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
              <span className="composer-step__num mono">06</span>
              <div>
                <b>Perfil creativo</b>
                <p>Ajusta cuánta libertad le das al modelo (calculado dinámicamente según género y emoción).</p>
              </div>
            </div>
            <div className="composer-profiles">
              {PROFILES.map((p) => (
                <button
                  key={p.id}
                  type="button"
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

          {/* ---- PASO FINAL: GENERAR PACK COMPLETO CON IA ---- */}
          {aiConfigured && (
            <section
              className="card composer-step"
              style={{
                border: "1px solid rgba(229, 184, 75, 0.45)",
                background: "linear-gradient(145deg, rgba(229, 184, 75, 0.09), rgba(15, 23, 42, 0.6))",
              }}
            >
              <div className="composer-step__head">
                <span className="composer-step__num mono" style={{ background: "var(--gold, #e5b84b)", color: "#111" }}>
                  IA
                </span>
                <div>
                  <b>Generar Pack Completo con IA (Letra + Estilo + Metadatos)</b>
                  <p>
                    Integra todos los parámetros configurados arriba ({result.presetName} · {result.bpm} BPM ·{" "}
                    {form.keyScale || `Tonalidad IA (${result.keyScale})`} ·{" "}
                    {form.moodId === "auto" ? `Emoción IA (${effectiveMoodObj.es})` : selectedMoodObj.es}) para
                    construir el pack definitivo de SUNO 6.0.
                  </p>
                </div>
              </div>

              <div className="composer-ai-cta" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn--gold"
                  style={{ padding: "12px 20px", fontWeight: 700, fontSize: 14 }}
                  onClick={() => void generateFullPackWithAi()}
                  disabled={aiBusy}
                >
                  {aiBusy ? <Loader2 size={15} className="composer-spin" /> : <Wand2 size={15} />}{" "}
                  {aiBusy
                    ? "Generando pack completo con IA…"
                    : form.lyrics.trim()
                      ? form.keepLyrics
                        ? "Generar Pack con IA (Manteniendo mi letra intacta)"
                        : "Generar Pack con IA (Optimizando mi letra)"
                      : aiVariants.length > 0
                        ? `Generar nueva versión del Pack con IA (${aiVariants.length + 1}ª)`
                        : "Generar Pack Completo con IA (Incluye Letra)"}
                </button>
                <span>
                  {form.lyrics.trim()
                    ? form.keepLyrics
                      ? "Se respetará tu letra palabra por palabra, añadiendo solo metatags de estructura [Verse], [Chorus], [End] y optimizando el Style Prompt."
                      : "La IA optimizará la métrica, imágenes y estructura de tu letra para encajar con todos tus parámetros de producción."
                    : "La IA escribirá la letra completa desde tu temática y ajustará la tonalidad, emoción y style prompt."}
                </span>
              </div>
            </section>
          )}
        </div>

        {/* -------------------------------- salida -------------------------------- */}
        <aside className="composer-output">
          <div className="card composer-out">
            <div className="composer-out__head">
              <span className="eyebrow">SET DE PRODUCCIÓN EN VIVO</span>
              <span className={`chip ${result.checks.fitsSuno ? "chip--emerald" : "chip--gold"}`}>
                {result.checks.fitsSuno ? "CABE EN SUNO 6.0" : "REVISAR LÍMITES"}
              </span>
            </div>

            <div className="composer-out__block">
              <div className="composer-out__row">
                <span className="mono">LYRICS / LETRA</span>
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
                <span className="mono">STYLE PROMPT</span>
                <span className="mono">
                  {result.checks.styleChars}/{result.checks.styleLimit}
                </span>
              </div>
              <div className="composer-meter">
                <span style={{ width: `${stylePct}%` }} />
              </div>
              <p className="composer-out__text">{result.stylePrompt || "—"}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn--ghost btn--sm" onClick={() => copy(result.stylePrompt, "Style prompt")}>
                  <ClipboardCopy size={12} /> Copiar
                </button>
                {form.styleOverride && (
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => set("styleOverride", "")}
                    title="Quitar el matiz de IA y dejar únicamente las partes base del preset"
                  >
                    <X size={12} /> Limpiar matiz IA
                  </button>
                )}
              </div>
            </div>

            <div className="composer-out__block">
              <div className="composer-out__row">
                <span className="mono">EXCLUDE STYLES</span>
                <span className="mono">{result.checks.excludeChars}</span>
              </div>
              <p className="composer-out__text">{result.excludeStyles || "—"}</p>
              {result.excludeStyles && (
                <button className="btn btn--ghost btn--sm" onClick={() => copy(result.excludeStyles, "Exclude styles")}>
                  <ClipboardCopy size={12} /> Copiar
                </button>
              )}
            </div>

            <div className="composer-out__block">
              <div className="composer-out__row">
                <span className="mono">PARÁMETROS DINÁMICOS</span>
              </div>
              <div className="composer-params mono">
                <span>WEIRDNESS {result.weirdness}</span>
                <span>INFLUENCE {result.styleInfluence}</span>
                <span>{result.bpm} BPM</span>
                <span>{result.keyScale}</span>
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
              <button
                className="btn btn--gold"
                style={{ gridColumn: "1 / -1", justifyContent: "center", padding: "11px 16px", fontWeight: 600 }}
                onClick={() => setMcpModalOpen(true)}
              >
                <Sparkles size={15} /> Generar en mi SUNO (1-Click MCP)
              </button>
              <button className="btn btn--primary" onClick={exportPack}>
                <Download size={14} /> Exportar .sunopack.json
              </button>
              <button className="btn btn--soft btn--sm" onClick={exportText}>
                Descargar texto
              </button>
              {aiConfigured && (
                <button className="btn btn--gold btn--sm" onClick={() => void askAi()} disabled={aiBusy}>
                  {aiBusy ? <Loader2 size={13} className="composer-spin" /> : <Sparkles size={13} />}{" "}
                  {aiBusy ? "Consultando…" : "Pulir solo Style Prompt"}
                </button>
              )}
            </div>

            {aiNote && (
              <div className={`composer-ai ${aiNote.kind === "err" ? "is-err" : ""}`}>
                <b>{aiNote.kind === "err" ? "La IA no pudo responder" : "Pack IA sincronizado"}</b>
                <p>{aiNote.text}</p>
                {aiNote.rationale && aiNote.rationale.length > 0 && (
                  <ul>
                    {aiNote.rationale.slice(0, 6).map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                )}
                {aiNote.kind === "ok" && (
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        lyrics: aiSnapshot?.lyrics ?? prev.lyrics,
                        styleOverride: aiSnapshot?.styleOverride ?? "",
                        moodId: aiSnapshot?.moodId ?? prev.moodId,
                        keyScale: aiSnapshot?.keyScale ?? prev.keyScale,
                      }));
                      setAiSnapshot(null);
                      setAiNote(null);
                    }}
                  >
                    Deshacer cambios de la IA
                  </button>
                )}
              </div>
            )}
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
              <b>Sincronización en tiempo real</b>
            </div>
            <p>
              Cualquier cambio que realices en el género, emoción, voz, etiquetas, BPM, tonalidad o casillas actualiza
              instantáneamente el <b>Style Prompt</b>, la <b>Letra</b> y los <b>Parámetros de SUNO 6.0</b>.
            </p>
          </div>
        </aside>
      </div>

      <SunoMcpModal open={mcpModalOpen} onClose={() => setMcpModalOpen(false)} set={result} />
    </div>
  );
}
