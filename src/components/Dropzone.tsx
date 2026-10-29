import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { FileAudio, UploadCloud } from "lucide-react";
import { ACCEPTED_AUDIO, isProbablyAudio } from "../lib/audio/decode";

interface DropzoneProps {
  onFile: (file: File) => void;
  title?: ReactNode;
  hint?: string;
  meta?: string;
  compact?: boolean;
  disabled?: boolean;
  onReject?: (message: string) => void;
}

export function Dropzone({
  onFile,
  title,
  hint,
  meta,
  compact,
  disabled,
  onReject,
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [drag, setDrag] = useState(false);

  const accept = (file?: File | null) => {
    if (!file || disabled) return;
    if (!isProbablyAudio(file)) {
      onReject?.("Ese archivo no parece audio. Formatos admitidos: WAV, MP3, FLAC, M4A, AIFF, OGG.");
      return;
    }
    onFile(file);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    accept(e.dataTransfer.files?.[0]);
  };

  return (
    <div
      className={`dropzone ${drag ? "is-drag" : ""} ${compact ? "dropzone--compact" : ""} ${disabled ? "is-disabled" : ""}`}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      aria-disabled={disabled}
    >
      <div className="dropzone__icon">
        {compact ? <FileAudio size={26} /> : <UploadCloud size={30} />}
      </div>
      <div className="dropzone__title">
        {title ? (
          title
        ) : (
          <>
            Arrastra tu <u>track</u> aquí o explora
          </>
        )}
      </div>
      <div className="dropzone__meta">
        {meta ?? "MP3 · WAV · FLAC · AIFF · M4A · MÁX. 180 MB"}
      </div>
      {hint && <p className="dropzone__hint">{hint}</p>}
      <div className="dropzone__platforms">
        {["SPOTIFY", "APPLE MUSIC", "YOUTUBE", "TIKTOK", "SOUNDCLOUD"].map((p) => (
          <span className="chip" key={p}>
            {p}
          </span>
        ))}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_AUDIO}
        className="sr-only"
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.currentTarget.value = "";
        }}
        tabIndex={-1}
      />
    </div>
  );
}
