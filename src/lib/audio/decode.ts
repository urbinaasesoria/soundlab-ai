import type { DecodedTrack } from "./analyzer";

let sharedContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedContext || sharedContext.state === "closed") {
    sharedContext = new AudioContext({ latencyHint: "interactive" });
  }
  return sharedContext;
}

export const ACCEPTED_AUDIO =
  ".wav,.mp3,.flac,.m4a,.aac,.aiff,.aif,.ogg,.oga,.opus,.webm,audio/*";

export function isProbablyAudio(file: File): boolean {
  return file.type.startsWith("audio/") || /\.(wav|mp3|flac|m4a|aac|aiff?|ogg|oga|opus|webm)$/i.test(file.name);
}

export interface DecodeOptions {
  maxSeconds?: number;
}

/**
 * Decodifica un archivo de audio a canales Float32 mediante Web Audio API.
 * Si se pasa maxSeconds recorta la señal (útil para evaluaciones comparativas).
 */
export async function decodeFile(file: File, options: DecodeOptions = {}): Promise<DecodedTrack> {
  if (!isProbablyAudio(file)) {
    throw new Error("El archivo no parece ser audio. Usa WAV, MP3, FLAC, M4A, AIFF u OGG.");
  }
  const buffer = await file.arrayBuffer();
  const ctx = getAudioContext();
  // decodeAudioData works while the context is suspended. Resuming here can
  // hang forever when the file arrives without a user activation (drop,
  // keyboard, automation), so never block decoding on it.
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});

  let audio: AudioBuffer;
  try {
    audio = await ctx.decodeAudioData(buffer.slice(0));
  } catch {
    throw new Error(
      "No se pudo decodificar el audio. Prueba con WAV, MP3 o FLAC; algunos códecs (p. ej. AAC protegido) no están soportados por el navegador.",
    );
  }

  const limit = options.maxSeconds
    ? Math.min(audio.duration, options.maxSeconds)
    : audio.duration;
  const length = Math.min(audio.length, Math.round(limit * audio.sampleRate));
  const channels: Float32Array[] = [];
  for (let c = 0; c < audio.numberOfChannels; c++) {
    const source = audio.getChannelData(c);
    channels.push(source.slice(0, length));
  }

  return {
    name: file.name,
    size: file.size,
    mime: file.type || "audio/unknown",
    duration: length / audio.sampleRate,
    sampleRate: audio.sampleRate,
    channels,
    numberOfChannels: audio.numberOfChannels,
  };
}

export function sliceTrack(track: DecodedTrack, seconds: number, startSeconds = 0): DecodedTrack {
  const totalSamples = track.channels[0]?.length ?? 0;
  const startSample = Math.max(0, Math.min(totalSamples, Math.round(startSeconds * track.sampleRate)));
  const endSample = Math.min(totalSamples, startSample + Math.round(seconds * track.sampleRate));
  const actualLength = Math.max(0, endSample - startSample);
  return {
    ...track,
    duration: actualLength / track.sampleRate,
    channels: track.channels.map((ch) => ch.subarray(startSample, endSample)),
  };
}

export function trackToAudioBuffer(track: DecodedTrack, ctx = getAudioContext()): AudioBuffer {
  const buffer = ctx.createBuffer(track.channels.length, track.channels[0].length, track.sampleRate);
  track.channels.forEach((ch, i) => buffer.getChannelData(i).set(ch));
  return buffer;
}
