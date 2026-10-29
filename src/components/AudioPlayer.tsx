import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Waveform } from "./Waveform";
import { formatDuration, useAudioUrl } from "../lib/utils";

interface AudioPlayerProps {
  audioId?: string;
  srcUrl?: string;
  name: string;
  duration: number;
  peaks?: number[];
  compact?: boolean;
  note?: string;
}

export function AudioPlayer({ audioId, srcUrl, name, duration, peaks, compact, note }: AudioPlayerProps) {
  const { url: storedUrl, error } = useAudioUrl(srcUrl ? undefined : audioId);
  const url = srcUrl ?? storedUrl;
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(duration || 0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setTotal(duration || 0);
    setFailed(false);
  }, [audioId, duration]);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    const onTime = () => setCurrent(audio.currentTime);
    const onLoaded = () => {
      if (Number.isFinite(audio.duration)) setTotal(audio.duration);
    };
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
    };
    const onErr = () => setFailed(true);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("error", onErr);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("error", onErr);
    };
  }, [url]);

  const toggle = async () => {
    const audio = ref.current;
    if (!audio || !url) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setFailed(true);
      }
    }
  };

  const seek = (ratio: number) => {
    const audio = ref.current;
    if (!audio || !url) return;
    audio.currentTime = ratio * (total || duration || 0);
    setCurrent(audio.currentTime);
  };

  const unavailable = !url || failed || Boolean(error);
  const progress = total > 0 ? Math.min(1, current / total) : 0;
  const fallbackPeaks =
    peaks ??
    Array.from({ length: 160 }, (_, i) => {
      const t = i / 160;
      return Math.max(0.08, Math.min(1, Math.abs(Math.sin(t * 19 + 0.7)) * 0.45 + 0.35 * Math.abs(Math.sin(t * 4.1))));
    });

  return (
    <div className={`player ${compact ? "player--compact" : ""}`}>
      <button
        className="player__btn"
        onClick={toggle}
        disabled={unavailable}
        aria-label={playing ? "Pausar" : "Reproducir"}
        title={unavailable ? "Audio no disponible" : playing ? "Pausar" : "Reproducir"}
      >
        {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />}
      </button>
      <div className="player__track">
        <div className="player__meta">
          <span className="player__name">{name}</span>
          <span className="player__time">
            {formatDuration(current)} / {formatDuration(total || duration)}
          </span>
        </div>
        <div className="player__bar">
          <Waveform peaks={fallbackPeaks} progress={progress} height={compact ? 28 : 34} onSeek={unavailable ? undefined : seek} tone={unavailable ? "muted" : "emerald"} />
        </div>
      </div>
      {url && <audio ref={ref} src={url} preload="metadata" />}
      {unavailable && (
        <span className="player__status" title={error ?? note ?? "Sin audio"}>
          {note ?? "SIN AUDIO"}
        </span>
      )}
    </div>
  );
}
