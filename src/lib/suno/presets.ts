/**
 * ============================================================================
 *  PRESETS DE GÉNERO — catálogo canónico del compositor
 * ============================================================================
 *  © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 *
 *  Portados del motor original (Moi-Suno · src/types.ts). Cada preset incluye
 *  un **style prompt base ya optimizado** en inglés, el rango de BPM real, la
 *  instrumentación característica y exclusiones sugeridas. El compositor usa
 *  ese texto como columna vertebral y le superpone las decisiones del usuario:
 *  así se conserva el conocimiento de género en lugar de recomponerlo desde
 *  cero en cada consulta.
 * ============================================================================
 */

export interface SunoPreset {
  id: string;
  name: string;
  group: string;
  /** Descripción en español para la interfaz. */
  description: string;
  /** Style prompt base optimizado (en inglés). */
  styleBase: string;
  bpmMin: number;
  bpmMax: number;
  /** Etiqueta original del BPM (puede incluir matices como «Double»). */
  bpmLabel: string;
  instruments: string[];
  /** Ids de EXCLUSIONS sugeridos para este género. */
  defaultExclusions: string[];
  /** Indicación de estructura para la letra. */
  structureHint: string;
}

const p = (
  id: string,
  name: string,
  group: string,
  description: string,
  styleBase: string,
  bpmMin: number,
  bpmMax: number,
  bpmLabel: string,
  instruments: string[],
  defaultExclusions: string[],
  structureHint: string,
): SunoPreset => ({
  id,
  name,
  group,
  description,
  styleBase,
  bpmMin,
  bpmMax,
  bpmLabel,
  instruments,
  defaultExclusions,
  structureHint,
});

export const SUNO_PRESETS: SunoPreset[] = [
  p(
    "cumbia-peruana",
    "Cumbia Peruana (Chicha)",
    "Tropical andino",
    "Sabor tropical-psicodélico. Fusión de cumbia peruana de los 70.",
    "70s Peruvian Cumbia, Chicha music, vintage psychedelic electric guitar with wah-wah and delay, Farfisa organ, heavy timbales, rhythmic cowbell, groovy bassline, Andes tropical fusion",
    95,
    105,
    "95 – 105",
    ["Electric Guitar", "Wah-wah", "Farfisa Organ", "Timbales", "Cowbell"],
    ["metal", "orchestral"],
    "Intro de timbales y guitarra con wah; coros repetitivos y respuesta de órgano.",
  ),
  p(
    "cumbia-sanjuanera",
    "Cumbia Sanjuanera",
    "Tropical andino",
    "Tono alegre y festivo del norte y la sierra. Acordeón y ritmo rápido.",
    "Peruvian Cumbia Sanjuanera, fast cumbia beat, bright accordion melodies, synthesized brass hits, energetic timbales, festive atmosphere, catchy chorus, traditional Piura style",
    135,
    145,
    "135 – 145",
    ["Accordion", "Synthesizer", "Timbales", "Electric Guitar"],
    ["metal", "orchestral"],
    "Arranque festivo con acordeón; estribillo que se corea desde la primera escucha.",
  ),
  p(
    "cumbia-nortena",
    "Cumbia Norteña",
    "Tropical andino",
    "Sonido moderno del norte peruano. Vientos potentes y voz romántica.",
    "Modern Peruvian Cumbia Norteña, bright brass section, trumpets and trombones, clean electric guitar chords, melodic and romantic vocals, punchy timbales, professional slick production",
    125,
    135,
    "125 – 135",
    ["Trumpets", "Electric Guitar", "Timbales", "Electric Bass"],
    ["metal", "trap"],
    "Vientos al frente desde la intro; estribillo romántico y repetible.",
  ),
  p(
    "cumbia-limena",
    "Cumbia Limeña",
    "Tropical andino",
    "Elegancia y sabor de la capital. Fusión criolla-tropical.",
    "Peruvian Cumbia Limeña, urban tropical sound, smooth piano rhythms, synchronized brass section, clean production, sophisticated vocal harmonies, classic Lima style cumbia",
    120,
    130,
    "120 – 130",
    ["Piano", "Trumpets", "Electric Bass", "Congas"],
    ["metal", "trap"],
    "Piano y vientos sincronizados; harmonías vocales en el estribillo.",
  ),
  p(
    "rock",
    "Pop-Rock Alternativo",
    "Rock",
    "Energía e impacto estructural. Sonido alternativo moderno.",
    "Modern Alternative Rock, Pop-Rock, driving electric guitars, power chords, anthemic, passionate male vocals, punchy drums, crisp production, melodic hooks",
    120,
    135,
    "120 – 135",
    ["Electric Guitar", "Drum Kit", "Electric Bass", "Synthesizer"],
    ["trap", "autotune"],
    "Intro de guitarra limpia que rompe en distorsión; estribillo con coros de estadio.",
  ),
  p(
    "vals",
    "Vals Criollo",
    "Tradicional peruana",
    "Tradición y sentimiento puro. Voz femenina elegante.",
    "Peruvian Vals Criollo, traditional, trio of acoustic guitars, expert requinto play, Peruvian Cajon, nostalgic, elegant poetical lyrics, 3/4 time signature",
    60,
    75,
    "60 – 75",
    ["Acoustic Guitar", "Requinto", "Cajón Peruano"],
    ["edm", "trap", "autotune"],
    "Compás de 3/4; requinto que responde a la voz y despedida con cajón.",
  ),
  p(
    "bolero",
    "Bolero Romántico",
    "Tradicional latina",
    "Intimidad y elegancia clásica. Voz masculina aterciopelada.",
    "Classic Latin Bolero, romantic, soft acoustic guitar, intimate requinto solo, gentle bongos, subtle maracas, upright bass, 4/4 slow tempo",
    70,
    85,
    "70 – 85",
    ["Bongos", "Maracas", "Upright Bass", "Acoustic Guitar"],
    ["edm", "trap", "metal"],
    "Entrada íntima de guitarra; el bolero crece en el segundo verso, nunca en el primero.",
  ),
  p(
    "balada",
    "Balada Romántica",
    "Romántica",
    "Poder vocal y orquestación. Piano de cola y cuerdas cinematográficas.",
    "80s/90s Latin Power Ballad, grand piano, cinematic string section, emotional crescendo, dramatic male vocals, anthemic chorus",
    65,
    75,
    "65 – 75",
    ["Grand Piano", "Strings Orchestration", "Drums"],
    ["edm", "trap"],
    "Piano solo en el verso 1, cuerdas entrando en el 2, clímax en el último coro.",
  ),
  p(
    "ranchera",
    "Ranchera Tradicional",
    "Regional mexicana",
    "Mariachi, bravura y grito mexicano. Festiva y apasionada.",
    "Traditional Mexican Ranchera, Mariachi band, triumphant trumpets, violins, rhythmic vihuela, deep guitarrón bassline, powerful male vocals",
    110,
    125,
    "110 – 125",
    ["Trumpets", "Violin", "Vihuela", "Guitarrón"],
    ["edm", "trap"],
    "Grito de arranque, trompetas triunfales y estribillo de despecho.",
  ),
  p(
    "jazz-smooth",
    "Smooth Jazz",
    "Jazz",
    "Relajación y sofisticación. Sonido pulido y melódico.",
    "Smooth Jazz, sophisticated, polished production, fluid saxophone melodies, warm electric piano (Rhodes), soft drums with brushes, fretless bass, atmospheric and elegant",
    85,
    95,
    "85 – 95",
    ["Saxophone", "Rhodes Piano", "Brushed Drums", "Fretless Bass"],
    ["edm", "trap", "loud"],
    "Saxo y Rhodes dialogan; sin estribillo cantado, deja respirar los solos.",
  ),
  p(
    "jazz-latin",
    "Latin Jazz",
    "Jazz",
    "Síncopa y fuego afro-cubano. Fusión rítmica potente.",
    "Latin Jazz, Afro-Cuban jazz, complex syncopation, virtuosic piano montunos, bright brass section, congas, bongos, timbales, energetic upright bass lines",
    110,
    130,
    "110 – 130",
    ["Piano", "Trumpets", "Congas", "Timbales"],
    ["edm", "autotune"],
    "Montuno de piano al frente; sección de metales como respuesta, solos abiertos.",
  ),
  p(
    "jazz-bossa",
    "Jazz Bossa Nova",
    "Jazz",
    "Elegancia brasileña. Suave, rítmico y melancólico.",
    "Jazz Bossa Nova, Brazilian fusion, nylon string acoustic guitar, syncopated bossa beat, breathy vocals, sophisticated jazz chords, subtle flute or sax highlights",
    80,
    90,
    "80 – 90",
    ["Nylon Guitar", "Shaker", "Piano", "Flute"],
    ["edm", "trap", "loud"],
    "Guitarra de nylon marcando la síncopa; voz al oído, sin subir el volumen.",
  ),
  p(
    "jazz-swing",
    "Classic Swing Jazz",
    "Jazz",
    "Época dorada. Energía, big band y baile.",
    "Classic 1940s Swing, Big Band Jazz, walking bassline, rhythmic brass section, swinging drums, high energy, vintage production feel, sophisticated arrangements",
    140,
    170,
    "140 – 170",
    ["Brass Section", "Double Bass", "Hollow Body Guitar", "Swing Drums"],
    ["edm", "trap"],
    "Cuenta de cuatro con swing; pregón de metales y coro de respuesta.",
  ),
  p(
    "urban",
    "Urbano / Trap Moderno",
    "Urbano",
    "Flow, graves y textura. 808 pesado y hi-hats rítmicos.",
    "Modern Latin Trap, dark atmosphere, heavy 808 bass, rhythmic hi-hats, melodic male vocals, catchy flow, urban textures",
    140,
    160,
    "140 (doble tempo)",
    ["808 Bass", "Synthesizers", "Drum Machine"],
    ["orchestral", "acoustic"],
    "Intro de 808 y hi-hats; flow melódico y hook corto que se repite.",
  ),
  p(
    "pop-latino",
    "Pop Latino",
    "Pop",
    "Sonido comercial moderno. Ritmos contagiosos y producción pulida.",
    "Modern Latin Pop, catchy melodies, clean production, upbeat rhythm, acoustic guitar accents, polished vocal layers, radio-friendly",
    115,
    128,
    "115 – 128",
    ["Acoustic Guitar", "Synthesizers", "Drum Machine", "Percussion"],
    ["metal", "loud"],
    "Gancho en los primeros 15 segundos; coro con capas vocales apiladas.",
  ),
  p(
    "balada-pop",
    "Balada Pop",
    "Pop",
    "Romanticismo moderno. Piano y cuerdas con sentimiento.",
    "Modern Pop Ballad, romantic, emotional vocals, melodic piano, cinematic string section, intimate atmosphere, powerful build-ups",
    70,
    85,
    "70 – 85",
    ["Piano", "Strings", "Acoustic Guitar", "Soft Drums"],
    ["edm", "trap"],
    "Verso desnudo, coro que abre; el clímax llega en el último tercio.",
  ),
  p(
    "rock-latino",
    "Rock Latino",
    "Rock",
    "Energía y pasión. Guitarra eléctrica y ritmos latinos fusionados.",
    "Latin Rock, energetic electric guitars, driving rhythm section, passionate vocals, fusion of rock and Latin percussion, anthemic energy",
    120,
    140,
    "120 – 140",
    ["Electric Guitar", "Drum Kit", "Electric Bass", "Percussion"],
    ["trap", "autotune"],
    "Riff identificable desde el inicio; percusión latina empujando el estribillo.",
  ),
  p(
    "blues-classic",
    "Classic Blues (12 compases)",
    "Blues",
    "Melancolía y emoción cruda. Estructura de 12 compases con notas azules.",
    "traditional 12-bar blues structure, raw emotional vocals, gritty blues electric guitar, expressively bent blue notes, walking upright bass, slow shuffle rhythm, melancholic mood, authentic late night lounge production",
    70,
    90,
    "70 – 90",
    ["Electric Guitar", "Upright Bass", "Harmonica", "Blues Piano"],
    ["edm", "trap"],
    "Sigue los 12 compases: cuatro de tónica, dos de subdominante, dos de tónica, dominante y vuelta.",
  ),
  p(
    "jazz-classic",
    "Jazz Tradicional",
    "Jazz",
    "Improvisación y síncopa. Armonía compleja con acordes extendidos y solos.",
    "sophisticated jazz, heavy emphasis on instrumental interaction, virtuosic improvisational solos, syncopated swing feel, complex extended chords, warm acoustic piano, double bass walks, dynamic jazz drum kit with cymbals",
    110,
    140,
    "110 – 140",
    ["Saxophone", "Acoustic Piano", "Double Bass", "Jazz Drums", "Trumpet"],
    ["edm", "trap", "autotune"],
    "Tema y variaciones: expón la melodía, deja espacio y luego improvisa sobre la forma.",
  ),
  p(
    "soul-classic",
    "Classic Soul (Motown & Stax)",
    "Soul",
    "Fusión de R&B y gospel. Fuerza vocal, coros y metales vibrantes.",
    "Classic 1960s soul, warm spiritual energy, powerful emotional lead vocals with gospel-style ad-libs, rich background vocal harmonies, tight horn section, groovy vintage electric bassline, Motown and Stax recording aesthetic",
    90,
    110,
    "90 – 110",
    ["Horn Section", "Vintage Organ", "Electric Bass", "Backing Choir", "Drums"],
    ["edm", "trap"],
    "Voz principal con coro gospel respondiendo; metales entrando en el segundo estribillo.",
  ),
];

/** Grupos en el orden en que deben mostrarse en la interfaz. */
export const PRESET_GROUPS = Array.from(new Set(SUNO_PRESETS.map((x) => x.group)));

export function findPreset(id: string): SunoPreset | undefined {
  return SUNO_PRESETS.find((preset) => preset.id === id);
}

/** BPM sugerido (punto medio del rango) para un preset. */
export function presetBpm(preset: SunoPreset): number {
  return Math.round((preset.bpmMin + preset.bpmMax) / 2);
}
