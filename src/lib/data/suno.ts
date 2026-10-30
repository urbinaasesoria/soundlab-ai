export interface SunoGenre {
  id: string;
  name: string;
  group: string;
  origin: string;
  birth: string;
  peak: string;
  bpm: string;
  description: string;
  tags: string[];
  artists: string[];
  prompts: string[];
}

export const SUNO_GROUPS = [
  { id: "pop", label: "Pop y mainstream" },
  { id: "rock", label: "Rock y alternativa" },
  { id: "electronic", label: "Electrónica / EDM" },
  { id: "urban", label: "Hip-hop y urbano" },
  { id: "latin", label: "Latino y global" },
  { id: "soul", label: "Soul, jazz y experimental" },
] as const;

export const SUNO_GENRES: SunoGenre[] = [
  {
    id: "dream-pop",
    name: "Dream Pop",
    group: "pop",
    origin: "US · UK",
    birth: "1980s",
    peak: "2010s–2020s",
    bpm: "90–120 BPM",
    description:
      "Guitarras reverberadas, voces susurradas y una neblina armónica que prioriza atmósfera sobre impacto.",
    tags: ["ethereal", "reverb", "shoegaze", "female vocals", "synth pads", "intimate", "cinematic"],
    artists: ["Beach House", "Cocteau Twins", "Mazzy Star", "Cigarettes After Sex", "Men I Trust"],
    prompts: [
      "dream pop, female vocals, lush reverb guitars, slow 100 BPM, warm analog synths, intimate close-mic vocal, hazy atmosphere",
      "dream pop ballad, whispered male vocal, tremolo guitar, tape saturation, soft brush drums, nostalgic and cinematic",
      "dream pop with shoegaze wall of sound, ethereal harmonies, wide stereo pads, dreamy 110 BPM, vinyl texture",
    ],
  },
  {
    id: "synth-pop",
    name: "Synth Pop",
    group: "pop",
    origin: "UK",
    birth: "1970s",
    peak: "1980s–2020s",
    bpm: "100–128 BPM",
    description:
      "Melodías pegadizas sobre secuencias de sintetizador, cajas electrónicas y un estribillo que no se olvida.",
    tags: ["analog synths", "gated drums", "80s", "catchy hook", "male vocals", "neon", "dance"],
    artists: ["Depeche Mode", "Eurythmics", "The Weeknd", "M83", "CHVRCHES"],
    prompts: [
      "synth pop, 118 BPM, analog Juno pads, gated reverb drums, catchy male hook, 80s neon atmosphere",
      "modern synth pop, female vocal, pulsing arpeggio, punchy kick, bright chorus, radio-ready mix",
      "dark synth pop, deep baritone, cold analog bass, tom fills, moody 105 BPM, retro-futurist",
    ],
  },
  {
    id: "hyperpop",
    name: "Hyperpop",
    group: "pop",
    origin: "UK · US",
    birth: "2010s",
    peak: "2020s",
    bpm: "140–170 BPM",
    description:
      "Voces pitchadas al límite, sintetizadores brillantes y una estética maximalista que rompe todas las reglas.",
    tags: ["pitched vocals", "glitch", "maximalist", "bright", "club", "distorted bass", "playful"],
    artists: ["100 gecs", "Charli XCX", "SOPHIE", "Dorian Electra", "A. G. Cook"],
    prompts: [
      "hyperpop, pitched female vocal, glitchy synths, distorted 808, 160 BPM, maximalist and playful",
      "hyperpop club track, chopped vocals, bright supersaw, aggressive sidechain, chaotic energy",
      "hyperpop ballad, autotuned vocal, metallic pads, sudden genre switch, emotional but plastic",
    ],
  },
  {
    id: "bedroom-pop",
    name: "Bedroom Pop",
    group: "pop",
    origin: "US",
    birth: "2010s",
    peak: "2020s",
    bpm: "80–110 BPM",
    description:
      "Producción casera, guitarras limpias y una intimidad imperfecta que convierte el dormitorio en estudio.",
    tags: ["lo-fi", "intimate", "clean guitar", "soft vocals", "DIY", "warm", "nostalgic"],
    artists: ["Clairo", "Girl in Red", "Omar Apollo", "Rex Orange County", "Beabadoobee"],
    prompts: [
      "bedroom pop, soft female vocal, clean chorus guitar, 95 BPM, tape hiss, intimate DIY production",
      "bedroom pop with jazzy chords, male falsetto, brushed drums, warm bass, late-night mood",
      "lo-fi bedroom pop, acoustic guitar, subtle synth pad, conversational vocal, nostalgic 2020s",
    ],
  },
  {
    id: "indie-rock",
    name: "Indie Rock",
    group: "rock",
    origin: "US · UK",
    birth: "1980s",
    peak: "2000s–2020s",
    bpm: "110–140 BPM",
    description:
      "Guitarras con carácter, batería orgánica y estribillos que equilibran energía de club con honestidad de garaje.",
    tags: ["jangly guitars", "live drums", "male vocals", "anthemic", "raw", "upbeat", "band"],
    artists: ["Arctic Monkeys", "The Strokes", "Vampire Weekend", "Interpol", "Foals"],
    prompts: [
      "indie rock, jangly guitars, driving live drums, 128 BPM, male vocal, anthemic chorus, raw band energy",
      "indie rock with post-punk bass, tight hi-hats, spoken verses, explosive guitar chorus",
      "melancholic indie rock, clean arpeggios, roomy drums, baritone vocal, 115 BPM",
    ],
  },
  {
    id: "post-punk",
    name: "Post-Punk",
    group: "rock",
    origin: "UK",
    birth: "1970s",
    peak: "2020s",
    bpm: "130–160 BPM",
    description:
      "Bajos tensos, guitarras angulares y una frialdad rítmica que mira al dancefloor sin perder la oscuridad.",
    tags: ["angular guitar", "driving bass", "cold", "spoken vocals", "motorik", "dark", "dance-punk"],
    artists: ["Joy Division", "Fontaines D.C.", "Idles", "Molchat Doma", "Protomartyr"],
    prompts: [
      "post-punk, driving eighth-note bass, angular guitar, 145 BPM, deadpan male vocal, cold room reverb",
      "dark post-punk, motorik drums, dissonant lead guitar, monotone vocal, 150 BPM, industrial edge",
      "post-punk with dance-punk groove, tight snare, dub delay, anxious energy, 138 BPM",
    ],
  },
  {
    id: "shoegaze",
    name: "Shoegaze",
    group: "rock",
    origin: "UK",
    birth: "1980s",
    peak: "1990s · 2020s revival",
    bpm: "90–130 BPM",
    description:
      "Muros de guitarra con feedback, voces enterradas en la mezcla y una belleza que aparece dentro del ruido.",
    tags: ["wall of sound", "feedback", "reverb", "ethereal vocals", "loud", "dreamy", "guitar"],
    artists: ["My Bloody Valentine", "Slowdive", "Ride", "Nothing", "DIIV"],
    prompts: [
      "shoegaze, wall of distorted guitars, ethereal female vocal buried in reverb, 110 BPM, dreamy and loud",
      "shoegaze with tremolo picking, massive snare, feedback swells, melancholic melody, analog warmth",
      "nu-gaze, heavy fuzz guitars, soft whispered vocal, driving 125 BPM, cathartic chorus",
    ],
  },
  {
    id: "math-rock",
    name: "Math Rock",
    group: "rock",
    origin: "US · Japan",
    birth: "1990s",
    peak: "2000s–2020s",
    bpm: "120–180 BPM",
    description:
      "Compases irregulares, guitarras limpias en tapping y una precisión rítmica que suena fácil aunque no lo sea.",
    tags: ["odd time", "tapping", "clean guitar", "instrumental", "technical", "bright", "dynamic"],
    artists: ["Toe", "American Football", "TTNG", "Chon", "Covet"],
    prompts: [
      "math rock, clean tapped guitars, odd 7/8 groove, 150 BPM, instrumental, bright and intricate",
      "math rock with emo vocals, stop-start dynamics, tight drumming, 140 BPM, midwest energy",
      "instrumental math rock, polyrhythmic drums, chorus guitar, warm bass, 160 BPM",
    ],
  },
  {
    id: "melodic-techno",
    name: "Melodic Techno",
    group: "electronic",
    origin: "Germany",
    birth: "2010s",
    peak: "2020s",
    bpm: "118–128 BPM",
    description:
      "Pulsos hipnóticos, arpegios oscuros y un viaje progresivo que crece durante minutos sin perder tensión.",
    tags: ["hypnotic", "analog arps", "dark", "progressive", "club", "wide stereo", "driving"],
    artists: ["Tale of Us", "Âme", "Stephan Bodzin", "Artbat", "Adriatique"],
    prompts: [
      "melodic techno, hypnotic analog arpeggio, deep rolling bass, 124 BPM, dark club atmosphere, long build",
      "melodic techno with emotional lead, wide reverb, tight kick, 122 BPM, progressive arrangement",
      "dark melodic techno, modular textures, offbeat hats, 126 BPM, late-night warehouse",
    ],
  },
  {
    id: "deep-house",
    name: "Deep House",
    group: "electronic",
    origin: "US",
    birth: "1980s",
    peak: "2010s",
    bpm: "118–125 BPM",
    description:
      "Graves cálidos, acordes jazzy y voces sampled que convierten el groove en un lugar cómodo y elegante.",
    tags: ["warm bass", "jazzy chords", "sampled vocals", "groove", "soulful", "smooth", "4/4"],
    artists: ["Larry Heard", "Kerri Chandler", "Disclosure", "Duke Dumont", "Maya Jane Coles"],
    prompts: [
      "deep house, warm sub bass, jazzy Rhodes chords, 122 BPM, soulful sampled vocal, smooth groove",
      "deep house with garage swing, lush pads, filtered vocal chops, 120 BPM, late-night drive",
      "organic deep house, live percussion, plucked synth, laid-back 118 BPM, beach sunset",
    ],
  },
  {
    id: "drum-and-bass",
    name: "Drum & Bass",
    group: "electronic",
    origin: "UK",
    birth: "1990s",
    peak: "2020s",
    bpm: "165–180 BPM",
    description:
      "Breakbeats acelerados, subbajos profundos y una tensión que explota entre el rollo jungle y el diseño moderno.",
    tags: ["breakbeat", "sub bass", "fast", "jungle", "neurofunk", "energetic", "liquid"],
    artists: ["Goldie", "Noisia", "Sub Focus", "Chase & Status", "Netsky"],
    prompts: [
      "liquid drum and bass, rolling breakbeat, warm sub bass, 174 BPM, soulful female vocal, lush pads",
      "neurofunk drum and bass, distorted reese bass, 176 BPM, sci-fi atmosphere, aggressive energy",
      "jungle, chopped amen breaks, dub sirens, 168 BPM, ragga vocal sample, raw 90s energy",
    ],
  },
  {
    id: "ambient",
    name: "Ambient",
    group: "electronic",
    origin: "UK",
    birth: "1970s",
    peak: "2010s",
    bpm: "50–90 BPM",
    description:
      "Texturas sin prisa, drones que respiran y espacio para que el oyente complete la música con su propia memoria.",
    tags: ["drone", "texture", "meditative", "no beat", "field recording", "slow", "cinematic"],
    artists: ["Brian Eno", "Aphex Twin", "Hiroshi Yoshimura", "Stars of the Lid", "Nils Frahm"],
    prompts: [
      "ambient, slow evolving drone, soft tape texture, 60 BPM, meditative, no drums, wide reverb",
      "cinematic ambient, field recordings, distant piano, warm analog haze, introspective",
      "dark ambient, low rumble, granular textures, sparse bell tones, unsettling calm",
    ],
  },
  {
    id: "trap",
    name: "Trap",
    group: "urban",
    origin: "US",
    birth: "2000s",
    peak: "2010s–2020s",
    bpm: "130–160 BPM",
    description:
      "808s largos, hi-hats en tresillos y una estética nocturna donde el espacio vacío también es parte del beat.",
    tags: ["808", "hi-hat rolls", "dark", "autotune", "night", "minimal", "hard"],
    artists: ["Future", "Travis Scott", "Metro Boomin", "Young Thug", "Playboi Carti"],
    prompts: [
      "trap, booming 808, rolling hi-hats, 140 BPM, dark minor melody, autotuned male vocal, nocturnal",
      "melodic trap, ambient guitar loop, soft 808, 145 BPM, emotional autotune, spacious mix",
      "hard trap, distorted 808, sparse bells, 150 BPM, aggressive ad-libs, club energy",
    ],
  },
  {
    id: "drill",
    name: "Drill",
    group: "urban",
    origin: "UK · Chicago",
    birth: "2010s",
    peak: "2020s",
    bpm: "136–146 BPM",
    description:
      "Slides de 808, patrones de hi-hat sincopados y una lectura fría y directa que deja la voz al descubierto.",
    tags: ["808 slides", "syncopated", "dark", "cold", "UK", "menacing", "minimal"],
    artists: ["Chief Keef", "Headie One", "Pop Smoke", "Central Cee", "Fivio Foreign"],
    prompts: [
      "UK drill, sliding 808, syncopated hi-hats, 142 BPM, dark piano melody, cold male vocal",
      "NY drill, aggressive 808, sparse percussion, 140 BPM, menacing strings, punchy ad-libs",
      "melodic drill, soft guitar loop, deep 808 slides, 138 BPM, autotuned hook, nocturnal",
    ],
  },
  {
    id: "boom-bap",
    name: "Boom Bap",
    group: "urban",
    origin: "US",
    birth: "1980s",
    peak: "1990s",
    bpm: "85–100 BPM",
    description:
      "Samples de vinilo, bombo redondo y caja seca: la base donde el rap encontró su peso y su swing.",
    tags: ["sample-based", "vinyl", "dusty", "swing", "90s", "scratch", "raw"],
    artists: ["DJ Premier", "J Dilla", "Nas", "Wu-Tang Clan", "MF DOOM"],
    prompts: [
      "boom bap, dusty vinyl sample, punchy kick and snare, 92 BPM, scratch hook, 90s New York",
      "boom bap with jazz piano loop, swung drums, deep upright bass, 88 BPM, raw underground",
      "lo-fi boom bap, warm tape saturation, sparse percussion, 95 BPM, introspective",
    ],
  },
  {
    id: "alt-rnb",
    name: "R&B Alternativo",
    group: "urban",
    origin: "US · UK",
    birth: "2010s",
    peak: "2020s",
    bpm: "70–100 BPM",
    description:
      "Voz al centro, armonías apiladas y producción que mezcla soul clásico con texturas electrónicas modernas.",
    tags: ["smooth", "falsetto", "layered harmonies", "late night", "sensual", "minimal", "soul"],
    artists: ["Frank Ocean", "SZA", "The Weeknd", "Jorja Smith", "Daniel Caesar"],
    prompts: [
      "alternative R&B, smooth male falsetto, sparse drums, 84 BPM, warm bass, intimate late-night",
      "alt R&B with airy female vocal, layered harmonies, 90 BPM, subtle guitar, spacious mix",
      "experimental R&B, pitched vocal textures, off-kilter drums, 76 BPM, emotional and hazy",
    ],
  },
  {
    id: "reggaeton",
    name: "Reggaetón",
    group: "latin",
    origin: "Puerto Rico",
    birth: "1990s",
    peak: "2020s",
    bpm: "88–100 BPM",
    description:
      "Dembow inconfundible, graves potentes y estribillos diseñados para cantarse con las ventanas bajadas.",
    tags: ["dembow", "perreo", "Latin", "party", "808", "catchy", "club"],
    artists: ["Bad Bunny", "Daddy Yankee", "Karol G", "J Balvin", "Rauw Alejandro"],
    prompts: [
      "reggaeton, dembow rhythm, deep 808, 92 BPM, catchy male hook, bright reggaeton percussion",
      "reggaeton romántico, soft synth pluck, 88 BPM, female vocal, warm bass, emotional chorus",
      "perreo intenso, aggressive dembow, 96 BPM, club energy, sampled vocal chops, heavy sub",
    ],
  },
  {
    id: "corrido-tumbado",
    name: "Corrido Tumbado",
    group: "latin",
    origin: "Mexico",
    birth: "2020s",
    peak: "2020s",
    bpm: "80–110 BPM",
    description:
      "Requinto, tuba y bajo quinto con una producción moderna: tradición regional llevada al lenguaje del trap.",
    tags: ["requinto", "tuba", "Mexico", "regional", "modern", "storytelling", "brass"],
    artists: ["Natanael Cano", "Peso Pluma", "Junior H", "Gabito Ballesteros", "Yng Lvcas"],
    prompts: [
      "corrido tumbado, requinto acoustic guitar, tuba bass, 95 BPM, modern production, male vocal",
      "corrido tumbado with 808, bright brass, 100 BPM, storytelling vocal, punchy drums",
      "sad corrido, nylon guitar, soft tuba, 88 BPM, intimate vocal, late-night mood",
    ],
  },
  {
    id: "afrobeats",
    name: "Afrobeats",
    group: "latin",
    origin: "Nigeria",
    birth: "2010s",
    peak: "2020s",
    bpm: "95–115 BPM",
    description:
      "Percusión viva, melodías soleadas y un groove que conecta Lagos con el resto del mundo.",
    tags: ["afro percussion", "sunny", "dance", "melodic", "guitar", "warm", "global"],
    artists: ["Burna Boy", "Wizkid", "Tems", "Davido", "Fireboy DML"],
    prompts: [
      "afrobeats, live percussion, 105 BPM, warm guitar loop, male vocal, sunny and danceable",
      "afrobeats with amapiano log drum, 110 BPM, female vocal, airy pads, infectious groove",
      "afro-fusion, highlife guitar, 100 BPM, smooth vocal, deep bass, global pop energy",
    ],
  },
  {
    id: "cumbia",
    name: "Cumbia Sonidera",
    group: "latin",
    origin: "Mexico · Colombia",
    birth: "1960s",
    peak: "1990s",
    bpm: "90–105 BPM",
    description:
      "Órgano, guacharaca y un swing de barrio que convierte cualquier pista en una fiesta intergeneracional.",
    tags: ["organ", "guacharaca", "party", "retro", "dance", "tropical", "sonidero"],
    artists: ["Los Ángeles Azules", "Celso Piña", "La Sonora Dinamita", "Margarita", "Sonido La Changa"],
    prompts: [
      "cumbia sonidera, bright organ, guacharaca, 98 BPM, male vocal, festive street party",
      "cumbia with electric guitar, deep bass, 95 BPM, female vocal, nostalgic sonidero",
      "chicha cumbia, surf guitar, analog organ, 102 BPM, psychedelic tropical groove",
    ],
  },
  {
    id: "neo-soul",
    name: "Neo-Soul",
    group: "soul",
    origin: "US",
    birth: "1990s",
    peak: "2000s–2020s",
    bpm: "70–95 BPM",
    description:
      "Acordes extendidos, batería con swing y una calidez que deja respirar cada nota de la voz.",
    tags: ["jazzy chords", "warm", "soulful", "live drums", "Rhodes", "intimate", "groove"],
    artists: ["Erykah Badu", "D'Angelo", "Hiatus Kaiyote", "Daniel Caesar", "Cleo Sol"],
    prompts: [
      "neo-soul, Rhodes chords, warm upright bass, 82 BPM, soulful female vocal, live drums",
      "neo-soul with jazzy guitar, brushed snare, 76 BPM, male falsetto, intimate room sound",
      "future soul, synth bass, layered harmonies, 88 BPM, spacious mix, emotional",
    ],
  },
  {
    id: "jazz-fusion",
    name: "Jazz Fusion",
    group: "soul",
    origin: "US",
    birth: "1960s",
    peak: "1970s",
    bpm: "90–140 BPM",
    description:
      "Armonía compleja, virtuosismo y grooves eléctricos que empujan el jazz hacia el rock y el funk.",
    tags: ["electric piano", "complex harmony", "virtuoso", "funk", "instrumental", "70s", "live"],
    artists: ["Herbie Hancock", "Weather Report", "Mahavishnu Orchestra", "Snarky Puppy", "Chick Corea"],
    prompts: [
      "jazz fusion, electric piano solo, syncopated funk drums, 120 BPM, virtuoso bass, 70s production",
      "jazz fusion with distorted guitar lead, odd meter, 130 BPM, instrumental, energetic",
      "modern jazz fusion, lush horns, groove-based, 110 BPM, live room, dynamic",
    ],
  },
  {
    id: "lofi-hiphop",
    name: "Lo-fi Hip-Hop",
    group: "soul",
    origin: "Japan · US",
    birth: "2010s",
    peak: "2020s",
    bpm: "70–90 BPM",
    description:
      "Samples suaves, vinilo y batería relajada: música para estudiar que esconde bastante detalle.",
    tags: ["chill", "vinyl", "study", "sample", "mellow", "rain", "instrumental"],
    artists: ["Nujabes", "J Dilla", "Idealism", "Kupla", "Tomppabeats"],
    prompts: [
      "lo-fi hip hop, dusty piano sample, vinyl crackle, 82 BPM, mellow drums, rainy night",
      "lo-fi hip hop with jazz guitar, soft kick, 78 BPM, warm tape, instrumental study beat",
      "chillhop, rhodes chords, subtle vocal chops, 88 BPM, relaxed swing, nostalgic",
    ],
  },
  {
    id: "dark-cabaret",
    name: "Dark Cabaret",
    group: "soul",
    origin: "US · UK",
    birth: "1990s",
    peak: "2000s",
    bpm: "80–120 BPM",
    description:
      "Piano de cabaret, teatralidad y una elegancia siniestra que convierte cada canción en una escena.",
    tags: ["theatrical", "piano", "dark", "vintage", "male vocals", "dramatic", "waltz"],
    artists: ["Tom Waits", "Nick Cave", "The Tiger Lillies", "Emilie Autumn", "Amanda Palmer"],
    prompts: [
      "dark cabaret, theatrical male vocal, detuned piano, 95 BPM, creepy waltz, vintage room",
      "dark cabaret with brass, dramatic female vocal, 100 BPM, eerie accordion, vaudeville",
      "gothic cabaret, upright bass, brushed drums, 88 BPM, sinister and elegant",
    ],
  },
];

export const MOODS = [
  "melancólico",
  "eufórico",
  "íntimo",
  "nocturno",
  "soleado",
  "agresivo",
  "nostálgico",
  "cinemático",
];

export const INSTRUMENTS = [
  "piano",
  "guitarra eléctrica",
  "sintetizador analógico",
  "cuerdas",
  "batería en vivo",
  "808",
  "metales",
  "percusión latina",
];

export interface PromptOptions {
  genre: string;
  mood: string;
  instrument: string;
  bpm: string;
  vocals: string;
}

export function buildSunoPrompt({ genre, mood, instrument, bpm, vocals }: PromptOptions): string {
  const parts = [
    genre.toLowerCase(),
    vocals,
    `${bpm} BPM`,
    instrument,
    `mood ${mood}`,
    "detailed production",
    "clear mix",
    "radio-ready",
  ].filter(Boolean);
  return parts.join(", ");
}

export const SUNO_TIPS = [
  "Suno entiende mejor las etiquetas separadas por comas que las frases largas.",
  "Coloca el género al principio: es la etiqueta con más peso en el resultado.",
  "Describe la mezcla (íntima, amplia, cruda) además del instrumento.",
  "Evita pedir artistas concretos por nombre; usa sus rasgos sonoros.",
];
