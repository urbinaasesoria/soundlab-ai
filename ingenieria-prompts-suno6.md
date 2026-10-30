# Manual Maestro de Ingeniería de Prompts para SUNO 6.0: Arquitectura de Control, Parámetros Algorítmicos y Flujos de Producción Profesional

## 1. Fundamentos de la Arquitectura SUNO v6 y Ecología de Modelos

El despliegue de la arquitectura Suno v6 marca una transformación estructural en la síntesis fonográfica basada en inteligencia artificial. Desarrollada en alianza con consorcios fonográficos y distribuidores multinacionales como Warner Music Group (WMG), BMG y Believe, la suite v6 evoluciona desde la simple superposición de muestras hacia un procesamiento semántico integral de la teoría musical, la microdinámica de arreglos y la ingeniería de mezcla. Coincidiendo con este hito tecnológico, todas las iteraciones previas (modelos v3.5, v4, v4.5, v5 y v5.5) han sido retiradas definitivamente para la generación de nuevos tracks, quedando preservadas únicamente en la biblioteca personal para reproducción, compartición, remezcla o generación de *Covers*.

A diferencia de las versiones predecesoras, donde la producción dependía de la acumulación masiva de etiquetas desarticuladas, Suno v6 interpreta el prompt de estilo como un resumen creativo (*creative brief*) expresado en lenguaje natural. La red neuronal establece relaciones causales entre el género primario, la técnica vocal, la instrumentación de acompañamiento, la respuesta en frecuencia y la evolución temporal de la obra.

La suite v6 está segmentada en tres variantes computacionales especializadas, diseñadas para responder a distintas fases del flujo de trabajo de producción:

| Parámetro / Especificación | Modelo v6 (Flagship) | Modelo v6-wild | Modelo v6-mini |
| :--- | :--- | :--- | :--- |
| **Nivel de Acceso** | Suscriptores Pro y Premier | Suscriptores Pro y Premier | Acceso Universal (Gratuito, Pro, Premier) |
| **Objetivo Operativo** | Producción pulida, precisión de instructivo y mezcla comercial | Exploración textural, sorpresa armónica y fusión experimental | Borradores rápidos, iteración de letras y maquetación métrica |
| **Límite de Duración Continua** | Hasta 8 minutos por generación | Hasta 8 minutos por generación | Hasta 8 minutos por generación |
| **Límite del Campo Style** | 1,000 caracteres | 1,000 caracteres | 1,000 caracteres |
| **Límite del Campo Lyrics** | 5,000 caracteres | 5,000 caracteres | 5,000 caracteres |
| **Costo Base de Cómputo** | 10 créditos (genera 2 variantes) | 10 créditos (genera 2 variantes) | 10 créditos (genera 2 variantes) |
| **Costo con Max Mode** | 20 créditos (doble asignación de cómputo) | 20 créditos (doble asignación de cómputo) | 20 créditos (doble asignación de cómputo) |

Toda solicitud estándar consume 10 créditos e inyecta al sistema dos renders simultáneos con semillas estocásticas independientes. El interruptor *Max Mode* duplica la asignación de cómputo a 20 créditos por solicitud. Este modo incrementa el procesamiento enfocado en la estabilidad del espacio latente, estando técnicamente indicado para pasajes musicales que superen los dos minutos de duración, proyectos de transferencia de estilo (*style transfer*), aplicación de identidades vocales fijas (*Voices*) y composiciones propensas a la atenuación de altas frecuencias o pérdidas de brillo en los tramos finales de la pista.

---

## 2. La Arquitectura Tri-Campo en Modo Personalizado (Custom Mode)

Para ejercer un control determinista sobre Suno v6, es indispensable abandonar la interfaz simplificada (*Simple Mode*) y operar exclusivamente en el Modo Personalizado (*Custom Mode*). Este entorno fragmenta la entrada de datos en tres contenedores de procesamiento independiente:

### A. Campo de Estilo (*Style Field* — Límite de 1,000 caracteres)
Define la identidad sono-acústica global de la canción. La redacción técnica óptima evita las listas de adjetivos abstractos (como "épico", "increíble" o "potente", los cuales carecen de correlato en frecuencia o transitorios y obligan al modelo a recurrir a sus patrones emergentes por defecto de música pop) y adopta una jerarquía sintáctica estricta estructurada en forma de frase continua o *creative brief*:

$$\text{Fórmula del Brief de Estilo} = [\text{Género Primario/Subgénero}] + [\text{Groove/Sentido Rítmico}] + [\text{Instrumentos Clave (máx. 2-4)}] + [\text{Registro y Cariz Vocal}] + [\text{Evolución Dinámica}] + [\text{Textura de Mezcla y Espacio}] + [\text{Ancla Decadal/Temporal}]$$

Las descripciones operativas basadas en verbos superan ampliamente el uso de calificativos estáticos. Por ejemplo, la instrucción *"Piano and muted guitar carry restrained verses, full live drums and wide guitars arrive only in the chorus"* impone restricciones claras a la distribución de densidad sonora a lo largo del tiempo. Además, añadir una indicación decadal (ej. *"early 80s feel"* o *"mid-2010s feel"*) constituye la técnica más efectiva para anclar la respuesta de impulsos de la batería, el tipo de reverberación y el timbre de los sintetizadores.

### B. Campo de Letras (*Lyrics Field* — Límite de 5,000 caracteres)
Funciona como una cuadrícula de distribución temporal que guía la métrica, la melodía y los acentos del arreglo. La primera línea de cualquier etiqueta estructural delimitada por corchetes (ej. `[Chorus]`) concentra la mayor carga de atención melódica del modelo. Para lograr estribillos memorables con el máximo impacto, la extensión del bloque del *Chorus* debe acotarse a entre 2 y 4 líneas de texto; extender un estribillo por encima de esa métrica dispersa la fuerza del gancho y aplana la línea melódica. Las estrofas (*Verse*), en cambio, soportan hasta 8 líneas de desarrollo narrativo antes de requerir un cambio de tensión.

### C. Campo de Exclusión (*Exclude Styles* — Límite de 1,000 caracteres)
Ubicado en el menú de opciones avanzadas (*More Options*), es el único canal sintácticamente válido para aplicar restricciones negativas. La inclusión de comandos de negación redactados directamente en el campo de Estilo (tales como "no drums" o "without autotune") produce un fallo recurrente: la red neuronal procesa los tokens "drums" y "autotune" como elementos positivos de atención, aumentando la probabilidad de que aparezcan en el audio sintetizado. En el campo *Exclude Styles*, los términos deben ingresarse como elementos desnudos o separados por comas (ej. `autotune, heavy reverb, generic EDM drop, male lead vocal`).

---

## 3. Calibración Fina de Deslizadores Algorítmicos y Parámetros de Inferencia

El rendimiento de un prompt de estilo en Suno v6 está condicionado por la posición de los controles de la interfaz en la sección de opciones avanzadas. Operar la plataforma con los deslizadores en sus valores predeterminados suele degradar la precisión de las instrucciones textuales.

| Deslizador / Control | Escala | Valor por Defecto | Mecanismo Algorítmico Interno | Configuración Técnica Recomendada |
| :--- | :--- | :--- | :--- | :--- |
| **Variety** | Off (0) a Extra | Normal (v6/v6-mini) / Off (v6-wild) | Reescritura e interpolación semántica del prompt de estilo previa a la inferencia. | **0 (Off):** Innegociable al utilizar un prompt de estilo minuciosamente estructurado. |
| **Style Influence** | Loose (0%) a Strong (100%) | 50% | Ponderación de atención asignada al texto del prompt frente a los sesgos del espacio latente. | **70% – 90%:** Para briefs highly específicos. **40%:** Para exploración abierta. |
| **Weirdness** | Safe (0) a Chaos (100) | 50 | Grado de dispersión estocástica en la selección de vectores tímbricos y armónicos. | **30 – 50:** Para mantener coherencia de género. Valora >85 introducen artefactos. |
| **Max Mode** | Interruptor (On / Off) | Off | Asignación extendida de recursos de cómputo para la resolución de audio y estabilidad. | **On:** En composiciones de más de 2 min, transferencias de estilo y renders finales. |

### La Regla Innegociable del Deslizador Variety
El deslizador *Variety* actúa como un agente de reescritura que modifica internamente el prompt del usuario antes de enviarlo al motor de generación. En la configuración por defecto (*Normal*), el sistema añade o elimina términos instrumentales e invierte indicaciones vocales en cada toma. La documentación oficial establece que para mantener un control estricto sobre las etiquetas introducidas, el deslizador *Variety* debe fijarse en cero (0 / Off). Las pruebas de auditoría confirman que situar *Variety* en cero garantiza la conservación íntegra del prompt en el 96% de las iteraciones.

---

## 4. Diseño y Modelado Vocal Profesional (Sin Infracción de Copyright)

Para modelar un perfil vocal comercial equivalente al de un artista reconocido sin activar los filtros de derechos de autor ni recibir un bloqueo en la plataforma, se debe aplicar una técnica de ingeniería inversa basada en el **Perfilado Descriptivo ("Retrato Ciego")**.

### A. Metodología del Retrato Ciego
Consiste en describir minuciosamente los componentes tímbricos, la técnica de emisión, el registro y la actitud emocional del cantante sin mencionar jamás su nombre propio:

1. **Registro y Género**: `warm female alto`, `raspy male baritone`, `clean tenor with grit`, `operatic soprano female vocal`.
2. **Técnica de Emisión**: `breathy intimate verse`, `big belted chorus`, `subtle vibrato`, `falsetto`, `spoken-word delivery`.
3. **Actitud Interpretativa**: `vulnerable`, `confident`, `melancholic`, `aggressive`, `conversational`.
4. **Tratamiento Espacial**: `dry close-miked lead vocal`, `vocal clearly above guitars`, `minimal processing`.

### B. El Hack del Etiquetado Estético
Si se requiere una referencia directa de la industria, se puede inyectar en la caja de estilo el nombre del artista acompañado de sufijos conceptuales de anclaje como `inspiration` o `esthetic`:
- Ejemplo: `early 80s analog synth pop, Adele inspiration, warm alto lead`

El algoritmo procesa la referencia estética sin bloquear la generación, desplegando un aviso informativo pero reteniendo la huella tímbrica deseada en el vector de atención.

---

## 5. Arquitectura de Métrica, Metatags y Directivas Sección por Sección

Dentro del campo *Lyrics*, el texto delimitado entre corchetes actúa como marcador de segmentación compositiva y reasignación de pesos de prominencia melódica.

### Catálogo Operativo de Metatags

| Categoría de Etiqueta | Sintaxis Aceptada | Impacto en el Arreglo de v6 |
| :--- | :--- | :--- |
| **Estructura Principal** | `[Intro]`, `[Verse]`, `[Pre-Chorus]`, `[Chorus]`, `[Bridge]`, `[Outro]` | Define la segmentación compositiva y reasigna los pesos de prominencia melódica. |
| **Transición y Desarrollo** | `[Pre-Chorus]`, `[Post-Chorus]`, `[Interlude]`, `[Refrain]`, `[Hook]` | Induce cambios en la tensión armónica y prepara la entrada del motivo principal. |
| **Dinamización Instrumental** | `[Break]`, `[Build]`, `[Drop]`, `[Solo]`, `[Instrumental]` | Atenúa o silencia la voz lead para priorizar pasajes solistas o descargas rítmicas. |
| **Cierre Compositivo** | `[Outro]`, `[Fade Out]`, `[End]`, `[Big Finish]` | Establece la conducta de finalización: resolución cadencial, desvanecimiento o cierre seco. |

### Directivas Locales y Pipe-Stacking
Suno v6 permite inyectar instrucciones de interpretación local dentro de los propios corchetes estructurales utilizando la técnica de tubería o *pipe-stacking*. Esta sintaxis agrupa las directivas en un solo lapso de tokens, garantizando una prioridad inequívoca:
- Ejemplo: `[Chorus | Anthemic | Stacked Harmonies | Wide Stereo Guitars | Explosive Drums]`

Asimismo, se pueden utilizar anotaciones vocales entre paréntesis situadas en una línea dedicada justo antes del verso a interpretar: `(whispered)`, `(belted)`, `(falsetto)`. Se recomienda limitar estas marcas a dos o tres momentos estratégicos por canción para evitar sobrecargar el contexto.

### Control de Entradas Vocales Instantáneas (El Hack `[***]`)
Para evitar que la IA genere introducciones instrumentales aleatorias y forzar una entrada vocal milimétrica desde el primer segundo, se inyecta la siguiente estructura al inicio del campo *Lyrics*:

```text
[***]
[start_on_through]
[start_on_"Primeras palabras de tu letra"]
Primeras palabras de tu letra...
```

### Cierre de Estructura Incondicional (`[End]`)
Para evitar que el motor sobrepase el final natural de la canción generando rellenos instrumentales o desvanecimientos no deseados, la última línea del campo *Lyrics* debe contener únicamente la etiqueta `[End]`. Este demarcador terminal presenta una efectividad comprobada del 85% al 90%.

---

## 6. Matriz de Diagnóstico y Depuración de Anomalías Acústicas

Durante el proceso de síntesis pueden emerger anomalías acústicas o desviaciones del brief inicial. La siguiente matriz establece el protocolo metódico de depuración:

| Síntoma Acústico | Causa Algorítmica Probable | Protocolo de Corrección Técnico |
| :--- | :--- | :--- |
| **Voz Ahogada o Aplanada en la Mezcla** (*Buried Vocal*) | Arreglo instrumental demasiado denso; reescritura automática por Variety. | 1. Añadir `vocal way up front` o `dry close-miked lead vocal` en Style.<br>2. Reducir la instrumentación a 2-4 elementos principales.<br>3. Mover a Exclude: `heavy reverb, washed vocals, dense arrangement`.<br>4. Fijar Variety = 0 y activar Max Mode. |
| **Oscilación Estéreo Vocales** (*Vocal Panning Drift*) | Inestabilidad en la fase espacial del espacio latente. | 1. Fijar Variety = 0.<br>2. Reducir Weirdness a un rango entre 30 y 40.<br>3. Elevar Style Influence a 75% - 85%.<br>4. Probar la generación en el modelo `v6-wild` o aplicar Remaster en intensidad Subtle. |
| **Pérdida de Brillo en los Agudos** (> 150 segundos) | Saturación del espacio latente en inferencia estándar. | Activar **Max Mode** (asigna el doble de capacidad computacional para preservar la respuesta en frecuencia en toda la extensión). |
| **Deriva Hacia Pop Genérico** (*Pop Gravity Well*) | Uso de términos ambiguos ("catchy", "modern") o apilamiento de estilos opuestos. | 1. Anclar una década específica (ej. `early 1980s synth pop`).<br>2. Mover a Exclude: `modern pop, generic EDM, autotune`.<br>3. Elevar Style Influence a 80%. |
| **Cortes Abruptos o Exceso de Relleno Final** | Ausencia de marcador terminal explícito. | Colocar la etiqueta `[End]` en la última línea del campo *Lyrics* e inyectar `[Fade Out]` o `[Big Finish]` en el *Outro*. |

---

## 7. Flujos de Trabajo Avanzados: Edición Quirúrgica, Stems e Integración en DAW

### A. Edición Quirúrgica e Inpainting (*Replace Section*)
Cuando una pista es satisfactoria en un 90% pero contiene un error puntual en un verso o un solo disonante, no se debe regenerar la canción completa. 
1. Seleccionar **Edit → Replace Section** en el menú de la canción.
2. Sombrear el rango en la forma de onda (extensión recomendada: **10 a 30 segundos** para proveer suficiente contexto armónico).
3. Modificar el texto o las etiquetas dentro de la caja de edición.
4. Para añadir tiempo nuevo (ej. un intermedio instrumental entre coro y estrofa), desactivar el interruptor **Make Same Length as Section**.
5. Audicionar las variantes de parche y consolidar la canción completa (*Full Song*).

### B. Ensamblaje y Mashup de Generaciones Hermanas (*Sibling Mashup*)
Dado que dos renders derivados de una misma solicitud exploran vectores estocásticos complementarios, la función *Mashup* permite combinar ambas variantes en una sola estructura unificada, especificando los roles de cada fuente:
- Ejemplo de brief de Mashup: *"Take the vocal performance from Source A and combine it with the drum energy and bassline from Source B, maintaining an 80s synthwave production."*

### C. Separación de Stems y Exportación Profesional a DAW
Suno v6 ofrece tres modalidades de aislamiento de pistas para la cadena de post-producción:
1. **Split from Mix** (2 stems): Aísla cualquier elemento individual seleccionado (voz o instrumento específico) frente al resto de la mezcla.
2. **Auto Split** (12 stems): Separa el track en 12 categorías clásicas de instrumentos y voces.
3. **Advanced Split** (~100 instrumentos, exclusivo Premier): Permite la selección quirúrgica de fuentes tímbricas individuales.

#### Cadena de Exportación a DAW
Para lograr un máster comercial de calidad de estudio:
1. Exportar los stems en formato **WAV no comprimido**.
2. Importar los archivos WAV a tu DAW de preferencia (FL Studio, Ableton Live, Logic Pro, Pro Tools, Reaper o Limbus Studio).
3. Configurar la sesión de trabajo a **24-bit o 32-bit flotante y frecuencia de muestreo de 48kHz a 96kHz**.
4. Aplicar ecualización sustractiva en la zona de medios-graves (200Hz - 400Hz) para eliminar el enmascaramiento residuo de la IA.
5. Utilizar los archivos MIDI exportados desde Suno Studio 2.0 para re-amplificar o doblar las líneas de bajo y sintetizadores con VSTs externos de alta gama.
