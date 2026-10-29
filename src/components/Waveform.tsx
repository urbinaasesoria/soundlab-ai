import { useCallback, useEffect, useRef, useState } from "react";

interface WaveformProps {
  peaks: number[];
  progress?: number;
  height?: number;
  onSeek?: (ratio: number) => void;
  tone?: "emerald" | "gold" | "muted";
  className?: string;
  interactive?: boolean;
}

const TONE = {
  emerald: ["#00ce59", "rgba(255,255,255,0.14)"],
  gold: ["#f2ca50", "rgba(255,255,255,0.12)"],
  muted: ["#6f7168", "rgba(255,255,255,0.1)"],
} as const;

export function Waveform({
  peaks,
  progress = 0,
  height = 64,
  onSeek,
  tone = "emerald",
  className,
  interactive = Boolean(onSeek),
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(Math.max(80, Math.round(entry.contentRect.width)));
    });
    ro.observe(el);
    setWidth(Math.max(80, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const [played, rest] = TONE[tone];
    const center = height / 2;
    const half = height / 2 - 2;
    const count = peaks.length || 1;
    const barCount = Math.min(count, Math.max(24, Math.floor(width / 3)));
    const slot = width / barCount;
    const barW = Math.max(1, slot * 0.62);

    for (let i = 0; i < barCount; i++) {
      const idx = Math.floor((i / barCount) * count);
      let p = peaks[idx] ?? 0;
      // suaviza picos de un solo sample
      if (count > barCount && peaks.length) {
        let max = 0;
        const from = Math.floor((i / barCount) * count);
        const to = Math.max(from + 1, Math.floor(((i + 1) / barCount) * count));
        for (let k = from; k < to && k < peaks.length; k++) max = Math.max(max, peaks[k]);
        p = max;
      }
      const h = Math.max(1, Math.min(1, p) * half);
      const x = i * slot + (slot - barW) / 2;
      ctx.fillStyle = i / barCount <= progress ? played : rest;
      ctx.beginPath();
      ctx.roundRect(x, center - h, barW, h * 2, barW / 2);
      ctx.fill();
    }

    if (progress > 0 && progress < 1) {
      const x = progress * width;
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(Math.max(0, x - 0.5), 0, 1, height);
    }
  }, [peaks, progress, height, width, tone]);

  const seek = useCallback(
    (clientX: number) => {
      if (!onSeek) return;
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      onSeek(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)));
    },
    [onSeek],
  );

  return (
    <div
      ref={wrapRef}
      className={`waveform ${className ?? ""} ${interactive ? "waveform--interactive" : ""}`}
      style={{ height }}
      onClick={interactive ? (e) => seek(e.clientX) : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                onSeek?.(Math.max(0, Math.min(1, progress + (e.key === "ArrowRight" ? 0.02 : -0.02))));
              }
            }
          : undefined
      }
      role={interactive ? "slider" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? "Posición del audio" : undefined}
      aria-valuenow={interactive ? Math.round(progress * 100) : undefined}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
