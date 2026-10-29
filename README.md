# SoundLab AI

> **© 2026 URBINA ASESORÍA E INVERSIONES S.A.C. Todos los derechos reservados.**
> Software propietario. Ver [LICENSE](./LICENSE). Queda prohibida su reproducción, distribución o
> explotación comercial sin autorización expresa y por escrito del titular.
>
> *"SoundLab" es un término descriptivo y genérico: antes de registrar la marca conviene verificar su
> disponibilidad en INDECOPI (clases 9 y 42) y valorar añadir un distintivo propio.*

Laboratorio de audio que se ejecuta **íntegramente en el navegador**: diagnóstico técnico de un máster,
compositor de producción para Suno, corrección con DSP real y certificación de integridad con SHA-256.
**Ningún archivo de audio se sube a un servidor.**

---

## Arranque

```bash
npm install
npm run dev        # http://localhost:5180
npm run build      # typecheck + build de producción (dist/)
npm run preview    # sirve dist/
```

Requiere Node 24+ y un navegador con Web Audio, Web Crypto, IndexedDB y Web Workers de módulo.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Typecheck + build de producción |
| `npm test` | Batería de verificación del motor (Node nativo, sin dependencias) |
| `npm run lint` / `format` | ESLint / Prettier (requieren dependencias instaladas) |
| `npm run test:e2e` | Playwright (requiere `npx playwright install`) |
| `npm run dataset:ingest` | Genera un dataset etiquetado desde **audio real** (ver abajo) |
| `npm run dataset:make` | Dataset sintético de prueba para validar la tubería |
| `npm run model:train` | Entrena, valida (AUC) y exporta pesos |

> **Nota de entorno:** `npm test` funciona sin dependencias porque usa el runner nativo de Node 24 con
> eliminación de tipos.

---

## Módulos

| Módulo | Implementación | Honestidad |
| --- | --- | --- |
| **Escáner** | DSP local: 8 señales medidas (microtiming, rejilla, extensión de agudos, piso de ruido, estéreo, rango dinámico…) combinadas en un índice explicable | Índice **heurístico**, `calibrated: false`. No es un clasificador entrenado ni predice plataformas |
| **Compositor Suno** | Motor determinista PRO FLOW de 5 pasos: style prompt en inglés, letra estructurada, exclusiones, weirdness/influence y exportación de pack | **No genera música ni letras.** Construye el set de parámetros que Suno interpreta mejor |
| **Humanizador** | Procesado real de muestras: wow/flutter, transitorios, saturación, M/S, aire, ruido, DC | WAV 24-bit + **verificación automática** de si el índice mejora o empeora |
| **Coverizador** | 3 cadenas DSP deterministas: Acústico, Lo-fi, Club | No son covers generados por IA |
| **Escudo** | SHA-256 real (Web Crypto) + certificado local verificable | Prueba de integridad y fecha. No es una transacción de Bitcoin |
| **Informe** | Vista imprimible A4 con motor, señales, módulos, recomendaciones y trazabilidad | PDF vía diálogo del navegador |
| **Créditos / planes** | Simulados y marcados como tales | **Pago simulado** |
| **Mixing / Mastering IA** | Bloqueados | **PRÓXIMAMENTE**, sin resultados inventados |

---

## Motor de análisis (v2)

```
audio ──▶ features.ts ──▶ model.ts ──▶ analyzer.ts ──▶ informes y UI
          (mide)          (juzga)       (orquesta)
          puro, testeable  explicable    Web Worker
```

- **`features.ts`** — extracción en una sola pasada STFT con buffers reutilizados. Microtiming con
  refinado sub-milisegundo, borde espectral por bandas de 1/3 de octava, piso de ruido real (p5 del RMS),
  tempo por IOI mediano con validación por autocorrelación, correlación en agudos.
- **`model.ts`** — 8 señales con peso documentado y contribución firmada al logit. El informe dice qué
  señal empuja el resultado y cuánto.
- **`analyzeClient.ts` + `analyzer.worker.ts`** — análisis en Web Worker, cancelable, con dos niveles:
  rápido (FFT 2048 + muestra de 90 s) y profundo (track completo, FFT 4096).

`MODEL_META.calibrated = false` es deliberado. Para activar un modelo entrenado, ver la sección de
calibración.

### Verificación

```bash
npm test
```

15 pruebas: FFT, tempo (90/128/160 BPM), piso de ruido, silencio digital, borde espectral, microtiming,
imagen estéreo, discriminación del modelo y reproducibilidad. Criterio de aceptación: un patrón
perfectamente cuantizado debe puntuar **> 70** y una interpretación con microtiming **< 30**, con una
diferencia **≥ 40 puntos** (hoy: 75,6 frente a 13,0).

---

## Calibración con audio real

Es el paso que convierte el índice en un detector defendible. El modelo actual usa pesos de criterio de
ingeniería; con audio etiquetado se entrena una regresión logística y se valida con AUC.

### 1. Prepara las carpetas

```
Calibracion/
  humanas/     ← pistas reales o comerciales
  ia/          ← pistas generadas con IA
```

Requisitos para que la calibración sea válida:

| Requisito | Por qué |
| --- | --- |
| **120–200 pistas por clase** | Con menos, la AUC es ruido. El script avisa por debajo de 60 |
| **WAV PCM** (44,1 o 48 kHz) | El ingestor decodifica WAV 8/16/24/32 bits y float32. Para MP3/M4A/FLAC: `ffmpeg -i in.mp3 -ac 2 -ar 44100 out.wav` |
| **Emparejadas por género** | Si las humanas son rock y las IA son reggaetón, el modelo aprende género, no origen |
| **Sin duplicados** entre carpetas | La misma pista transcodificada en ambas clases arruina la validación |
| **≥ 2 generadores distintos** (Suno, Udio, Stable Audio) | Con un solo generador el modelo aprende *su* huella, no «IA» en general |
| **Trozos de 20–45 s** | El ingestor recorta a 45 s por muestra para mantener el coste bajo |
| **El audio no se distribuye** | Solo se guardan 14 números por pista; ningún archivo sale del equipo |

### 2. Genera el dataset y entrena

```bash
npm run dataset:ingest -- --human "D:/Calibracion/humanas" --ai "D:/Calibracion/ia"
npm run model:train -- --dataset data/dataset.real.json
```

El entrenador imprime exactitud, matriz de confusión y **AUC** sobre un 20 % reservado, y escribe
`data/weights.trained.json`. Solo si el AUC supera **0,85 sobre audio real** se copian los pesos a
`src/lib/audio/model.ts` y se marca `MODEL_META.calibrated = true`.

> **Advertencia de integridad:** el dataset sintético (`dataset:make`) sirve para probar la tubería, no
> para calibrar. Un AUC 1,000 sobre datos sintéticos no dice nada sobre audio real.

---

## Rutas

| Ruta | Pantalla |
| --- | --- |
| `/` | Inicio / resumen |
| `/projects`, `/projects/:id` | Proyectos y detalle |
| `/scan` | Escáner |
| `/compositor` | **Compositor de producción para Suno** |
| `/suno` | Catálogo de géneros y prompts |
| `/humanizer` | Humanizador |
| `/forensic` | Diagnóstico forense |
| `/shield` | Sellado y verificación |
| `/coverizador` | Coverizador DSP |
| `/billing`, `/profile` | Planes y perfil |
| `/legal` | Aviso legal y titularidad |
| `/report/:scanId` | Informe imprimible |

Las rutas se cargan con `React.lazy`: el bundle inicial solo incluye el shell y la pantalla de inicio.

---

## Estructura

```
src/
  lib/brand.ts            Identidad de marca y titularidad — FUENTE ÚNICA
  lib/audio/
    features.ts           Medición acústica (puro)
    model.ts              Índice explicable (pesos documentados)
    analyzer.ts           Orquestación → AnalysisResult
    analyzeClient.ts      Cliente del worker + niveles de escaneo
    analyzer.worker.ts    Worker de análisis
    fft.ts                FFT con buffers reutilizables
    loudness.ts           ITU-R BS.1770-4, LRA, true peak
    wav.ts                Codificador WAV 24-bit + DSP de humanización y covers
  lib/suno/
    limits.ts             Límites reales de los campos de Suno
    composer.ts           Motor PRO FLOW determinista + pack exportable
  lib/storage/            IndexedDB, preferencias, semilla y estado global
  lib/data/               Géneros de referencia, países, catálogo Suno
  components/             Shell, navegación, gráficos, reproductor, error boundary
  pages/                  Una página por ruta (+ /legal, /compositor)
  styles/                 Tokens, tipografía, layout, componentes, páginas, marca, premium
tests/
  engine.test.ts          Batería del motor (node:test)
  fixtures.ts             Señales de perfil conocido
  diagnose.ts             Diagnóstico de características y contribuciones
scripts/
  ingest-real-audio.mjs   Ingesta de audio real etiquetado
  make-dataset.mjs        Dataset sintético de prueba
  train-model.mjs         Entrenamiento y validación
```

- **Estado:** React Context con persistencia automática.
- **Datos:** IndexedDB `soundlab-ai`; preferencias en `localStorage` (`soundlab.prefs.v1`).
- **Marca:** todo el nombre y la titularidad viven en `src/lib/brand.ts`.

## Despliegue

`dist/` es estático. Para el informe imprimible y las rutas profundas, configura *fallback* a
`index.html`. Sustituye el dominio de `index.html` (`canonical` y Open Graph) antes de publicar.

## Estado del proyecto

Ver [PLAN-MAESTRO-URBINA.md](./PLAN-MAESTRO-URBINA.md) para la auditoría, la hoja de ruta y el estado de
cada fase.

`_recon/` y `_audit/` están excluidos del repositorio (ver `.gitignore`) y no forman parte del bundle.
