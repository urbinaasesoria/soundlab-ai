# Continuidad — SoundLab AI

> **© 2026 URBINA ASESORÍA E INVERSIONES S.A.C.** Documento vivo de traspaso.
> Última actualización: **30 de octubre de 2026** · rama `main` · 12 commits · árbol limpio.
>
> Sirve para retomar el trabajo sin reconstruir contexto. Si algo de aquí contradice al código,
> **manda el código**: este documento se actualiza en cada sesión.

---

## 0. Cómo retomar en 60 segundos

```powershell
cd D:\OpenCode\OpenREA\re-narmia
npm run dev          # app en http://localhost:5180
npm run ai:proxy     # proxy de IA en http://localhost:8787 (necesita .env.local)
npm run ai:check     # verifica la conexión con Gemini de extremo a extremo
npm test             # 15 pruebas del motor
```

| Puerto | Qué sirve | Nota |
| --- | --- | --- |
| **5180** | App en desarrollo (recarga en vivo) | El proceso muere al cerrar la sesión: relanzar |
| **4173** | Build de producción (`dist/`) | `npm run build` y servir con `npx serve dist` |
| **8787** | Proxy de IA local | `GEMINI_API_KEY` vive en `.env.local` (ignorado por git) |

**Nunca** pegar claves de API en el chat ni en el código. `.env.local` es local y está ignorado.

---

## 1. Qué es el producto (decidido y cerrado)

**SoundLab AI** es una **herramienta complementaria** para producir en plataformas de generación musical
(principalmente **SUNO**). **No es** un generador de audio ni un DAW.

Titular: **URBINA ASESORÍA E INVERSIONES S.A.C.**

Tres ideas que ordenan todo:

1. **El audio no sale del equipo.** Todo el DSP corre en el navegador.
2. **Nada se inventa.** Cada cifra viene de una medición; si falta un dato, se declara.
3. **La IA es copiloto, no motor.** Si desaparece, la app sigue funcionando.

### Decisiones irreversibles (no re-litigar)

| Decisión | Estado |
| --- | --- |
| El humanizador **detecta, no corrige** | ✅ Implementado: `/humanizer` = «Detector de textura» |
| Nombre comercial | **SoundLab AI** (genérico; registrar en INDECOPI antes de la landing) |
| Marca centralizada | `src/lib/brand.ts` — cambiar el nombre = editar ese archivo |
| Audio nunca al repositorio | `.gitignore` cubre `_recon/`, `_audit/`, `Calibracion/**/*.wav` |
| Certificación | SHA-256 local; el anclaje real (OpenTimestamps) queda para fase 3 |

---

## 2. Estado por área

### Motor de análisis (v2) — sólido
`features.ts` (medición pura) → `model.ts` (índice explicable, 8 señales) → `analyzer.ts` (orquestación)
→ Web Worker (`analyzeClient.ts` + `analyzer.worker.ts`).

Medido: **sintético 75,6 % vs humano 13,0 %** (Δ 62,6; criterio ≥ 40). Tempo correcto en 90/128/160.
Borde espectral, piso de ruido, silencio digital, estéreo y microtiming con pruebas.

`MODEL_META.calibrated = false` **a propósito**: los pesos son criterio de ingeniería, no ajuste
supervisado. No presentar como clasificador validado.

### Compositor SUNO — el corazón comercial
- 20 presets de la casa (`presets.ts`) con style prompt base ya optimizado, BPM, instrumentación y
  exclusiones. Portados del motor original Moi-Suno.
- Metodología **PRO FLOW de 5 pasos** en `composer.ts`, determinista.
- **Puente desde el análisis**: `fromAnalysis.ts` deriva preset, BPM, tonalidad, emoción e
  instrumentación de un track analizado, con justificación y aviso de tempo poco fiable.
- **La IA compone el set completo** (estilo + letra) cuando solo hay una idea: `/api/compose`, con
  modos creación/reescritura, variantes (ángulo distinto en cada reintento), idioma (es/en/pt/spanglish)
  y punto de vista (5 opciones).
- Exportación `.sunopack.json` (incluye `variety: 0`) + texto plano.

### Base de conocimiento de la IA
`docs/knowledge/ingenieria-prompts-suno6.md` (manual SUNO 6.0, 16.776 caracteres) se inyecta **íntegro**
como instrucción de sistema. De ahí salen reglas que el sistema **hace cumplir**:

- Negaciones en el campo Style → se **mueven** a `Exclude Styles` automáticamente.
- Límites v6: estilo 1.000 · exclusiones 1.000 · **letra 5.000**.
- Estribillo 2–4 líneas, `[End]` obligatorio (el proxy lo añade si falta), pipe-stacking.
- Variety = 0 (Off) · Weirdness 30–50 · Style Influence 70–90.

### Informe y diagnóstico
- `/report/:id`: informe imprimible con motor, señales, módulos, recomendaciones y trazabilidad.
- **Referencia de género**: compara con 14 géneros, elige el más cercano, muestra métricas en rango,
  afinidad y avisa si el tempo medido es poco fiable.
- **Informe narrado** (`/api/narrate` + `NarratePanel`): titular, diagnóstico por gravedad y acciones
  ordenadas. Prohibido recalcular o contradecir los números.
- **Comparador a ciegas** (`/comparador`): iguala loudness ITU-R BS.1770, aleatoriza X/Y, registra
  preferencias y aplica la binomial exacta sin prometer significancia.
- **Coverizador** con carácter creativo (saturación, bitcrush, wow&flutter, tilt, anchura) + limitador
  a −1 dBFS, y tarjeta de requisitos para subir a SUNO.

### Plataforma
React 19 + Vite 7 + TS. Rutas con `lazy`, `ErrorBoundary`, `<main id="contenido">`, PWA
(`manifest.webmanifest`), tema claro/oscuro, tokens de diseño + capa `premium.css`.
Bundle inicial **125 kB gzip**. 13 rutas verificadas sin errores de consola.

---

## 3. IA: arquitectura y coste

```
Navegador ──texto/JSON──▶ Proxy local (127.0.0.1:8787) ──▶ Gemini 2.5 Flash
    │                          ├─ /api/suggest   (mejora el style prompt)
    └─ DSP local               ├─ /api/compose   (set completo + letra)
       (audio nunca sale)      └─ /api/narrate   (explica el informe)
```

- Clave **solo** en `.env.local`; el cliente únicamente conoce `VITE_AI_PROXY`.
- Si `VITE_AI_PROXY` está vacío, la IA desaparece de la interfaz y todo sigue funcionando.
- Rate limit 30/min · cuerpo máx. 24 kB (nunca audio) · `thinkingBudget: 0` (si no, el JSON se trunca).
- **Coste medido**: ~0,002 USD por sugerencia · ~0,0035 por set con letra · ~0,006 por informe narrado.
- CORS acepta `localhost` y `127.0.0.1` en 5180/4173. Verificador: `npm run ai:check`.

---

## 4. Plan de validación (acordado)

### Fase 1 — Local (en curso)
- [x] Automático: typecheck, 15 tests, build, 13 rutas sin errores.
- [ ] Matriz manual: mono/estéreo, 30 s/8 min, 44,1/48 kHz, WAV/MP3/M4A, archivo corrupto, 3 navegadores, 2 tamaños.
- [ ] Presupuestos: análisis 4 min < 8 s · bundle < 130 kB · memoria estable en 5 análisis seguidos.
- [ ] Cuatro flujos completos + persistencia tras cerrar el navegador.
- **Salida:** cero bugs bloqueantes, cero pérdida de datos, y el usuario firma que los flujos sirven.

### Fase 2 — Staging (backend mínimo)
- Cuenta, sesión y **derechos en servidor** (hoy Pro es simulado en localStorage: no se puede cobrar así).
- Proxy de IA con cuotas por usuario y claves en el servidor.
- Postgres + metadatos. Pasarela en **modo test** con webhooks. Telemetría y monitorización de errores.
- **Salida:** 20 invitados, 2 semanas sin incidencias, conciliación de pagos test correcta.

### Fase 3 — Producción
Pasarelas reales, facturación electrónica SUNAT, reembolsos, backups, soporte. **Lanzamiento por
invitación (50 plazas)** antes de abrir.

---

## 5. Pagos — mapa por mercado

> ⚠️ **Payoneer no es una pasarela de cobro.** Es recepción/liquidación de fondos: no procesa tarjetas
> ni suscripciones de tus usuarios. Sirve como destino del dinero.

| Mercado | Cobro | Liquidación | Notas |
| --- | --- | --- | --- |
| EE. UU. / global | **Stripe** o **Lemon Squeezy** (Merchant of Record) | → Payoneer / Wise | Lemon Squeezy gestiona IVA/VAT y te paga; Stripe da mejor margen |
| Latinoamérica | **Mercado Pago** | → cuenta local | Tarjetas, cuotas y efectivo según país |
| Perú | **Culqi** o **Niubiz / Izipay** | → cuenta local | **Yape y Plin se cobran a través de estas**, no directamente. RUC + SUNAT |

Ninguna funciona sin backend: hace falta endpoint de checkout + webhook firmado que actualice el plan.
**Orden recomendado:** Stripe en test primero (mejor sandbox), luego Mercado Pago.

---

## 6. Pendientes priorizados

| # | Tarea | Esfuerzo | Por qué |
| --- | --- | --- | --- |
| 1 | **Calibrar el modelo** con `Calibracion/humanas` + `Calibracion/ia` | depende del usuario | Sube el techo del titular |
| 2 | **Checklist de validación local** ejecutable | 0,5 d | Cierra la fase 1 |
| 3 | **Backend mínimo** (cuenta + derechos + pago + cuotas) | 3 sem | Desbloquea cobrar |
| 4 | **Landing con prueba audible** y precios | 1 sem | Sin esto no hay adquisición |
| 5 | Enlaces de informe compartibles + export FLAC/MP3 + backup del workspace | 1,5 sem | Lo espera un usuario de pago |
| 6 | Anclaje real del certificado (OpenTimestamps) | 1 sem | Foso competitivo |
| 7 | i18n ES/EN · auditoría a11y (skip link, foco en modales, `aria-live`) | 2 d | Mercado hispano de EE. UU. |
| 8 | E2E en CI + regresión visual (el spec existe, nunca se ejecutó) | 1 d | Fase 2 |
| 9 | Gestión de cuota de IndexedDB (aviso + desalojo) | 0,5 d | 10 másters agotan el espacio |
| 10 | Eliminar del todo el render de corrección del detector (hoy es solo comprobación) | 0,5 d | Coherencia de posicionamiento |

---

## 7. Limitaciones honestas (no ocultar al usuario)

1. **El índice no está calibrado.** Es un diagnóstico explicable, no un detector validado.
2. **El tempo falla en material con microtiming fuerte**: en una pista humanizada midió 181 BPM y el
   sistema lo marcó como «dudoso» en lugar de inventar. Es correcto avisar; no está resuelto.
3. **La IA escribe borradores**: letras y prompts requieren revisión humana. La interfaz lo dice.
4. **`SoundLab AI` es un nombre genérico**: difícil de registrar y defender.
5. **La corrección DSP no arregla cuantización ni rango dinámico**: por eso el módulo es detector.

---

## 8. Convenciones y cosas que NO hacer

- **Nunca** escribir el nombre del producto fuera de `src/lib/brand.ts`.
- **Nunca** pegar claves en el chat, en el código ni en commits; solo `.env.local`.
- **Nunca** commitear audio (`Calibracion/`, `_audit/`, `_recon/` están ignorados).
- **Nunca** editar archivos de `src/` con PowerShell: corrompe acentos. Usar las herramientas de edición.
- Los commits van en español, en imperativo, con el porqué.
- Si un dato no se ha medido, **no se inventa**: se declara como desconocido.

---

## 9. Mapa de archivos clave

| Archivo | Responsabilidad |
| --- | --- |
| `src/lib/brand.ts` | Identidad y titularidad — fuente única |
| `src/lib/audio/features.ts` | Medición acústica pura |
| `src/lib/audio/model.ts` | Índice explicable (8 señales, pesos documentados) |
| `src/lib/audio/analyzer.ts` | Orquestación → `AnalysisResult` |
| `src/lib/audio/loudnessMatch.ts` | Nivelación A/B + estadística binomial |
| `src/lib/suno/presets.ts` | 20 presets de género |
| `src/lib/suno/composer.ts` | PRO FLOW determinista + pack |
| `src/lib/suno/fromAnalysis.ts` | Del análisis al prompt |
| `src/lib/ai/client.ts` | Cliente de IA (sin claves) |
| `server/gemini-proxy.mjs` | Proxy + base de conocimiento + validador de negaciones |
| `docs/knowledge/ingenieria-prompts-suno6.md` | Manual SUNO 6.0 (base de conocimiento) |
| `docs/IA-MODELOS.md` | Evaluación de APIs y funciones optimizables con IA |
| `PLAN-MAESTRO-URBINA.md` | Auditoría original, hoja de ruta y estado de ejecución |
| `Calibracion/LEEME.md` | Requisitos y comandos de calibración |
| `scripts/check-gemini.mjs` | Verificador de conexión con Gemini |
| `scripts/ingest-real-audio.mjs` | Ingesta de audio real etiquetado |

---

## 10. Historial de commits

```
1ab9f1e  Humanizador reencuadrado como detector: diagnostica, no corrige
7a8a73f  Selector de idioma y punto de vista para las letras, y carpetas de calibracion
2a3be99  Caracter creativo del coverizador, regeneracion de letras, presets principales e informe narrado
dfb3ce5  Contraste de desplegables, presets en el catalogo y encuadre SUNO del coverizador
1975c45  La IA compone la letra completa integrada con el resto de parametros
24c2163  Manual de SUNO 6.0 como base de conocimiento de la IA y referencias de genero en el informe
a04f0bc  Verificador de conexion con Gemini y proxy con CORS multi-origen
ca39b70  Comparador a ciegas con nivelacion, PWA, landmark accesible y proxy de IA sin claves
7f1088c  Compositor con presets de la casa, analisis como referencia y evaluacion de APIs de IA
82ddf30  Rebranding a SoundLab AI, capa visual premium y compositor Suno
13fce2f  Documenta el estado de ejecucion en el plan maestro
3a00d0a  Rebranding a URBINA Studio, motor de analisis v2 y blindaje del proyecto
```

---

## 11. Próxima sesión — por dónde empezar

1. Leer §0 y §6 de este documento.
2. `npm run ai:check` para confirmar que la conexión sigue viva.
3. Retomar por la tarea 2 (**checklist de validación local**) salvo que haya pistas en
   `Calibracion/`, en cuyo caso empezar por la tarea 1 (calibración).
