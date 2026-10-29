import { useEffect, useState } from "react";
import { getAudio } from "./storage/db";

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function formatNumber(n: number): string {
  return n.toLocaleString("es-ES");
}

export function formatDate(ts: number | string | Date, opts?: Intl.DateTimeFormatOptions): string {
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleDateString("es-ES", opts ?? { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateLong(ts: number | string | Date): string {
  return formatDate(ts, { day: "numeric", month: "long", year: "numeric" });
}

export function formatTime(ts: number | string | Date): string {
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(ts: number | string | Date): string {
  return `${formatDate(ts)} · ${formatTime(ts)}`;
}

export function formatDuration(seconds: number, decimals = false): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  if (decimals) return `${m}:${s.toFixed(1).padStart(4, "0")}`;
  return `${m}:${Math.floor(s).toString().padStart(2, "0")}`;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function stripExt(name: string): string {
  return name.replace(/\.[a-z0-9]{2,5}$/i, "");
}

export function prettyName(name: string): string {
  return stripExt(name)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2500);
}

export function downloadText(text: string, filename: string, mime = "text/plain;charset=utf-8") {
  downloadBlob(new Blob([text], { type: mime }), filename);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function shortHash(hash: string, head = 10, tail = 6): string {
  if (hash.length <= head + tail) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

/** Crea y revoca un object URL para un audio guardado en IndexedDB. */
export function useAudioUrl(audioId?: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    setUrl(null);
    setError(null);
    if (!audioId) return () => undefined;
    (async () => {
      try {
        const entry = await getAudio(audioId);
        if (!alive) return;
        if (!entry) {
          setError("Audio no encontrado en el almacenamiento local.");
          return;
        }
        objectUrl = URL.createObjectURL(entry.blob);
        setUrl(objectUrl);
      } catch {
        if (alive) setError("No se pudo cargar el audio.");
      }
    })();
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [audioId]);

  return { url, error };
}

export async function downloadSavedAudio(audioId: string, filename: string) {
  const entry = await getAudio(audioId);
  if (!entry) return false;
  downloadBlob(entry.blob, filename);
  return true;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
