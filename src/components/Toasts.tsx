import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useStudio } from "../lib/storage/store";

export function Toasts() {
  const { toasts, dismissToast } = useStudio();
  if (!toasts.length) return null;
  return createPortal(
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind === "err" ? "toast--err" : t.kind === "ok" ? "toast--ok" : ""}`}>
          <span style={{ marginTop: 1, flex: "none" }}>
            {t.kind === "err" ? (
              <AlertTriangle size={16} color="var(--danger)" />
            ) : t.kind === "ok" ? (
              <CheckCircle2 size={16} color="var(--emerald-ink)" />
            ) : (
              <Info size={16} color="var(--gold-ink)" />
            )}
          </span>
          <span style={{ flex: 1 }}>{t.text}</span>
          <button className="toast__close" onClick={() => dismissToast(t.id)} aria-label="Cerrar aviso">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
