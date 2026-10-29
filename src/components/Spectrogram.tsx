import { useEffect, useRef, useState } from "react";

interface SpectrogramProps {
  frames: number[];
  bands: number;
  height?: number;
}

/** Mapa de color: negro verdoso → esmeralda → oro. */
function colorFor(v: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, v));
  if (t < 0.5) {
    const k = t / 0.5;
    return [10 + 0 * k, 20 + 186 * k, 16 + 73 * k];
  }
  const k = (t - 0.5) / 0.5;
  return [0 + 242 * k, 206 - 4 * k, 89 - 9 * k];
}

export function Spectrogram({ frames, bands, height = 170 }: SpectrogramProps) {
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
    const rows = bands > 0 ? Math.floor(frames.length / bands) : 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (!rows || !bands) {
      ctx.fillStyle = "#0a0f0b";
      ctx.fillRect(0, 0, width, height);
      return;
    }
    const img = ctx.createImageData(width, height);
    const data = img.data;
    for (let y = 0; y < height; y++) {
      // arriba = agudos
      const band = Math.min(bands - 1, Math.floor((1 - y / height) * bands));
      for (let x = 0; x < width; x++) {
        const row = Math.min(rows - 1, Math.floor((x / width) * rows));
        const v = (frames[row * bands + band] ?? 0) / 255;
        const [r, g, b] = colorFor(v);
        const i = (y * width + x) * 4;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    // retícula sutil
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (let k = 1; k < 4; k++) {
      const y = (height / 4) * k;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, [frames, bands, height, width]);

  return (
    <div ref={wrapRef} className="spectro" style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
