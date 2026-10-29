import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  eyebrow?: string;
  wide?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, eyebrow, wide, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal ${wide ? "modal--wide" : ""}`} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : "Diálogo"}>
        <div className="modal__head">
          <div>
            {eyebrow && <div className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div>}
            {title && <div className="modal__title">{title}</div>}
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        {children}
        {footer && <div style={{ marginTop: 22 }}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
