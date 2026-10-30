# Evaluación de APIs de IA para SoundLab AI

> **© 2026 URBINA ASESORÍA E INVERSIONES S.A.C.** Documento interno.
> Precios y disponibilidad verificados a **octubre de 2026** mediante búsqueda web; los proveedores
> cambian tarifas con frecuencia, así que **hay que revalidar antes de firmar nada**. Los importes son
> órdenes de magnitud para dimensionar, no cotizaciones.

---

## 1. Principio de arquitectura

SoundLab AI es una herramienta de **apoyo a la producción musical asistida por IA**. Eso impone una
regla que no debe romperse:

> **El audio del usuario nunca sale de su equipo.** El DSP (análisis, humanización, covers, hash) corre
> en el navegador. La IA solo se invoca con **texto** o con **fragmentos cortos y consentidos**, y siempre
> como servicio opcional con su propio coste.

Esto no es purismo técnico: es la propuesta de valor (privacidad para material inédito), la coartada
legal frente a derechos de terceros y el motivo por el que la app funciona sin conexión.

**Consecuencia:** las claves de API **jamás** viajan en el bundle. Toda llamada pasa por un proxy propio
(Cloudflare Worker / función serverless) que autentica, aplica cuotas y registra consumo.

---

## 2. Las nueve funciones y su mejor opción

### A. Asistente de prompts (texto → set de producción)

Convertir una idea en style prompt, letra y parámetros. Es la función más rentable y la más fácil.

| Modelo | Fortaleza | Coste relativo | Veredicto |
| --- | --- | --- | --- |
| **Gemini 2.5/3 Flash** ([precios](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing)) | Barato, rápido, contexto largo, salida JSON estructurada | Muy bajo | **Recomendado por defecto** |
| **Claude Sonnet** ([docs](https://platform.claude.com/docs)) | Mejor redacción creativa y matices de estilo | Medio | Recomendado en plan Pro |
| **DeepSeek** | Coste mínimo, buen razonamiento | Muy bajo | Alternativa económica |
| **GPT-4o mini** | Ecosistema maduro | Bajo | Válido como respaldo |

**Recomendación:** Gemini Flash para el 90 % de las peticiones y Claude Sonnet como «calidad» en el plan
Pro. Ambos con *function calling*/JSON schema para que la respuesta encaje siempre en el formato del pack.

> Importante: el compositor actual es **determinista y local**. La IA debe **enriquecer** ese set
> (sugerir matices, reescribir un prompt que no funciona), nunca sustituir la lógica verificable. Así el
> producto sigue funcionando sin coste por uso y sin conexión.

### B. Comprensión de audio (describir una referencia)

«Escucha este tema y dime género, instrumentación, ambiente y energía».

| Opción | Notas |
| --- | --- |
| **Gemini con audio nativo** | La mejor relación coste/latencia hoy; acepta clips de audio directamente |
| **GPT-4o audio** ([referencia de precio](https://futureagi.com/llm-cost-calculator/openai/gpt-4o-audio-preview/)) | Similar calidad, más caro por minuto |
| **Qwen2-Audio / SALMONN autoalojados** | Coste marginal cero, requiere GPU; útil si el volumen crece |

**Recomendación:** no es imprescindible, porque **ya medimos el audio nosotros** (BPM, tonalidad, LRA,
estéreo, aire, microtiming). La IA aportaría solo semántica («suena a balada de los 80»). Úsala en el plan
Pro con clips de **≤ 30 s** y consentimiento explícito, o no la uses.

### C. Generación y corrección de letras

Claude Sonnet o Gemini Flash, con dos cautelas: sonar como un artista concreto es un riesgo legal real, y
una letra generada sin revisión humana es un pasivo creativo. La app debe mostrar siempre la letra como
**borrador editable**.

### D. Transcripción de voz/letra desde un demo

| Opción | Notas |
| --- | --- |
| **Whisper large-v3 autoalojado** | Coste marginal ~0, calidad excelente, privacidad total. **Recomendado** |
| **gpt-4o-transcribe / Gemini** | Sin infraestructura; coste por minuto |

**Recomendación:** Whisper autoalojado en el proxy. Es la función con mejor relación valor/precio para un
productor que tararea ideas.

### E. Separación de stems

| Opción | Notas |
| --- | --- |
| **Demucs `htdemucs_ft` autoalojado** | Gratis por uso, calidad de referencia, licencia permisiva |
| **LALAL.AI API** ([precios](https://www.lalal.ai/pricing/)) | Muy buena calidad, pago por minuto |
| **Moises / AudioShake API** | Profesional, coste alto |

**Recomendación:** Demucs en un worker con GPU (Runpod serverless) para el plan Pro. LALAL.AI como
respaldo cuando no haya GPU disponible.

### F. Mezcla y masterización automática

| Opción | Notas |
| --- | --- |
| **RoEx Tonn API** ([portal](https://tonn-portal.roexaudio.com/)) | La referencia del sector: mezcla, master y *post-producción* por API |
| **Matchering (open source)** | Gratis, calidad decente, sin soporte |

**Recomendación:** RoEx para el módulo «Mastering IA» que hoy está bloqueado. Es la única función que
justifica un precio alto y donde el cliente ya paga en el mercado.

### G. Generación musical (texto → canción)

| Opción | Notas |
| --- | --- |
| **Suno** | Sin API pública oficial; integración vía terceros, frágil |
| **Stable Audio 2.5** ([perfil de API](https://github.com/api-evangelist/stability-audio)) | API oficial, pago por créditos (≈ 1 crédito = 0,01 USD) |
| **ElevenLabs Music** | API oficial, calidad alta |

**Recomendación: no integrar generación musical.** Es el negocio de otros, cambia cada mes y arrastra
todo el riesgo de derechos. Nuestro valor está en **preparar la entrada** (el compositor) y **auditar la
salida** (el escáner). Ser el laboratorio, no la fábrica.

### H. Clasificación musical para calibrar el detector

CLAP o MERT autoalojados para obtener *embeddings* y entrenar el clasificador. **Ya tenemos la tubería**
(`dataset:ingest` + `model:train` con regresión logística sobre 14 características). Con embeddings se
podría subir el AUC, pero exige GPU y auditoría de sesgo. Fase 3.

### I. Base de datos vectorial para el catálogo

pgvector (si hay Postgres) o Qdrant. Barato, resuelto. No es urgente: el catálogo son 20 presets y 72
prompts.

---

## 3. Matriz de decisión

| Función | Proveedor recomendado | Coste por uso | Privacidad | Prioridad |
| --- | --- | --- | --- | --- |
| Prompts (texto) | **Gemini Flash** + Claude en Pro | céntimos / 1.000 sets | Alta (solo texto) | **1** |
| Letras | Claude / Gemini | céntimos | Alta | 2 |
| Transcripción | **Whisper autoalojado** | ~0 | Total | 2 |
| Stems | **Demucs** (GPU) | infraestructura | Total | 3 |
| Mastering | **RoEx Tonn** | decenas de céntimos / track | Media | 3 |
| Comprensión de audio | Gemini (clips ≤30 s) | bajo | Media | 4 |
| Generación musical | *no integrar* | — | — | — |

---

## 4. Coste estimado de la fase 1

Supuesto: 1.000 usuarios activos/mes, 8 sets de producción por usuario.

| Concepto | Cálculo | Mensual |
| --- | --- | --- |
| Prompts con Gemini Flash | 8.000 sets × ~1.500 tokens ≈ 12 M tokens | ≈ 10–25 USD |
| Prompts con Claude (10 % en Pro) | 800 sets | ≈ 15–30 USD |
| Whisper autoalojado | 1 GPU bajo demanda, 100 h | ≈ 20–40 USD |
| Proxy y registro | Cloudflare Workers | ≈ 5 USD |
| **Total** | | **≈ 50–100 USD/mes** |

Con **un solo cliente Pro a 29 USD/mes** se cubre el coste de IA de toda la base gratuita. El margen está
en el volumen, no en el precio.

---

## 5. Arquitectura recomendada

```
Navegador ──(texto / clip corto con consentimiento)──▶ Proxy propio ──▶ Gemini | Claude | Whisper | RoEx
   │                                                     │
   └── DSP local (audio completo, sin salir) ◀───────────┘ (solo devuelve texto/JSON)
```

- **Claves en el proxy**, nunca en el bundle.
- **Cuotas por plan** ya modeladas en la app (créditos).
- **Caché** de respuestas idénticas (mismo prompt + preset) para no pagar dos veces.
- **Degradación elegante**: si la IA falla o no hay cupo, el compositor determinista sigue funcionando.
- **Registro** de tokens por usuario para facturar y detectar abuso.

---

## 6. Riesgos que hay que decir en voz alta

1. **Suplantación de artistas**: nunca aceptar «hazlo sonar como [artista]». Bloquear nombres propios en
   el prompt (el motor ya lo advierte).
2. **Letras generadas**: riesgo de plagio inadvertido. Mostrar siempre como borrador y recomendar revisión.
3. **Dependencia de proveedor**: precios y modelos cambian trimestralmente. Abstraer en un `aiClient` con
   adaptadores intercambiables.
4. **Sesgo del detector**: un clasificador entrenado con un solo generador detecta *ese* generador. La
   calibración debe declararse como tal y no como veredicto universal.
5. **Privacidad**: si en algún momento se envía audio, debe ser explícito, opcional y con borrado
   inmediato.

---

## 7. Recomendación final

**Stack de tres piezas, no de diez:**

1. **Gemini Flash** como motor de texto por defecto (prompts, letras, reescrituras), con **Claude Sonnet**
   como opción «calidad» del plan Pro.
2. **Whisper autoalojado** para transcribir demos, y **Demucs** cuando haya GPU: coste marginal casi nulo y
   privacidad total.
3. **RoEx Tonn** solo para el módulo de mastering, que es el que puede venderse caro.

Todo lo demás —análisis, corrección, humanización, covers, certificación— **ya funciona sin IA** y debe
seguir funcionando así. La IA es el copiloto, no el motor: si mañana sube de precio o desaparece, el
producto sigue en pie.
