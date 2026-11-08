/**
 * ============================================================================
 *  TRADUCTOR Y SINCRONIZADOR QUIRÚRGICO DE STYLE PROMPTS (ES <-> EN)
 * ============================================================================
 *  © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 *
 *  Permite a los usuarios de SoundLab AI inspeccionar y editar el Style Prompt
 *  en español con terminología de producción musical precisa, sincronizando
 *  los cambios puntuales en tiempo real hacia la versión en inglés requerida
 *  por los modelos de SUNO (v6.0 / v4).
 * ============================================================================
 */

export interface TranslationPair {
  readonly es: string;
  readonly en: string;
}

/**
 * Catálogo canónico de pares de traducción para producción musical y SUNO.
 * ORDEN IMPORTANTE: Frases compuestas más específicas van primero para evitar
 * sustituciones parciales prematuras.
 */
export const MUSICAL_DICTIONARY: readonly TranslationPair[] = [
  // --- Modos de acondicionamiento técnico (Suno) ---
  { es: "modo max", en: "[is_mode_max]" },
  { es: "calidad máxima", en: "[quality_max_max]" },
  { es: "calidad maxima", en: "[quality_max_max]" },
  { es: "realismo máximo", en: "[realness_max_max]" },
  { es: "realismo maximo", en: "[realness_max_max]" },
  { es: "instrumentos reales", en: "[real_instrument_max_max]" },

  // --- Géneros y fusiones latinas / globales ---
  { es: "cumbia norteña peruana moderna", en: "modern peruvian cumbia norteña" },
  { es: "cumbia nortena peruana moderna", en: "modern peruvian cumbia norteña" },
  { es: "cumbia norteña peruana", en: "peruvian cumbia norteña" },
  { es: "cumbia nortena peruana", en: "peruvian cumbia norteña" },
  { es: "cumbia norteña", en: "cumbia norteña" },
  { es: "cumbia nortena", en: "cumbia norteña" },
  { es: "cumbia chicha psicodélica", en: "psychedelic peruvian cumbia chicha" },
  { es: "cumbia chicha psicodelica", en: "psychedelic peruvian cumbia chicha" },
  { es: "cumbia chicha peruana", en: "peruvian cumbia chicha" },
  { es: "cumbia chicha", en: "cumbia chicha" },
  { es: "cumbia sanjuanera andina", en: "andean cumbia sanjuanera" },
  { es: "cumbia sanjuanera", en: "cumbia sanjuanera" },
  { es: "cumbia villera", en: "cumbia villera" },
  { es: "cumbia colombiana", en: "colombian cumbia" },
  { es: "cumbia pop", en: "cumbia pop" },
  { es: "salsa dura clásica", en: "classic salsa dura" },
  { es: "salsa dura clasica", en: "classic salsa dura" },
  { es: "salsa dura", en: "salsa dura" },
  { es: "salsa romántica", en: "romantic salsa" },
  { es: "salsa romantica", en: "romantic salsa" },
  { es: "bachata tradicional", en: "traditional bachata" },
  { es: "bachata moderna", en: "modern bachata" },
  { es: "bachata sensual", en: "sensual bachata" },
  { es: "festejo afroperuano", en: "afro-peruvian festejo" },
  { es: "huayno moderno", en: "modern andean huayno" },
  { es: "vals criollo peruano", en: "peruvian vals criollo" },
  { es: "vals criollo", en: "vals criollo" },
  { es: "trap latino oscuro", en: "dark latin trap" },
  { es: "trap latino", en: "latin trap" },
  { es: "reggaeton vieja escuela", en: "old school reggaeton" },
  { es: "reggaeton contemporáneo", en: "modern reggaeton" },
  { es: "reggaeton contemporaneo", en: "modern reggaeton" },
  { es: "reggaeton perreo", en: "perreo reggaeton" },
  { es: "indie rock enérgico", en: "energetic indie rock" },
  { es: "indie rock energico", en: "energetic indie rock" },
  { es: "indie rock melancólico", en: "melancholic indie rock" },
  { es: "indie rock melancolico", en: "melancholic indie rock" },
  { es: "pop acústico íntimo", en: "intimate acoustic pop" },
  { es: "pop acustico intimo", en: "intimate acoustic pop" },
  { es: "synthwave ochentero", en: "80s synthwave" },
  { es: "bolero nocturno", en: "nighttime bolero" },
  { es: "bossa nova clásica", en: "classic bossa nova" },
  { es: "bossa nova clasica", en: "classic bossa nova" },

  // --- Instrumentos y secciones orquestales ---
  { es: "sección de metales brillante", en: "bright brass section" },
  { es: "seccion de metales brillante", en: "bright brass section" },
  { es: "sección de metales", en: "brass section" },
  { es: "seccion de metales", en: "brass section" },
  { es: "sección de cuerdas", en: "string section" },
  { es: "seccion de cuerdas", en: "string section" },
  { es: "cuarteto de cuerdas", en: "string quartet" },
  { es: "cuerdas orquestales frondosas", en: "lush orchestral strings" },
  { es: "cuerdas orquestales", en: "orchestral strings" },
  { es: "trompetas y trombones", en: "trumpets and trombones" },
  { es: "trompetas brillantes", en: "bright trumpets" },
  { es: "trompetas", en: "trumpets" },
  { es: "trompeta", en: "trumpet" },
  { es: "trombones con cuerpo", en: "heavy trombones" },
  { es: "trombones", en: "trombones" },
  { es: "trombón", en: "trombone" },
  { es: "trombon", en: "trombone" },
  { es: "saxofón tenor", en: "tenor saxophone" },
  { es: "saxofon tenor", en: "tenor saxophone" },
  { es: "saxofón alto", en: "alto saxophone" },
  { es: "saxofon alto", en: "alto saxophone" },
  { es: "solo de saxofón emotivo", en: "emotional saxophone solo" },
  { es: "solo de saxofón", en: "saxophone solo" },
  { es: "solo de saxofon", en: "saxophone solo" },
  { es: "solo de saxo", en: "sax solo" },
  { es: "saxofón", en: "saxophone" },
  { es: "saxofon", en: "saxophone" },
  { es: "saxo", en: "sax" },
  { es: "clarinete", en: "clarinet" },
  { es: "flauta traversa", en: "flute" },
  { es: "flauta", en: "flute" },

  // --- Guitarras y Bajos ---
  { es: "guitarra eléctrica limpia con chorus", en: "clean electric guitar with chorus" },
  { es: "guitarra electrica limpia con chorus", en: "clean electric guitar with chorus" },
  { es: "guitarra eléctrica limpia", en: "clean electric guitar" },
  { es: "guitarra electrica limpia", en: "clean electric guitar" },
  { es: "guitarra eléctrica con distorsión", en: "distorted electric guitar" },
  { es: "guitarra electrica con distorsion", en: "distorted electric guitar" },
  { es: "guitarras eléctricas distorsionadas", en: "distorted electric guitars" },
  { es: "guitarras electricas distorsionadas", en: "distorted electric guitars" },
  { es: "solo de guitarra eléctrica", en: "electric guitar solo" },
  { es: "solo de guitarra electrica", en: "electric guitar solo" },
  { es: "solo de guitarra", en: "guitar solo" },
  { es: "guitarra eléctrica", en: "electric guitar" },
  { es: "guitarra electrica", en: "electric guitar" },
  { es: "guitarras eléctricas", en: "electric guitars" },
  { es: "guitarras electricas", en: "electric guitars" },
  { es: "guitarra acústica", en: "acoustic guitar" },
  { es: "guitarra acustica", en: "acoustic guitar" },
  { es: "guitarras acústicas", en: "acoustic guitars" },
  { es: "guitarras acusticas", en: "acoustic guitars" },
  { es: "guitarra de cuerdas de nailon", en: "nylon string guitar" },
  { es: "guitarra criolla peruana", en: "peruvian criollo guitar" },
  { es: "guitarra criolla", en: "peruvian criollo guitar" },
  { es: "guitarra clásica", en: "classical guitar" },
  { es: "guitarra clasica", en: "classical guitar" },
  { es: "línea de bajo con groove", en: "groovy bassline" },
  { es: "linea de bajo con groove", en: "groovy bassline" },
  { es: "línea de bajo", en: "bassline" },
  { es: "linea de bajo", en: "bassline" },
  { es: "bajo eléctrico", en: "electric bass" },
  { es: "bajo electrico", en: "electric bass" },
  { es: "bajo acústico", en: "acoustic bass" },
  { es: "bajo acustico", en: "acoustic bass" },
  { es: "bajo 808 profundo", en: "deep 808 bass" },
  { es: "bajo 808 saturado", en: "distorted 808 bass" },
  { es: "bajo 808", en: "808 bass" },
  { es: "bajo sintetizado", en: "synth bass" },
  { es: "bajo con slap", en: "slap bass" },
  { es: "bajo", en: "bass" },

  // --- Percusión y Ritmo ---
  { es: "timbales y cencerro festivos", en: "rollicking timbales and cowbell" },
  { es: "timbales y cencerro", en: "timbales and cowbell" },
  { es: "timbales nítidos", en: "crisp timbales" },
  { es: "timbales nitidos", en: "crisp timbales" },
  { es: "timbales", en: "timbales" },
  { es: "cencerro rítmico", en: "rhythmic cowbell" },
  { es: "cencerro ritmico", en: "rhythmic cowbell" },
  { es: "cencerro", en: "cowbell" },
  { es: "congas y bongós", en: "congas and bongos" },
  { es: "congas y bongos", en: "congas and bongos" },
  { es: "congas", en: "congas" },
  { es: "bongós", en: "bongos" },
  { es: "bongos", en: "bongos" },
  { es: "güiro y maracas", en: "guiro and maracas" },
  { es: "guiro y maracas", en: "guiro and maracas" },
  { es: "güiro", en: "guiro" },
  { es: "guiro", en: "guiro" },
  { es: "maracas", en: "maracas" },
  { es: "cajón peruano", en: "peruvian cajon" },
  { es: "cajon peruano", en: "peruvian cajon" },
  { es: "cajón", en: "cajon" },
  { es: "cajon", en: "cajon" },
  { es: "acordeón nostálgico", en: "nostalgic accordion" },
  { es: "acordeon nostalgico", en: "nostalgic accordion" },
  { es: "acordeón romántico", en: "romantic accordion" },
  { es: "acordeon romantico", en: "romantic accordion" },
  { es: "acordeón", en: "accordion" },
  { es: "acordeon", en: "accordion" },
  { es: "batería acústica", en: "acoustic drums" },
  { es: "bateria acustica", en: "acoustic drums" },
  { es: "batería electrónica", en: "electronic drums" },
  { es: "bateria electronica", en: "electronic drums" },
  { es: "batería con pegada", en: "punchy drums" },
  { es: "bateria con pegada", en: "punchy drums" },
  { es: "batería contundente", en: "heavy drums" },
  { es: "bateria contundente", en: "heavy drums" },
  { es: "batería", en: "drums" },
  { es: "bateria", en: "drums" },
  { es: "caja y bombo", en: "kick and snare" },
  { es: "bombo profundo", en: "deep kick" },
  { es: "caja apretada", en: "tight snare" },
  { es: "hi-hats nítidos", en: "crisp hi-hats" },
  { es: "hi-hats nitidos", en: "crisp hi-hats" },
  { es: "redobles de hi-hat", en: "hi-hat rolls" },
  { es: "percusión latina", en: "latin percussion" },
  { es: "percusion latina", en: "latin percussion" },
  { es: "percusión", en: "percussion" },
  { es: "percusion", en: "percussion" },

  // --- Teclados y Sintetizadores ---
  { es: "piano acústico", en: "acoustic piano" },
  { es: "piano acustico", en: "acoustic piano" },
  { es: "piano de cola", en: "grand piano" },
  { es: "piano eléctrico rhodes", en: "rhodes electric piano" },
  { es: "piano electrico rhodes", en: "rhodes electric piano" },
  { es: "piano eléctrico", en: "electric piano" },
  { es: "piano electrico", en: "electric piano" },
  { es: "piano", en: "piano" },
  { es: "sintetizadores retro analógicos", en: "retro analog synths" },
  { es: "sintetizadores retro analogicos", en: "retro analog synths" },
  { es: "sintetizador analógico", en: "analog synthesizer" },
  { es: "sintetizador analogico", en: "analog synthesizer" },
  { es: "sintetizadores analógicos", en: "analog synths" },
  { es: "sintetizadores analogicos", en: "analog synths" },
  { es: "sintetizador polifónico", en: "polyphonic synth" },
  { es: "sintetizador polifonico", en: "polyphonic synth" },
  { es: "sintetizadores", en: "synthesizers" },
  { es: "sintetizador", en: "synthesizer" },
  { es: "pads atmosféricos", en: "atmospheric pads" },
  { es: "pads atmosfericos", en: "atmospheric pads" },
  { es: "pads celestiales", en: "celestial pads" },
  { es: "pads ambientales", en: "ambient pads" },
  { es: "pads envolventes", en: "enveloping pads" },
  { es: "pads", en: "pads" },

  // --- Voces y Técnicas Vocales ---
  { es: "dúo, voz masculina y femenina", en: "duet, male and female vocals" },
  { es: "duo, voz masculina y femenina", en: "duet, male and female vocals" },
  { es: "dúo vocal", en: "vocal duet" },
  { es: "duo vocal", en: "vocal duet" },
  { es: "voz masculina y femenina", en: "male and female vocals" },
  { es: "voz masculina", en: "male vocals" },
  { es: "voz femenina", en: "female vocals" },
  { es: "voces masculinas", en: "male vocals" },
  { es: "voces femeninas", en: "female vocals" },
  { es: "instrumental, sin voces", en: "instrumental, no vocals" },
  { es: "sin voces", en: "no vocals" },
  { es: "interpretación aireada y suave", en: "breathy, airy delivery" },
  { es: "interpretacion aireada y suave", en: "breathy, airy delivery" },
  { es: "voz aireada y suave", en: "breathy, airy delivery" },
  { es: "voz aireada", en: "breathy vocals" },
  { es: "belting potente con proyección", en: "powerful belting" },
  { es: "belting potente con proyeccion", en: "powerful belting" },
  { es: "belting potente", en: "powerful belting" },
  { es: "tono rasgado y texturizado", en: "raspy, textured tone" },
  { es: "voz rasgada y texturizada", en: "raspy, textured tone" },
  { es: "voz rasgada", en: "raspy vocals" },
  { es: "falsete con voz de cabeza suave", en: "falsetto with soft head voice" },
  { es: "falsete suave", en: "soft falsetto" },
  { es: "falsete", en: "falsetto" },
  { es: "hablado íntimo", en: "spoken-word intimacy" },
  { es: "hablado intimo", en: "spoken-word intimacy" },
  { es: "armonías en capas", en: "layered harmonies" },
  { es: "armonias en capas", en: "layered harmonies" },
  { es: "armonías vocales", en: "vocal harmonies" },
  { es: "armonias vocales", en: "vocal harmonies" },
  { es: "vocal chops y pitched", en: "chopped and pitched vocals" },
  { es: "vocal chops", en: "vocal chops" },
  { es: "voz limpia y al frente", en: "clean and forward vocals" },
  { es: "voz limpia", en: "clean vocals" },
  { es: "interpretación segura", en: "confident delivery" },
  { es: "interpretacion segura", en: "confident delivery" },
  { es: "interpretación vulnerable", en: "vulnerable delivery" },
  { es: "interpretacion vulnerable", en: "vulnerable delivery" },
  { es: "interpretación agresiva", en: "aggressive delivery" },
  { es: "interpretacion agresiva", en: "aggressive delivery" },
  { es: "interpretación soñadora", en: "dreamy delivery" },
  { es: "interpretacion sonadora", en: "dreamy delivery" },
  { es: "interpretación distante", en: "detached delivery" },
  { es: "interpretacion distante", en: "detached delivery" },
  { es: "interpretación juguetona", en: "playful delivery" },
  { es: "interpretacion juguetona", en: "playful delivery" },
  { es: "interpretación solemne", en: "solemn delivery" },
  { es: "interpretacion solemne", en: "solemn delivery" },
  { es: "autotune suave", en: "subtle autotune" },
  { es: "autotune marcado", en: "heavy autotune" },
  { es: "sin autotune", en: "natural vocals, no autotune" },

  // --- Emoción y Atmósfera ---
  { es: "onírico, hipnótico y flotante", en: "dreamy, hypnotic and floating" },
  { es: "onirico, hipnotico y flotante", en: "dreamy, hypnotic and floating" },
  { es: "onírico y flotante", en: "dreamy and floating" },
  { es: "onirico y flotante", en: "dreamy and floating" },
  { es: "onírico", en: "dreamy" },
  { es: "onirico", en: "dreamy" },
  { es: "oscuro, denso y pesado", en: "dark, brooding and heavy" },
  { es: "oscuro y denso", en: "dark and brooding" },
  { es: "oscuro", en: "dark" },
  { es: "eufórico y optimista", en: "uplifting and euphoric" },
  { es: "euforico y optimista", en: "uplifting and euphoric" },
  { es: "eufórico", en: "uplifting and euphoric" },
  { es: "euforico", en: "uplifting and euphoric" },
  { es: "nostálgico y agridulce", en: "nostalgic and bittersweet" },
  { es: "nostalgico y agridulce", en: "nostalgic and bittersweet" },
  { es: "nostálgico", en: "nostalgic" },
  { es: "nostalgico", en: "nostalgic" },
  { es: "agresivo y contundente", en: "aggressive and confrontational" },
  { es: "agresivo", en: "aggressive" },
  { es: "etéreo e ingrávido", en: "ethereal and weightless" },
  { es: "etereo e ingravido", en: "ethereal and weightless" },
  { es: "etéreo", en: "ethereal" },
  { es: "etereo", en: "ethereal" },
  { es: "íntimo y cercano", en: "intimate and close-miked" },
  { es: "intimo y cercano", en: "intimate and close-miked" },
  { es: "íntimo", en: "intimate" },
  { es: "intimo", en: "intimate" },
  { es: "melancólico y contenido", en: "melancholic and restrained" },
  { es: "melancolico y contenido", en: "melancholic and restrained" },
  { es: "melancólico", en: "melancholic" },
  { es: "melancolico", en: "melancholic" },
  { es: "festivo y alegre", en: "festive and joyful" },
  { es: "festivo", en: "festive" },
  { es: "bailable y animado", en: "danceable and lively" },
  { es: "bailable", en: "danceable" },
  { es: "envolvente", en: "immersive" },
  { es: "romántico", en: "romantic" },
  { es: "romantico", en: "romantic" },
  { es: "sensual", en: "sensual" },
  { es: "calma reflexiva", en: "thoughtful calm" },

  // --- Producción, Acústica y Calidad ---
  { es: "producción cinematográfica", en: "cinematic production" },
  { es: "produccion cinematografica", en: "cinematic production" },
  { es: "mezcla seca y directa", en: "dry mix" },
  { es: "mezcla seca", en: "dry mix" },
  { es: "reverb amplia y profunda", en: "reverb heavy" },
  { es: "reverb amplia", en: "lush reverb" },
  { es: "reverb con compuerta", en: "gated reverb" },
  { es: "compresión sidechain", en: "sidechain compression" },
  { es: "compresion sidechain", en: "sidechain compression" },
  { es: "saturación de cinta analógica", en: "tape saturation" },
  { es: "saturacion de cinta analogica", en: "tape saturation" },
  { es: "saturación de cinta", en: "tape saturation" },
  { es: "saturacion de cinta", en: "tape saturation" },
  { es: "calidez analógica", en: "warm analog warmth" },
  { es: "calidez analogica", en: "warm analog warmth" },
  { es: "imagen estéreo amplia", en: "wide stereo image" },
  { es: "imagen estereo amplia", en: "wide stereo image" },
  { es: "textura lo-fi vintage", en: "lo-fi texture" },
  { es: "textura lo-fi", en: "lo-fi texture" },
  { es: "máster de radio", en: "radio master" },
  { es: "master de radio", en: "radio master" },
  { es: "acabado comercial", en: "commercial polish" },
  { es: "grabación audiófila", en: "audiophile recording" },
  { es: "grabacion audiofila", en: "audiophile recording" },
  { es: "sensación en vivo", en: "live recording feel" },
  { es: "sensacion en vivo", en: "live recording feel" },
  { es: "en vivo", en: "live feel" },
  { es: "tempo animado", en: "upbeat tempo" },
  { es: "tempo rápido", en: "fast tempo" },
  { es: "tempo rapido", en: "fast tempo" },
  { es: "tempo lento", en: "slow tempo" },
  { es: "tempo medio", en: "mid tempo" },
  { es: "ritmo sincopado", en: "syncopated rhythm" },
  { es: "calidad de estudio", en: "studio quality" },
  { es: "mezcla limpia", en: "clean mix" },

  // --- Tonalidades (Escalas Mayores y Menores) ---
  { es: "en do sostenido mayor", en: "in C# major" },
  { es: "en do sostenido menor", en: "in C# minor" },
  { es: "en do mayor", en: "in C major" },
  { es: "en do menor", en: "in C minor" },
  { es: "en re sostenido mayor", en: "in D# major" },
  { es: "en re sostenido menor", en: "in D# minor" },
  { es: "en re bemol mayor", en: "in Db major" },
  { es: "en re bemol menor", en: "in Db minor" },
  { es: "en re mayor", en: "in D major" },
  { es: "en re menor", en: "in D minor" },
  { es: "en mi bemol mayor", en: "in Eb major" },
  { es: "en mi bemol menor", en: "in Eb minor" },
  { es: "en mi mayor", en: "in E major" },
  { es: "en mi menor", en: "in E minor" },
  { es: "en fa sostenido mayor", en: "in F# major" },
  { es: "en fa sostenido menor", en: "in F# minor" },
  { es: "en fa mayor", en: "in F major" },
  { es: "en fa menor", en: "in F minor" },
  { es: "en sol sostenido mayor", en: "in G# major" },
  { es: "en sol sostenido menor", en: "in G# minor" },
  { es: "en sol bemol mayor", en: "in Gb major" },
  { es: "en sol mayor", en: "in G major" },
  { es: "en sol menor", en: "in G minor" },
  { es: "en la sostenido mayor", en: "in A# major" },
  { es: "en la sostenido menor", en: "in A# minor" },
  { es: "en la bemol mayor", en: "in Ab major" },
  { es: "en la bemol menor", en: "in Ab minor" },
  { es: "en la mayor", en: "in A major" },
  { es: "en la menor", en: "in A minor" },
  { es: "en si bemol mayor", en: "in Bb major" },
  { es: "en si bemol menor", en: "in Bb minor" },
  { es: "en si mayor", en: "in B major" },
  { es: "en si menor", en: "in B minor" },

  // Sin prefijo "en"
  { es: "do mayor", en: "C major" },
  { es: "do menor", en: "C minor" },
  { es: "re mayor", en: "D major" },
  { es: "re menor", en: "D minor" },
  { es: "mi mayor", en: "E major" },
  { es: "mi menor", en: "E minor" },
  { es: "fa mayor", en: "F major" },
  { es: "fa menor", en: "F minor" },
  { es: "sol mayor", en: "G major" },
  { es: "sol menor", en: "G minor" },
  { es: "la mayor", en: "A major" },
  { es: "la menor", en: "A minor" },
  { es: "si mayor", en: "B major" },
  { es: "si menor", en: "B minor" },

  // --- Modos musicales ---
  { es: "modo dórico", en: "Dorian mode" },
  { es: "modo dorico", en: "Dorian mode" },
  { es: "modo frigio", en: "Phrygian mode" },
  { es: "modo lidio", en: "Lydian mode" },
  { es: "modo mixolidio", en: "Mixolydian mode" },
  { es: "modo locrio", en: "Locrian mode" },

  // --- Palabras sueltas comunes ---
  { es: "evocando", en: "evoking" },
  { es: "acústico", en: "acoustic" },
  { es: "acustico", en: "acoustic" },
  { es: "eléctrico", en: "electric" },
  { es: "electrico", en: "electric" },
  { es: "clásico", en: "classic" },
  { es: "clasico", en: "classic" },
  { es: "moderno", en: "modern" },
  { es: "limpio", en: "clean" },
  { es: "brillante", en: "bright" },
  { es: "cálido", en: "warm" },
  { es: "calido", en: "warm" },
  { es: "pesado", en: "heavy" },
  { es: "suave", en: "soft" },
  { es: "potente", en: "punchy" },
  { es: "rápido", en: "fast" },
  { es: "rapido", en: "fast" },
  { es: "lento", en: "slow" },
  { es: "espacioso", en: "spacious" },
];

/**
 * Escapa caracteres especiales para usar en RegExp.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Traduce un segmento o texto completo de ESPAÑOL a INGLÉS para SUNO.
 * Mantiene intactos términos que ya están en inglés (como 'chorus', 'reverb', 'BPM', etc.)
 * y etiquetas técnicas.
 */
export function translateEsToEn(esText: string): string {
  if (!esText || !esText.trim()) return "";

  let result = esText.trim();

  // 1. Reemplazo de frases y pares canónicos (ordenados de más largos a más cortos)
  for (const { es, en } of MUSICAL_DICTIONARY) {
    // Buscamos con límites de palabra o puntuación para evitar colisiones
    const pattern = new RegExp(`(^|[,\\s;:.–—-])${escapeRegex(es)}($|[,\\s;:.–—-])`, "gi");
    result = result.replace(pattern, (_match, prefix, suffix) => `${prefix}${en}${suffix}`);
  }

  // 2. Normalización de patrones de BPM (ej. "120 bpm" -> "120 BPM")
  result = result.replace(/(\d+)\s*bpm\b/gi, "$1 BPM");

  // 3. Normalización de formato de tonalidades sueltas si no quedaron con prefijo
  result = result.replace(/\ben\s+([A-G][#b]?)\s+(major|minor)\b/gi, "in $1 $2");

  // 4. Limpieza de espacios dobles y comas consecutivas
  result = result
    .replace(/\s*,\s*,+/g, ",")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .trim();

  return result;
}

/**
 * Traduce un segmento o texto completo de INGLÉS a ESPAÑOL.
 * Útil para inicializar o sincronizar la pestaña editable en español.
 */
export function translateEnToEs(enText: string): string {
  if (!enText || !enText.trim()) return "";

  let result = enText.trim();

  // Pares ordenados por longitud decreciente del término en inglés
  const sortedByEn = [...MUSICAL_DICTIONARY].sort((a, b) => b.en.length - a.en.length);

  for (const { es, en } of sortedByEn) {
    const pattern = new RegExp(`(^|[,\\s;:.–—-])${escapeRegex(en)}($|[,\\s;:.–—-])`, "gi");
    result = result.replace(pattern, (_match, prefix, suffix) => `${prefix}${es}${suffix}`);
  }

  // Normalización de BPM
  result = result.replace(/(\d+)\s*BPM\b/g, "$1 BPM");

  // Normalización de espacios y comas
  result = result
    .replace(/\s*,\s*,+/g, ",")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .trim();

  return result;
}
