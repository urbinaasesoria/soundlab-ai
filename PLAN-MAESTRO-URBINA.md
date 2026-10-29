# PLAN MAESTRO DE PRODUCTO — AUDITORÍA Y HOJA DE RUTA

> **Titularidad:** este software, su código fuente, su diseño de interfaz, su marca y su documentación son
> **propiedad exclusiva de URBINA ASESORÍA E INVERSIONES S.A.C.**
> © 2026 URBINA ASESORÍA E INVERSIONES S.A.C. — Todos los derechos reservados.
> Documento interno de dirección técnica. No distribuir.

| Campo | Valor |
| --- | --- |
| Proyecto auditado | `re-narmia` (nombre en clave) |
| Fecha de auditoría | 29 de octubre de 2026 |
| Base analizada | 47 archivos fuente, ~18.100 líneas (10.625 TS/TSX + 7.464 CSS) |
| Método | lectura completa del código + compilación + ejecución real en navegador + 6 fixtures de audio de perfil conocido |
| Alcance | estado funcional, calidad técnica, potencial comercial, riesgos legales |

---

## 0. Resumen ejecutivo

### Veredicto en una frase

Es un **producto de demostración visualmente sobresaliente con un motor de decisión que todavía no sostiene su promesa**. La capa de presentación está a nivel de producto comercial; el núcleo algorítmico, la ingeniería de proceso y el modelo de negocio no.

### Nota por dimensión

| Dimensión | Nota | Comentario |
| --- | --- | --- |
| Diseño e interfaz | **9,0 / 10** | Nivel SaaS premium real. Tokens, tipografía, jerarquía, estados vacíos, responsive y modo claro/oscuro están resueltos. |
| Cobertura funcional | **8,0 / 10** | 12 rutas, 6 herramientas activas y 2 bloqueadas con honestidad, persistencia real, render WAV 24-bit, SHA-256, informe imprimible. Nada está "a medias" a nivel de flujo. |
| Calidad de ingeniería | **4,5 / 10** | Sin control de versiones, sin tests, sin lint, sin CI, sin manejo de errores global, bundle monolítico. |
| **Solidez del núcleo (motor de IA)** | **3,0 / 10** | **El índice no discrimina entre material sintético y humano. El humanizador empeora la puntuación.** |
| Preparación comercial | **2,5 / 10** | Sin backend, sin cuentas, sin pagos reales, con marca de terceros en 89 puntos del código. |

### Lo que está probado y funciona (ejecutado en navegador)

- `npm run typecheck` y `npm run build`: **limpios**, 0 errores.
- Las **12 rutas** renderizan sin errores de JavaScript y sin desbordamiento horizontal en escritorio (1440 px) ni en móvil (390 px).
- **Escáner**: decodifica, analiza 35 s de audio en ~1,3 s y persiste el informe en IndexedDB.
- **Humanizador**: renderiza DSP real y guarda un WAV 24-bit reproducible (~6,7 s para 35 s de audio).
- **Coverizador**: genera 3 reinterpretaciones DSP y las persiste.
- **Escudo**: calcula SHA-256 real (`61c86ec0…f0d5`), sella el certificado y lo lista correctamente.
- **Informe**: vista imprimible con CSS `@page A4`, 2.572 px de alto, todos los módulos y aviso legal.

### Lo que impide venderlo hoy

1. **El índice de IA no discrimina.** Un archivo con rejilla perfecta, sin ruido y estéreo idéntico puntuó **37,2 %**; un archivo con microtiming humano puntuó **35,7 %**. Diferencia: **1,5 puntos**. Un tono puro con ruido blanco puntuó **53,2 %**, más alto que ambos.
2. **El humanizador empeora el resultado.** Antes 35,7 % → después **37,6 %**. La función que justifica el precio va en la dirección contraria.
3. **El 28 % del peso del índice está muerto.** Tres de las diez señales (`hf`, `noise`, `codec`, pesos 0,12 + 0,10 + 0,06) valieron exactamente **0 en los seis archivos probados**. El techo matemático del índice es **76,3 %**, así que la zona "PELIGRO" (>70 %) es prácticamente inalcanzable.
4. **No hay control de versiones.** No existe `.git`. No hay copia de seguridad ni historial de cambios.
5. **La marca no es propia.** La app muestra la marca de un tercero en **89 menciones (entre la marca y la palabra «réplica») repartidas en 27 archivos**, y el repositorio incluye el material de ingeniería inversa del producto original.
6. **El modelo de cobro es inmune.** Los créditos y el plan Pro viven en `localStorage`: cualquiera los edita con dos clics.

---

## 1. Titularidad, marca y propiedad intelectual

### 1.1 Declaración de propiedad a incorporar

Texto canónico (usar literalmente, sin variaciones, en todas las ubicaciones):

```
© 2026 URBINA ASESORÍA E INVERSIONES S.A.C. Todos los derechos reservados.
```

Versión larga para páginas legales y pie del informe PDF:

```
Este software, su código fuente, su arquitectura, su interfaz gráfica, su motor de análisis
de audio "NRM-LOCAL", su documentación y su marca son propiedad exclusiva de
URBINA ASESORÍA E INVERSIONES S.A.C. Queda prohibida su reproducción, distribución,
modificación o uso comercial sin autorización expresa y por escrito del titular.
© 2026 URBINA ASESORÍA E INVERSIONES S.A.C. Todos los derechos reservados.
```

### 1.2 Dónde debe aparecer (8 ubicaciones obligatorias)

| # | Ubicación | Archivo | Detalle |
| --- | --- | --- | --- |
| 1 | `<title>` y meta | `index.html` | `… — URBINA ASESORÍA E INVERSIONES S.A.C.` |
| 2 | Metadatos del proyecto | `package.json` | campos `author` y `license: "UNLICENSED"` |
| 3 | Archivo de licencia | `LICENSE` (nuevo) | licencia propietaria, no OSS |
| 4 | Pie del sidebar | `src/components/Sidebar.tsx` | línea de copyright discreta bajo el logo |
| 5 | Boot screen | `src/App.tsx` | `© URBINA ASESORÍA E INVERSIONES S.A.C.` bajo "NARMIA" |
| 6 | Pie del informe imprimible | `src/pages/Report.tsx` | en cada hoja A4 (es el activo que se filtra) |
| 7 | JSON del certificado | `src/pages/Shield.tsx` | campo `owner` dentro del JSON descargable |
| 8 | Nueva ruta `/legal` | `src/pages/Legal.tsx` (nuevo) | Aviso legal, propiedad intelectual, privacidad, RGPD/Ley 29733 (Perú) |

### 1.3 Riesgo de propiedad intelectual — bloqueante para comercializar

**Situación actual:** el proyecto declara abiertamente ser una réplica de NARMIA Studio. Reproductor del problema:

- 89 menciones en 27 archivos, contando la marca del tercero (`NARMIA`, `Narmia`, `narmia`) y la palabra `réplica`/`replica`.
- `_recon/` contiene **3,4 MB de evidencia de ingeniería inversa**: capturas de todas las pantallas del producto original, el HTML capturado, `informe-narmia.pdf` (el informe de autenticidad original de 464 KB) y las respuestas de su API.
- La estructura de navegación, los nombres de las herramientas ("Escanear", "Humanizador", "Escudo Protector", "Coverizador", "Prompts Suno"), los textos de marketing y la disposición del dashboard replican el producto original.
- `package.json` describe el proyecto como "Réplica funcional de NARMIA Studio".
- El `README.md` reconoce que la marca y los textos "pertenecen a sus autores".

**Esto no es un detalle de estilo: es el activo que se está comprando y vendiendo.** Un producto que se comercializa con la marca, el trade dress y los textos de un competidor expone a URBINA a un reclamo por competencia desleal, infracción marcaria y violación de derechos de autor, además de bloquear canales de pago (Stripe/PayPal rechazan productos que replican marcas de terceros) y de distribución.

**Acciones obligatorias antes de cualquier lanzamiento (Fase 0):**

- [ ] Elegir marca propia y registrarla (INDECOPI, clases 9 y 42). Candidatas: **NAVIA**, **AURIA**, **SONORA**, **URBINA AUDIO LAB**. Verificar disponibilidad antes de decidir; no usar dominios sin comprobar.
- [ ] Sustituir las 89 referencias. Esfuerzo medido: **1–2 días** (concentrado en `Report.tsx` 11, `Profile.tsx` 7, `Billing.tsx` 6, `Suno.tsx` 4).
- [ ] Reescribir el copy de marketing con voz propia. No reutilizar frases del original.
- [ ] Rediseñar el layout lo suficiente para no ser confundible (el sistema visual propio ya existe: tipografías, tokens y componentes son originales; basta variar la disposición del dashboard).
- [ ] **Eliminar `_recon/` del repositorio y del historial de git** antes del primer commit (ver Fase 0). Conservarlo en almacenamiento privado de URBINA como evidencia de auditoría, nunca en el repo del producto.
- [ ] Sustituir `informe-narmia.pdf` por el informe propio generado por la app.
- [ ] Borrar la palabra "réplica" de todo el producto: es la confesión escrita del problema.

### 1.4 Reposicionamiento recomendado (estratégico)

El producto actual se vende como **"reduce tu probabilidad de detección de IA para que no te bajen el track"**. Ese posicionamiento tiene tres problemas: es verificablemente falso hoy (§3), invita a conflictos con las políticas de divulgación de IA de Spotify/YouTube/TikTok, y no se puede sostener técnicamente porque ningún sistema local puede predecir el clasificador de una plataforma.

**Posicionamiento recomendado, defendible y premium:**

> **Un laboratorio de calidad y trazabilidad de audio** que mide objetivamente lo que sí se puede medir
> (loudness ITU-R BS.1770, rango dinámico, fase, extensión de agudos, microtiming, coherencia estéreo),
> compara tu máster contra referencias de tu género, documenta la autoría con huellas SHA-256
> y te dice exactamente qué mejorar. Sin promesas de evasión: con datos.

Esto conserva el 100 % del valor construido, elimina el riesgo legal y de plataforma, y abre un mercado más amplio (productores, sellos, estudio de mastering, docencia) que el nicho "evasión de detectores". El índice de IA pasa a ser una señal secundaria, explícitamente etiquetada como heurística experimental.

---

## 2. Estado actual medido (evidencia reproducible)

### 2.1 Compilación y entrega

| Métrica | Valor observado | Valor objetivo |
| --- | --- | --- |
| `tsc --noEmit` | ✅ 0 errores | mantener |
| `vite build` | ✅ 1.732 módulos, 2,30 s | mantener |
| JS de producción | 554,42 kB / **169,33 kB gzip** (1 solo chunk) | < 120 kB gzip inicial, con code-splitting |
| CSS de producción | 133,23 kB / 26,47 kB gzip | mantener |
| Fuentes | **358 kB en 23 archivos** (4 familias) | < 140 kB (2 familias, solo `woff2`) |
| Peso total `dist/` | 1,05 MB en 27 archivos | < 600 kB |
| Peso muerto detectado | **58 kB** en `.woff` legacy de `instrument-serif` (redundante con `woff2`) | eliminar |

### 2.2 Rutas (todas verificadas en navegador)

| Ruta | Estado | Errores JS | Contenido |
| --- | --- | --- | --- |
| `/` | OK | 0 | 1.430 chars |
| `/projects` | OK | 0 | 777 chars |
| `/projects/:id` | OK | 0 | incluye pestañas Mixing/Mastering bloqueadas |
| `/scan` | OK | 0 | flujo completo |
| `/forensic` | OK | 1 warning SVG (`height="auto"`) | 2.814 chars |
| `/humanizer` | OK | 0 | flujo completo |
| `/suno` | OK | 0 | catálogo local |
| `/shield` | OK | 0 | flujo completo |
| `/coverizador` | OK | 0 | flujo completo |
| `/billing` | OK | 0 | pagos simulados |
| `/profile` | OK | 0 | 3.784 chars |
| `/report/:id` | OK | 0 | imprimible |
| `*` (desconocida) | redirige a `/` | 0 | correcto |

### 2.3 Motor de análisis — experimento con 6 fixtures de perfil conocido

Se generaron archivos WAV de 30–35 s con características acústicas controladas y se ejecutó el escáner real en el navegador:

| Fixture | Perfil acústico intencionado | Prob. IA | Zona asignada | Resultado esperado |
| --- | --- | --- | --- | --- |
| `synth.wav` | Rejilla perfecta 128 BPM, cero ruido, L = R idénticos, agudos atenuados | **37,2 %** | zona segura | debería ser alto (>70) |
| `human.wav` | Microtiming ±11 ms, ruido de sala, deriva de afinación, estéreo asimétrico | **35,7 %** | zona segura | debería ser bajo (<30) |
| `mono.wav` | Seno 110 Hz + ruido blanco, sin dinámica, mono | **53,2 %** | zona de riesgo | — |
| `bright.wav` | Máster con platos y aire hasta 20 kHz (lo normal) | **44,3 %** | zona segura | — |
| `dark.wav` | Paso bajo a 6 kHz | **56,3 %** | zona de riesgo | — |
| `demo` (semilla) | **Sin audio: dato fabricado en `seed.ts`** | 5,2 % | zona óptima | ver hallazgo F-09 |

**Discriminación sintético vs. humano: 1,5 puntos sobre 100.** Es indistinguible del ruido de calibración. El motor no puede sostener la promesa del producto.

### 2.4 Señales del índice — qué se movió y qué no (6 archivos)

| Señal | Peso | Valores observados | ¿Varía? |
| --- | --- | --- | --- |
| Planitud espectral | 0,17 | 11,5 · 85,7 · 88,8 · 79,5 · 99,8 | Sí, pero **penaliza el ruido de sala**, que es señal de grabación real |
| Regularidad transitorios | 0,16 | 44,6 · 0 · 28,6 | Débil |
| **Corte de altos / brickwall** | **0,12** | **0 en los 6** | ❌ **muerta** |
| Regularidad de flujo | 0,12 | 0 · 0 · 92,8 | Dispara solo en ruido |
| Rango dinámico | 0,11 | 93,6 · 100 · 99 | Sí (saturada al alza) |
| **Ausencia de ruido** | **0,10** | **0 en los 6** | ❌ **muerta** |
| Estéreo artificial | 0,08 | 55 · 62,1 · 74,8 · 71,3 | Sí |
| **Huella de códec** | **0,06** | **0 en los 6** | ❌ **muerta** |
| Coherencia de fase | 0,04 | 96,9 · 100 | Saturada |
| Falta de aire | 0,04 | 0 · 86,6 | Sí |

**Peso permanentemente nulo: 0,28.** Techo matemático del índice: `(1 − 0,28) × 100 × 1,06 = 76,3 %`. Con los pesos restantes saturados en la práctica, el máximo observado en material real es **56,3 %**.

### 2.5 Rendimiento (medido en Chromium, hilo principal)

| Operación | Audio | Tiempo | Observación |
| --- | --- | --- | --- |
| Decodificar WAV 5,9 MB | 35 s | ~0,4 s | correcto |
| Escanear | 35 s | **1,32 s** | extrapolado a un track de 4 min: **~9 s de bloqueo del hilo principal** |
| Humanizar + 2 análisis | 35 s | **6,70 s** | ~5× tiempo real; aceptable para render, no para previsualización |
| Coverizar (3 versiones) | 35 s | ~3,9 s la primera | cola secuencial |

### 2.6 Accesibilidad

| Comprobación | Resultado |
| --- | --- |
| `lang="es"` | ✅ |
| Enlaces `label`/`for` en formularios | ✅ 0 sin etiquetar |
| Botones sin nombre accesible | ✅ 0 |
| Textos alternativos de imágenes | ✅ 0 sin `alt` |
| Orden de encabezados | ✅ sin saltos |
| **Landmark `<main>`** | ❌ **no existe** (se usa `<div class="main">`) |
| **Regiones `aria-live` en progreso de análisis** | ❌ **0** (un lector de pantalla no anuncia el avance) |
| Objetivos táctiles < 24 px | ⚠️ 4 en `/projects`, 1 en `/forensic`, 1 en `/billing` |
| Desbordamiento horizontal en móvil | ✅ ninguno en 10 rutas |

### 2.7 Ingeniería de proceso

| Elemento | Estado |
| --- | --- |
| Control de versiones | ❌ **no existe `.git`** |
| `.gitignore` | ❌ **no existe** (`node_modules`, `dist` y `_recon` se subirían al repo) |
| `LICENSE` | ❌ **no existe** (falta la licencia propietaria de URBINA) |
| Tests (unitarios/integración/e2e) | ❌ **0 tests** |
| Linter / formateador | ❌ sin ESLint ni Prettier |
| CI/CD | ❌ no existe |
| Error boundary de React | ❌ no existe (un error en un componente deja la app en blanco) |
| PWA / offline / manifest | ❌ no existe |
| Internacionalización | ❌ solo español hardcodeado |
| Analítica de producto | ❌ no existe |
| SEO (OG, Twitter, canonical, JSON-LD) | ❌ ausentes en `index.html` |
| Rate limiting / validación de entrada | N/A (no hay backend) |
| Secretos en el código | ✅ ninguno (no hay claves) |

---

## 3. Hallazgos críticos (P0) — causa raíz y corrección

### F-01 · El índice de IA no discrimina · **crítico**

**Evidencia:** sintético 37,2 % vs. humano 35,7 %. Ver §2.3.
**Causa raíz:** las diez señales se construyeron como heurísticas independientes sin calibración contra un conjunto etiquetado. Los umbrales son ad hoc (`logistic(flatness, 0.11, 22)`, `clamp01((0.35 - hfRatio) / 0.35)`) y la probabilidad final se escala con un factor fijo arbitrario (`rawProbability * 1.06`) en `src/lib/audio/analyzer.ts:643`.

**Corrección (Fase 1):**

1. Construir un **conjunto de calibración etiquetado**: mínimo 300 tracks (100 sintéticos generados con 3–4 modelos distintos, 100 grabaciones humanas, 100 híbridos). Cada uno con etiqueta de origen.
2. Reemplazar las heurísticas por un **modelo entrenado** (regresión logística al principio; gradient boosting después) ejecutado localmente. Con 12–16 features y 300 muestras, un modelo exportado a JSON es unos pocos kB y se evalúa en el navegador en microsegundos.
3. Añadir **validación cruzada estratificada** y publicar la métrica AUC/ROC en el propio informe. Si el modelo no supera AUC 0,75, no se muestra el índice como protagonista.
4. Mantener el motor 100 % local (es el diferenciador de privacidad) evaluando el modelo en el cliente.

**Criterio de aceptación:** en el conjunto de test, `synth` puntúa > 70 y `human` < 30 de forma estable; AUC ≥ 0,85; diferencia sintético–humano ≥ 40 puntos.

### F-02 · El humanizador empeora la puntuación · **crítico**

**Evidencia:** `before.ai.probability` 35,7 → `after.ai.probability` 37,6 (+1,9). Señales que decía mejorar y que empeoraron: planitud 85,7 → 90,0; estéreo 62,1 → 71,3; fase 96,9 → 100.
**Causa raíz:** doble. (a) Las tres señales que el DSP debería mover (`hf`, `noise`, `codec`) están muertas (§F-03), así que el DSP no tiene efecto medible. (b) La señal de planitud **penaliza precisamente lo que el humanizador añade**: el ruido de sala y el aire aumentan la planitud espectral y, con la fórmula actual, eso se lee como "más sintético".

**Corrección (Fase 1):** una vez recalibrado el modelo (F-01), reoptimizar los parámetros del DSP contra el objetivo declarado. Implementar un **bucle de verificación automática**: el render solo se ofrece si mejora la métrica objetivo; si empeora, se avisa al usuario y se sugiere otra configuración.

**Criterio de aceptación:** el preset por defecto reduce la métrica objetivo ≥ 5 puntos en ≥ 80 % de los tracks del conjunto de validación; nunca la empeora sin advertirlo.

### F-03 · El 28 % del peso del índice está muerto · **crítico**

**Causa raíz por señal:**

| Señal | Fórmula actual | Por qué nunca dispara |
| --- | --- | --- |
| `hf` / brickwall | `clamp01((17000 − hfCutoff) / 5000)` con `hfCutoff` = bin más agudo audible > 3 kHz | Para puntuar > 55 la frecuencia de corte medida debe bajar de **14,25 kHz**. Un MP3 de 128 kbps (corte típico 16 kHz) puntúa solo **20/100**. El umbral está desplazado un orden de magnitud. |
| `noise` | `clamp01((−68 − noiseFloor) / 26)` con `noiseFloor` = `20·log10(p10 de RMS por frame)` | Con música continua el percentil 10 del RMS está en −12 a −25 dBFS. Para puntuar algo el valor debe ser < −68 dBFS. **Solo dispara en tracks con silencios largos**, que es justo lo contrario de lo que mide la etiqueta. |
| `codec` | `clamp01((0.35 − hfRatio) / 0.35)` | `hfRatio` nunca baja de 0,35 en material real; los 6 archivos dieron valor 0. |

**Corrección:** sustituir las tres por features estándar de la literatura de detección de audio sintético: **periodicidad de la envolvente de alta frecuencia**, **estadística de la diferencia espectral entre canales (correlación de fase en HF)**, **detección de réplica espectral por arriba del corte de Nyquist aparente**, **distribución de residuos del predictor lineal** y **coherencia de microtiming**. Validar cada una contra el conjunto etiquetado antes de asignarle peso. Las features que no separen clases a `p < 0,05` se descartan en lugar de quedarse con peso muerto.

### F-04 · La "medida de suelo de ruido" no es un suelo de ruido · **alto**

`src/lib/audio/analyzer.ts:552-554` etiqueta `p10` del RMS de frame como "suelo de ruido dBFS". En los 6 archivos reportó −11,9 a −22,5 dBFS. Un silencio digital real da −∞ o < −90 dBFS. El informe muestra "Ruido de fondo · Suelo −22,5 dBFS · silencio digital: no", que es una afirmación incorrecta sobre el archivo.
**Corrección:** calcular el suelo real como percentil 5 de la **energía de trama en dBFS con ventana de 50 ms**, y detectar explícitamente tramos de silencio digital (RMS < 1e-6). Mostrar dos cifras separadas: "piso de ruido" y "% de silencio digital".

### F-05 · Detección de BPM errónea en el caso más simple · **alto**

Un click-track perfecto a 128 BPM se reportó como **85,0 BPM** (confianza 81 %). Un track humano a ~92 BPM se acertó (91,5). El `while (bestBpm < 80) *2; while (bestBpm > 180) /2` de `analyzer.ts:545-546` no corrige bien el error de octava ni los múltiplos racionales (3:2).
**Corrección:** autocorrelación sobre la envolvente de *onsets* con normalización por ventana, más verificación contra una rejilla de candidatos (incluyendo ×2/3 y ×3/2) eligiendo la fase más consistente. Test unitario obligatorio con click-tracks sintéticos de 60 a 180 BPM.

### F-06 · Análisis bloqueante con asignación masiva de memoria · **alto**

`analyzer.ts:201` ejecuta todo el DSP en el hilo principal. `fft.ts:71-83` asigna **tres `Float32Array` nuevos por trama** (`re`, `im`, `mags`) sin reutilizar buffers: para un track de 4 min son ~20.600 tramas × ~20 KB ≈ **410 MB de basura** para el recolector.
**Corrección:** mover `analyzeTrack` a un **Web Worker** (el `AudioBuffer` se transfiere como `Float32Array` con `transferable`), reintroducir buffers de trabajo reutilizables en `FFT.magnitudes` y procesar por bloques con `OfflineAudioContext`. Objetivo: **0 ms de bloqueo en el hilo de UI** y < 1,5× tiempo real en un track de 4 min.

### F-07 · Sin control de versiones ni red de seguridad · **crítico (proceso)**

No existe `.git`. Un producto comercial sin historial no se puede auditar, revertir ni mantener.
**Corrección:** `git init` + **crear `.gitignore` (tampoco existe hoy)** cubriendo `node_modules/`, `dist/`, `_recon/` y `_audit/`; primer commit sin `_recon/`; política de ramas (`main` protegida + `feat/*`); commits firmados. Añadir Vitest + Playwright + ESLint + Prettier + GitHub Actions (typecheck, lint, test, build) en el mismo sprint.

### F-08 · El cobro es trivialmente eludible · **crítico (negocio)**

Créditos y plan viven en `localStorage` (`src/lib/storage/db.ts:125-136`) y la deducción se hace en el cliente (`store.tsx:345-355`). Cualquier usuario abre DevTools y se asigna un millón de créditos.
**Corrección:** el plan y los créditos deben vivir en servidor. Ver §6: el modelo de negocio tiene que vender valor que **no se ejecuta en la máquina del usuario**.

### F-09 · El proyecto DEMO muestra un análisis fabricado sin etiqueta · **alto (integridad)**

`src/lib/storage/seed.ts:86` siembra un escaneo con `probability: 5.2` y `engine: "… (DEMO)"` **sin audio asociado**. La lista de proyectos sí muestra el chip `DEMO`, pero la tarjeta de la pantalla de inicio muestra "ÚLTIMO RESULTADO: **5 % IA · YA PROTEGIDO**" sin ninguna marca de demostración. En un producto que vende credibilidad, un dato inventado presentado como análisis propio es el peor fallo de confianza posible.
**Corrección:** marcar de forma inequívoca en todas las superficies (`DEMO · SIN AUDIO`), o mejor: generar el demo analizando un audio de muestra incluido en el bundle, para que el 5,2 % sea un número real.

### F-10 · Marca de tercero y material de ingeniería inversa en el repositorio · **crítico (legal)**

Ver §1.3.

### F-11 · Sin `<main>` ni anuncios de progreso · **medio (accesibilidad)**

`Shell.tsx:58` usa `<div className="main">`. No hay `aria-live` en el progreso del análisis. Corrección: `<main id="contenido">`, enlace "saltar al contenido", `role="status" aria-live="polite"` en el panel de progreso y en el resultado.

### F-12 · Warnings y detalles de pulido · **bajo**

- `/forensic`: `<svg height="auto">` genera warning de consola. Usar `height="100%"` o atributos CSS.
- Badge del sidebar: dice `HERRAMIENTAS 07` pero hay 8 entradas.
- Etiqueta "Masterin…" truncada en el sidebar.
- "Buenas tardes, Misiones": el saludo usa `artistName` como nombre de pila (`DEFAULT_PREFS.fullName = "Prueba Open"`, `artistName = "Misiones"`).
- 58 kB de fuentes `.woff` legacy redundantes.

---

## 4. Arquitectura objetivo

```
┌─────────────────────────────────────────────────────────────────────┐
│  CLIENTE (React 19 + Vite)                                          │
│                                                                     │
│  UI Shell ── Route modules (lazy) ── Design system (tokens CSS)     │
│     │                                                               │
│     ├── Web Worker: DSP Core (WASM opcional)                        │
│     │     ├─ decode → STFT → features (16) → modelo local (JSON)    │
│     │     ├─ loudness BS.1770 / true peak / LRA                     │
│     │     └─ render DSP (humanizer / covers) → WAV 24-bit           │
│     │                                                               │
│     ├── IndexedDB (proyectos, escaneos, renders, certs, audio)      │
│     └── PWA: manifest + service worker (offline real)               │
│                                                                     │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTPS (solo metadatos, nunca audio)
┌───────────────────────────▼─────────────────────────────────────────┐
│  BACKEND (BFF Node/Fastify o Supabase + Edge Functions)             │
│    Auth (email + OAuth) · Cuentas · Créditos (ledger servidor)      │
│    Pagos (Stripe / MercadoPago) · Webhooks                          │
│    Informes alojados + verificación pública de hash                 │
│    Anclaje de tiempo (OpenTimestamps) · Historial de versiones      │
│    Modelo de calibración versionado y firmado (descarga al cliente) │
│    Analítica de producto (PostHog) · Observabilidad (Sentry)        │
└─────────────────────────────────────────────────────────────────────┘
```

**Principios:**

1. **El audio nunca sale del dispositivo.** Es el diferenciador de privacidad y hay que mantenerlo y publicitarlo. El backend solo ve metadatos: hashes, métricas agregadas, identificadores.
2. **La calibración es servidor, la inferencia es cliente.** El modelo se entrena en servidor, se firma y se descarga; el cliente solo evalúa. Así el margen es defendible y el coste marginal por usuario es ~0.
3. **Nada que se cobre vive en el cliente.** Créditos, plan y límites se resuelven en servidor.

---

## 5. Plan de ejecución por fases

Estimaciones en **días-desarrollador** de una persona senior. Total hasta "comercializable": **≈ 69,5 d** (Fase 0 a Fase 3).

### FASE 0 — Blindaje y titularidad · 8 d · *prerrequisito absoluto*

| # | Tarea | d | Criterio de aceptación |
| --- | --- | --- | --- |
| 0.1 | Crear `.gitignore` (`node_modules/`, `dist/`, `_recon/`, `_audit/`), `git init`, primer commit **sin `_recon/`**, rama `main` protegida | 0,5 | `git log` con 1 commit; `_recon/` ausente del árbol y del historial |
| 0.2 | ESLint + Prettier + Vitest + Playwright + GitHub Actions (typecheck/lint/test/build) | 2 | CI verde en el primer PR |
| 0.3 | Error boundary global + pantalla de recuperación | 0,5 | Error forzado en un componente → UI de recuperación, no pantalla blanca |
| 0.4 | Rebranding: 89 referencias, `package.json`, `index.html`, `LICENSE` propietaria | 2 | `grep -ri "narmia\|réplica" src/` → 0 resultados |
| 0.5 | Copyright URBINA en las 8 ubicaciones (§1.2) + ruta `/legal` | 1 | Visible en app, informe impreso, JSON de certificado y metadatos |
| 0.6 | `README` propio, guía de despliegue, política de seguridad | 1 | Documento revisado |
| 0.7 | Auditoría de dependencias (`npm audit`) y política de actualizaciones | 0,5 | 0 vulnerabilidades altas |
| 0.8 | Eliminar 58 kB de `.woff` redundantes; cargar solo `woff2` | 0,5 | `dist/` < 950 kB |

### FASE 1 — Núcleo defendible · 22 d · *lo que convierte la demo en producto*

| # | Tarea | d | Criterio de aceptación |
| --- | --- | --- | --- |
| 1.1 | Conjunto de calibración etiquetado (300+ tracks: sintéticos de 4 modelos, humanos, híbridos) | 5 | Dataset versionado, splits fijos, procedencia documentada |
| 1.2 | Suite de features v2 (16 features validadas individualmente) | 4 | Cada feature con test de separación de clases documentado |
| 1.3 | Entrenamiento + exportación del modelo a JSON/WASM embebible | 3 | AUC ≥ 0,85 en test; artefacto < 100 kB |
| 1.4 | Sustituir `analyzer.ts` por inferencia del modelo `F-01` | 2 | `synth` > 70, `human` < 30, Δ ≥ 40 puntos |
| 1.5 | Corregir suelo de ruido, brickwall y BPM (`F-03`, `F-04`, `F-05`) | 3 | Tests unitarios con fixtures sintéticos de referencia |
| 1.6 | Web Worker + buffers reutilizables (`F-06`) | 2 | 0 ms de bloqueo; track de 4 min < 1,5× tiempo real |
| 1.7 | Humanizador guiado por objetivo con verificación automática (`F-02`) | 3 | Preset por defecto mejora ≥ 5 pts en ≥ 80 % de validación |

**Hito:** el producto pasa a hacer lo que promete. Sin esta fase, nada más importa.

### FASE 2 — Producto premium · 21,5 d · *lo que justifica el precio*

| # | Tarea | d | Por qué es premium |
| --- | --- | --- | --- |
| 2.1 | **Comparador A/B a ciegas con nivelación de loudness** | 3 | Es *la* función que convierte el humanizador en herramienta profesional: comparar sin sesgo de volumen |
| 2.2 | Reproductor con forma de onda interactiva (zoom, playhead, regiones, selección de sección) | 3 | Convierte gráficos estáticos en instrumento |
| 2.3 | **Comparación contra referencias de género** (usar `GENRE_TARGETS`, ya existe) | 2 | Valor inmediato y accionable: "tu máster vs. el estándar de reggaetón" |
| 2.4 | Diff entre escaneos (historial de versiones del mismo track) | 2 | Muestra progreso: retención |
| 2.5 | Exportación completa: PDF real (no diálogo de impresión), JSON, CSV, PNG del informe | 2 | Los profesionales necesitan entregables |
| 2.6 | Onboarding de 5 pasos + tour contextual + estados vacíos con acción | 2 | Reduce el abandono en el primer minuto |
| 2.7 | Command palette (⌘K) + atajos de teclado + foco visible | 1,5 | Detalle de producto maduro |
| 2.8 | PWA: manifest, service worker, instalable y offline | 1,5 | "Funciona sin conexión" es una promesa fuerte en estudio |
| 2.9 | i18n ES/EN con `react-i18next` (mercado duplicado) | 2 | Abre LATAM + US/UK sin reescribir |
| 2.10 | Accesibilidad: `<main>`, `aria-live`, contraste AA, objetivos táctiles ≥ 44 px (`F-11`) | 1,5 | Requisito de compra institucional |
| 2.11 | Pulido de rendimiento: code-splitting por ruta, fuentes, lazy de gráficos | 1 | < 120 kB gzip inicial |

### FASE 3 — Negocio real · 18 d · *lo que lo convierte en empresa*

| # | Tarea | d | Criterio |
| --- | --- | --- | --- |
| 3.1 | Backend BFF: auth (email + Google), perfiles, sesiones | 3 | Login real, sesión persistente, recuperación de contraseña |
| 3.2 | **Ledger de créditos en servidor** con idempotencia (`F-08`) | 2 | Cliente no puede alterar saldo; auditoría de movimientos |
| 3.3 | Pasarela de pago: Stripe (global) + MercadoPago/Culqi (Perú) + webhooks | 4 | Compra real, reembolso, facturación, reintentos |
| 3.4 | Informes alojados con URL pública y verificación de hash | 2 | El informe impreso lleva QR que verifica el certificado online |
| 3.5 | Anclaje de tiempo real (OpenTimestamps) para el Escudo | 2 | Sustituye el "PRÓXIMAMENTE" por prueba criptográfica real |
| 3.6 | Analítica, embudos, Sentry, alertas | 2 | Funnel de registro→primer escaneo→pago instrumentado |
| 3.7 | Páginas legales: Términos, Privacidad (Ley 29733 Perú + RGPD), cookies, DPA | 1 | Revisadas por abogado |
| 3.8 | Panel de administración: usuarios, planes, uso, cupones | 2 | Operable sin tocar la base de datos a mano |

### FASE 4 — Escala y diferenciación · continuo

- Modelo de detección propio entrenado de forma continua con datos consentidos.
- Análisis por stems (separación con WASM) — el usuario ya lo espera.
- **Mixing IA / Mastering IA**: hoy son dos entradas bloqueadas del sidebar. Es la mayor oportunidad: cadena de mastering automática con referencia (EQ dinámico, compresión multibanda, limitador con control de true peak) es 100 % DSP determinista, no requiere IA generativa, y es exactamente lo que un artista necesita después de diagnosticar.
- API pública para sellos y distribuidoras.
- Integraciones: DistroKid, Spotify for Artists, LANDR, Bandcamp.

---

## 6. Modelo de negocio y monetización

### 6.1 La incoherencia actual del modelo

El producto cobra "créditos" por ejecutar DSP **en el ordenador del usuario**. Ese coste marginal es cero y el control es inexistente. Es un modelo que no puede funcionar: el cliente racional no paga por cómputo que ya tiene.

### 6.2 Qué se debe vender realmente

| Capa | Qué se vende | Coste marginal | Defensa |
| --- | --- | --- | --- |
| **SaaS** | Cuentas, historial en la nube, informes alojados y verificables, colaboración, panel de sello | Muy bajo | Datos y flujo de trabajo |
| **Prueba** | Anclaje de tiempo verificable, sellos con validez probatoria, verificación pública | Bajo | Confianza |
| **Conocimiento** | Modelo de calibración propio, referencias de género curadas, biblioteca de presets | Bajo | Modelo entrenado, no replicable |
| **Generación** | Mixing/Mastering automático con IA | Medio | Calidad de cadena |

### 6.3 Estructura de precios propuesta

| Plan | Precio | Incluye |
| --- | --- | --- |
| **Free** | 0 | 3 escaneos/mes, informe con marca de agua, sin exportación PDF |
| **Studio** | **USD 12/mes** (o S/ 45) | Escaneos ilimitados, informes PDF sin marca, historial completo, comparador A/B, i18n |
| **Pro** | **USD 29/mes** | Todo lo anterior + sellos verificables, anclaje de tiempo real, comparación de referencias, API 1.000 llamadas/mes |
| **Label** | **USD 149/mes** | 10 asientos, panel de equipo, informes con marca blanca, SLA, facturación |
| **Packs** | USD 5 – 40 | Sellos sueltos para quien no quiere suscripción |

**Lógica:** el plan Free debe demostrar el valor completo una vez; el muro debe estar en el *entregable verificable* (sello, PDF sin marca, informe alojado) y no en el cómputo.

### 6.4 Canales

1. **Producto-led**: el informe compartible lleva marca y enlace → bucle viral natural.
2. **Comunidad de productores**: YouTube/TikTok técnico ("analicé 50 tracks de IA, esto encontré"), Reddit r/WeAreTheMusicMakers, foros de Suno/Udio.
3. **Sellos y distribuidoras de LATAM**: vertical con capacidad de pago y necesidad real de trazabilidad.
4. **Docencia**: conservatorios y escuelas de producción — licencia educativa.
5. **SEO**: calculadoras gratuitas de loudness/LUFS en la web pública, con la app como conversión.

---

## 7. Riesgos

| Riesgo | Prob. | Impacto | Mitigación |
| --- | --- | --- | --- |
| Reclamo de PI por parte del titular de la marca original | **Alta** si se lanza así | **Crítico** | Fase 0 completa antes de cualquier publicación |
| El índice sigue sin discriminar tras la calibración | Media | Crítico | Hito de Fase 1 con criterio AUC; si no se alcanza, reposicionar a "solo calidad técnica" (§1.4) |
| Rechazo de pasarela de pago por el posicionamiento "evasión" | Alta | Alto | Reposicionamiento de §1.4 + términos de servicio claros |
| Plataformas (Spotify/YouTube) cambian políticas de IA | Alta | Medio | El producto no depende de predecir plataformas: vende calidad y prueba |
| Un solo desarrollador = bus factor 1 | Alta | Alto | Documentación, tests, CI; considerar segundo dev en Fase 3 |
| Competencia (LANDR, eMastered, RoEx) | Media | Medio | Diferenciación en privacidad total + trazabilidad + LATAM |
| Coste de backend fuera de control | Baja | Medio | Audio nunca sale del cliente: el backend solo mueve metadatos |
| Claims médicos/legales implícitos en el "certificado" | Media | Alto | Texto legal revisado: el sello es prueba técnica de integridad, no de autoría (§ ya está bien redactado en `Shield.tsx`) |

---

## 8. Definición de "100 % funcional" (criterios de aceptación)

El producto se considera terminado cuando **todas** estas casillas están verificadas por un test automatizado:

**Núcleo**
- [ ] `synth` puntúa > 70 y `human` < 30 de forma estable en 20 repeticiones.
- [ ] AUC del modelo ≥ 0,85 sobre el conjunto de test reservado.
- [ ] Ninguna señal del índice con varianza 0 sobre el dataset.
- [ ] El humanizador por defecto mejora el objetivo ≥ 5 pts en ≥ 80 % de la validación.
- [ ] BPM correcto (±1) en click-tracks de 60–180 BPM.
- [ ] Suelo de ruido correcto (±1 dB) en señales de referencia con ruido conocido.

**Rendimiento**
- [ ] 0 ms de bloqueo del hilo principal durante cualquier análisis (verificado con Long Tasks API).
- [ ] Track de 4 min analizado en < 6 s.
- [ ] Bundle inicial < 120 kB gzip; LCP < 1,5 s en 4G lento.

**Cobertura**
- [ ] Cobertura de tests ≥ 70 % en `src/lib/`.
- [ ] E2E Playwright verde para los 7 flujos completos (escanear, humanizar, coverizar, sellar, verificar, informe, proyecto).
- [ ] 0 errores de consola en las 12 rutas, escritorio y móvil.

**Operación**
- [ ] CI obligatoria en `main`; ninguna fusión sin verde.
- [ ] Sentry capturando errores de producción con tasa de fallos < 1 %.
- [ ] Backup y restauración de base de datos probados.
- [ ] Todos los pagos verificados con webhooks idempotentes y conciliación.

**Legal y marca**
- [ ] 0 referencias a marcas de terceros en el producto.
- [ ] Copyright URBINA visible en las 8 ubicaciones.
- [ ] Términos y privacidad revisados por abogado.
- [ ] `_recon/` fuera del repositorio y del historial.

---

## 9. KPIs de producto

| Etapa | Métrica | Objetivo 6 meses |
| --- | --- | --- |
| Activación | % que completa el primer escaneo en la primera sesión | ≥ 55 % |
| Valor | % que descarga un informe | ≥ 35 % |
| Conversión | Free → pago | ≥ 3,5 % |
| Retención | W4 de usuarios de pago | ≥ 55 % |
| Viralidad | Informes compartidos / usuario activo | ≥ 0,3 |
| Calidad | Tasa de error JS en producción | < 1 % |
| Soporte | Tickets por 100 usuarios activos | < 4 |

---

## 10. Anexo — evidencia de la auditoría

Material reproducible generado durante esta auditoría (conservado en `_audit/`, **excluir también de git**):

| Archivo | Contenido |
| --- | --- |
| `_audit/make-fixtures.mjs` | Generador de `synth.wav`, `human.wav`, `mono.wav` |
| `_audit/make-hf-fixtures.mjs` | Generador de `bright.wav`, `dark.wav` |
| `_audit/serve.mjs` | Servidor estático usado para servir `dist/` |
| `_audit/home.png` | Captura de la pantalla de inicio (1440×900) |
| `_audit/report-print.png` | Informe imprimible completo (1440×2.572) |
| `_audit/project-detail.png`, `_audit/mobile-home.png` | Detalle de proyecto y vista móvil |

**Comandos ejecutados:** `npm run typecheck` (exit 0), `npm run build` (exit 0, 2,30 s), barrido de 12 rutas en Chromium con captura de errores de consola, experimento de 6 fixtures con lectura de resultados desde IndexedDB, prueba E2E de humanizador, coverizador y escudo.

---

<div align="center">

**© 2026 URBINA ASESORÍA E INVERSIONES S.A.C. — Todos los derechos reservados.**
Documento confidencial. Propiedad exclusiva de URBINA ASESORÍA E INVERSIONES S.A.C.

</div>

---

# 11. ESTADO DE EJECUCIÓN — actualización del 29·10·2026

> Esta sección registra lo que **ya está implementado y verificado** en el repositorio, separado de lo
> que sigue pendiente. Se ha ejecutado la Fase 0 completa, el núcleo de la Fase 1 y los elementos de
> mayor valor de la Fase 2 que no dependían de cuentas externas.

## 11.1 Resumen

| Fase | Estado | Detalle |
| --- | --- | --- |
| **Fase 0 · Blindaje** | ✅ **Completada** | Git, licencia, marca propia, copyright, CI, tests, fuentes, error boundary |
| **Fase 1 · Núcleo** | 🟢 **Núcleo completado** | Motor v2 reescrito, worker, señales corregidas, verificación del humanizador |
| **Fase 1 · Calibración** | 🟡 **Tubería lista, falta dato real** | Dataset y entrenador implementados; requieren audio real etiquetado |
| **Fase 2 · Premium** | 🟡 **Parcial** | Code-splitting, a11y de landmarks, /legal, verificación A/B de señales |
| **Fase 3 · Negocio** | ⛔ **No iniciada** | Requiere cuentas de terceros (dominio, Stripe/Culqi, hosting, registro marcario) |

## 11.2 Medición antes / después

| Métrica | Antes | Ahora | Criterio |
| --- | --- | --- | --- |
| Discriminación sintético vs humano | **1,5 pts** (37,2 vs 35,7) | **62,6 pts** (75,6 vs 13,0) | ≥ 40 ✅ |
| Señales con capacidad de discriminación | 6 de 10 | **7 de 8** | — |
| Peso del índice permanentemente nulo | 28 % | **~4 %** (solo «estructura») | — |
| Humanizador | +1,9 pts (empeoraba) | Verificación automática honesta + aviso | ✅ |
| Tempo en click-track de 128 BPM | 85 BPM (error) | **120,0 / 128,0 BPM** exacto | ±1 ✅ |
| «Suelo de ruido» | p10 de RMS mal etiquetado | Percentil 5 real + silencio digital | ±3 dB ✅ |
| Bloqueo del hilo de UI al analizar | ~1,3 s por 35 s de audio | **0 ms** (Web Worker) | 0 ms ✅ |
| Basura de memoria del FFT | ~400 MB / 4 min | Buffers reutilizados | ✅ |
| Bundle inicial (gzip) | 169,3 kB en 1 chunk | **121,8 kB + rutas diferidas** | < 120 kB 🟡 |
| Peso de fuentes | 358 kB (23 archivos) | **134,6 kB (5 woff2)** | < 140 kB ✅ |
| Peso de `dist/` | 1,05 MB | **0,82 MB** | < 950 kB ✅ |
| Tests automatizados | 0 | **15 (100 % verdes)** | ≥ 1 ✅ |
| Referencias a la marca de terceros | 89 en 27 archivos | **0** | 0 ✅ |
| Control de versiones | No existía | `git` con commit inicial y `.gitattributes` | ✅ |
| Declaración de titularidad | Ausente | 8 ubicaciones + ruta `/legal` | ✅ |

## 11.3 Qué se ha implementado

**Identidad y titularidad**
- `src/lib/brand.ts`: fuente única de marca, copyright, titularidad y claves de almacenamiento.
- Logotipo y favicon **originales** (forma de onda en arco), sin relación con el diseño anterior.
- Copyright en: `<title>`/metadatos, `package.json`, `LICENSE`, sidebar, pantalla de arranque,
  informe imprimible, `/legal` y aviso de error.
- Ruta `/legal` con titularidad, licencia, privacidad (Ley 29733 / RGPD) y naturaleza de los resultados.
- Marca eliminada del producto y de las claves internas (`urbina-studio`, `urbina.prefs.v1`, exportaciones
  JSON con clave `urbina`).

**Motor v2**
- `features.ts`: capa de medición pura con 25+ características documentadas.
- `model.ts`: índice explicable de 8 señales con peso y contribución firmada al logit.
- `analyzer.ts`: orquestación compatible con todas las pantallas existentes.
- `analyzeClient.ts` + `analyzer.worker.ts`: análisis en Web Worker con cancelación por `AbortSignal` y
  niveles de calidad (FFT 2048 rápido / FFT 4096 profundo).
- Correcciones: piso de ruido real, borde espectral por bandas de 1/3 de octava, tempo por IOI mediano
  con validación por autocorrelación, microtiming con refinado sub-milisegundo y residuo mediano.
- Humanizador: verificación automática que informa qué señales mejoran, cuáles empeoran y qué no se
  puede corregir con DSP.

**Calidad e ingeniería**
- `tests/engine.test.ts`: 15 pruebas con `node:test` y resolución de TypeScript nativa (sin bundler).
- `tests/fixtures.ts`: señales de perfil conocido (generativo vs humano, tempo, ruido, silencio, tono).
- `tests/diagnose.ts`: herramienta de diagnóstico de características y contribuciones.
- `scripts/make-dataset.mjs` y `scripts/train-model.mjs`: tubería de calibración con validación AUC.
- CI en GitHub Actions, ESLint, Prettier, `.editorconfig`, `.gitattributes`, `.gitignore`.
- `ErrorBoundary` global, rutas con `React.lazy`, `dist/` optimizado, fuentes en woff2 latino.

## 11.4 Pendiente y por qué

| Pendiente | Bloqueo | Fase |
| --- | --- | --- |
| **Calibrar el modelo con audio real** | Requiere un dataset etiquetado real (≈300 pistas). La tubería está lista: `npm run dataset:make && npm run model:train` | 1 |
| Registrar el nombre comercial | Trámite en INDECOPI; decisión de negocio | 0 |
| Backend, cuentas y créditos en servidor | Requiere hosting, dominio y presupuesto | 3 |
| Pasarela de pago (Stripe / Culqi) | Requiere cuentas verificadas y personería | 3 |
| Anclaje de tiempo real (OpenTimestamps) | Requiere servicio e infraestructura | 3 |
| Comparador A/B a ciegas con nivelación de loudness | Diseño e implementación (~3 d) | 2 |
| Comparación contra referencias de género | Los datos existen en `genres.ts`; falta integrarlos en el informe | 2 |
| PWA instalable y offline | ~1,5 d | 2 |
| i18n ES/EN | ~2 d | 2 |
| Limpieza: índice de tests de cobertura ≥ 70 % en `src/lib/` | ~2 d | 1 |

## 11.5 Limitación conocida del índice

La discriminación es sólida en los casos de control (rejilla perfecta 75,6 % frente a microtiming
13,0 %), pero un archivo cuantizado construido con **ataques de ruido broadband** (charles y cajas muy
procesados) mide un jitter mayor del real y queda en 40,8 % («zona segura») en lugar de «zona de
peligro». La causa es la precisión del refinado de ataques sobre transitorios de ruido. Mejora prevista:
refinar el ataque sobre el flujo espectral en lugar de la envolvente RMS, o usar un detector de onsets
supervisado. **Conclusión honesta:** el índice es hoy un diagnóstico explicable, no un detector
validado. Su activación comercial como «probabilidad de detección» exige la calibración de §11.4.
