# URBINA Studio

> **© 2026 URBINA ASESORÍA E INVERSIONES S.A.C. Todos los derechos reservados.**
> Software propietario. Ver [LICENSE](./LICENSE). Queda prohibida su reproducción, distribución o
> explotación comercial sin autorización expresa y por escrito del titular.

Laboratorio de audio que se ejecuta **íntegramente en el navegador**: diagnóstico técnico de un máster,
corrección con DSP real y certificación de integridad con SHA-256. **Ningún archivo de audio se sube a
un servidor.**

---

## Arranque

```bash
npm install
npm run dev        # http://localhost:5180
npm run build      # typecheck + build de producción (dist/)
npm run preview    # sirve dist/
```

Requiere Node 24+ y un navegador con Web Audio, Web Crypto, IndexedDB y Web Workers de módulo
(Chromium, Firefox o Safari recientes).

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Typecheck + build de producción |
| `npm run typecheck` | Solo comprobación de tipos |
| `npm test` | Batería de verificación del motor (Node nativo, sin dependencias) |
| `npm run lint` | ESLint (requiere `npm install` con red) |
| `npm run format` | Prettier |
| `npm run test:e2e` | Playwright (requiere `npx playwright install`) |
| `npm run audit:deps` | Auditoría de vulnerabilidades |
| `npm run model:train` | Reentrena el modelo con un dataset etiquetado (ver abajo) |

> **Nota de entorno:** `npm test` funciona sin dependencias porque usa el runner nativo de Node 24 con
> eliminación de tipos. `lint`, `format` y `test:e2e` necesitan las dependencias de desarrollo instaladas.

---

## Qué hace y qué no

| Módulo | Implementación | Honestidad |
| --- | --- | --- |
| **Escáner** | DSP local: 8 señales medidas (microtiming, rejilla, extensión de agudos, piso de ruido, estéreo, rango dinámico…) combinadas en un índice explicable | Índice **heurístico**, `calibrated: false`. No es un clasificador entrenado ni predice plataformas |
| **Humanizador** | Procesado real de muestras: wow/flutter, transitorios, saturación, M/S, aire, ruido, DC | WAV 24-bit descargable + **verificación automática** de si el índice mejora o empeora |
| **Coverizador** | 3 cadenas DSP deterministas: Acústico, Lo-fi, Club | No son covers generados por IA; se declara en la UI |
| **Escudo** | SHA-256 real (Web Crypto) + certificado local verificable | Prueba de integridad y fecha local. No es una transacción de Bitcoin |
| **Informe** | Vista imprimible A4 con motor, señales, módulos, recomendaciones y trazabilidad | PDF vía diálogo del navegador |
| **Créditos / planes** | Simulados y marcados como tales | **Pago simulado**: no se cobra dinero |
| **Mixing / Mastering IA** | Bloqueados | **PRÓXIMAMENTE**, sin resultados inventados |
| **Catálogo Suno** | 6 grupos, 24 géneros y 72 prompts curados localmente | Datos propios, no se reproduce la cifra del producto original |

El audio nunca sale del equipo. Los blobs, escaneos, renders y certificados se guardan en IndexedDB.

---

## Motor de análisis (v2)

La v2 sustituye el índice anterior por una arquitectura en dos capas separadas y verificables:

```
audio ──▶ features.ts ──▶ model.ts ──▶ analyzer.ts ──▶ informes y UI
          (mide)          (juzga)       (orquesta)
          puro, testeable  explicable    Web Worker
```

### `src/lib/audio/features.ts` — capa de medición

Extracción en **una sola pasada STFT** con buffers reutilizados. Cada característica documenta sus
unidades y su dirección de interpretación. Destacan:

- **`transientJitterMs` / `gridLock`** — microtiming real: los ataques se refinan en el dominio del
  tiempo (resolución de 0,5 ms) y se mide su dispersión local respecto al IOI mediano.
- **`spectralEdgeHz`** — borde espectral por bandas de 1/3 de octava (55 dB por debajo del máximo),
  robusto frente al pico de graves típico de una mezcla.
- **`noiseFloorDbfs` / `silenceRatio`** — piso de ruido real (percentil 5 del RMS en ventanas de 50 ms)
  y proporción de silencio digital.
- **`estimateBpm`** — tempo por IOI mediano con validación por autocorrelación y preferencia perceptual
  (resuelve el error de octava que reportaba 85 BPM en un click-track de 128).
- **`hfDecorrelation`** — correlación en agudos para detectar canales idénticos.

### `src/lib/audio/model.ts` — capa de decisión

Ocho señales con peso documentado y contribución firmada al logit. El resultado incluye **qué señal
empuja el índice y cuánto**, lo que hace el informe auditable en lugar de una caja negra.

`MODEL_META.calibrated = false` es deliberado: los pesos provienen de criterio de ingeniería, no de un
ajuste supervisado sobre audio real etiquetado. Para activar un modelo entrenado:

```bash
npm run dataset:make    # genera el dataset etiquetado de calibración
npm run model:train     # entrena, valida (AUC) y escribe los pesos
```

Solo debe marcarse `calibrated: true` cuando la validación cruzada sobre audio **real** supere AUC 0,85.

### Rendimiento

- El análisis corre en un **Web Worker** (`analyzeClient.ts`): 0 ms de bloqueo del hilo de interfaz.
- `fft.ts` reutiliza buffers: antes asignaba ~400 MB de basura para un track de 4 minutos.
- Escaneo rápido: FFT 2048 (≈21,5 Hz/bin) y muestra de 90 s. Escaneo profundo (Pro): track completo y
  FFT 4096 (≈10,8 Hz/bin).

---

## Rutas

| Ruta | Pantalla |
| --- | --- |
| `/` | Inicio / resumen |
| `/projects`, `/projects/:id` | Proyectos y detalle |
| `/scan` | Escáner |
| `/forensic` | Diagnóstico forense |
| `/humanizer` | Humanizador |
| `/suno` | Catálogo de prompts |
| `/shield` | Sellado y verificación |
| `/coverizador` | Coverizador DSP |
| `/billing` | Planes y créditos |
| `/profile` | Perfil |
| `/legal` | Aviso legal y titularidad |
| `/report/:scanId` | Informe imprimible (fuera del shell) |

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
    decode.ts             Decodificación Web Audio
  lib/storage/            IndexedDB, preferencias, semilla y estado global
  lib/data/               Géneros de referencia, países, catálogo de prompts
  components/             Shell, navegación, gráficos, reproductor, error boundary
  pages/                  Una página por ruta (+ /legal)
  styles/                 Tokens, tipografía, layout, componentes, páginas, marca
tests/
  engine.test.ts          Batería del motor (node:test)
  fixtures.ts             Señales de perfil conocido
  diagnose.ts             Diagnóstico de características y contribuciones
scripts/                  Dataset y entrenamiento del modelo
```

- **Estado:** React Context con persistencia automática.
- **Datos:** IndexedDB `urbina-studio` (`projects`, `scans`, `audio`, `renders`, `certs`); preferencias en
  `localStorage` (`urbina.prefs.v1`).
- **Marca:** todo el nombre y la titularidad viven en `src/lib/brand.ts`. Para rebautizar el producto se
  cambia ese archivo y nada más.

## Verificación

```bash
npm test
```

Cubre: FFT, tempo (90/128/160 BPM), piso de ruido, silencio digital, borde espectral, microtiming,
imagen estéreo, discriminación del modelo y reproducibilidad del informe.

Criterio de aceptación del núcleo: un patrón perfectamente cuantizado debe puntuar **> 70** y una
interpretación con microtiming **< 30**, con una diferencia **≥ 40 puntos**.

## Despliegue

`dist/` es estático: sirve desde cualquier CDN o alojamiento estático. Para el informe imprimible y las
rutas profundas, configura *fallback* a `index.html`.

## Estado del proyecto

Ver [PLAN-MAESTRO-URBINA.md](./PLAN-MAESTRO-URBINA.md) para la auditoría, la hoja de ruta y el estado de
cada fase.

## Evidencia de auditoría

`_recon/` y `_audit/` están excluidos del repositorio (ver `.gitignore`) y no forman parte del bundle.
