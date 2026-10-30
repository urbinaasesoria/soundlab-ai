# Pistas para calibrar el modelo

Coloca aqui tus archivos WAV. NO subas esta carpeta al repositorio: esta
ignorada por git porque contiene audio con derechos.

## Que va en cada carpeta

- `humanas/`  pistas reales o comerciales (produccion humana).
- `ia/`       pistas generadas con IA (Suno, Udio, Stable Audio...).

## Requisitos

1. Formato WAV PCM (44,1 o 48 kHz). Si tienes MP3/M4A/FLAC:
       ffmpeg -i pista.mp3 -ac 2 -ar 44100 pista.wav
2. Entre 120 y 200 pistas por clase. Menos de 60 no es fiable.
3. Emparejadas por genero: si en `humanas` hay rock, en `ia` tambien.
4. Sin duplicados entre las dos carpetas (ni la misma pista transcodificada).
5. Al menos dos generadores distintos en `ia`.
6. Trozos de 20 a 45 segundos: el script recorta a 45 s por muestra.

## Comandos

    npm run dataset:ingest -- --human "Calibracion/humanas" --ai "Calibracion/ia"
    npm run model:train -- --dataset data/dataset.real.json

El entrenador imprime exactitud, matriz de confusion y AUC sobre un 20 %
reservado. Solo si el AUC supera 0,85 SOBRE AUDIO REAL se copian los pesos a
`src/lib/audio/model.ts` y se marca MODEL_META.calibrated = true.
