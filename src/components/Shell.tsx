import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { RotateCcw, X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Toasts } from "./Toasts";
import { Modal } from "./Modal";
import { useStudio } from "../lib/storage/store";
import { BRAND } from "../lib/brand";
import { useMediaQuery } from "../lib/utils";

const COLLAPSE_KEY = BRAND.storage.sidebar;

export function Shell() {
  const { resetAll } = useStudio();
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 1024px)");
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [logout, setLogout] = useState(false);

  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  const toggleCollapse = () => {
    if (isMobile) {
      setOpen(false);
      return;
    }
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* noop */
      }
      return next;
    });
  };

  return (
    <div className={`shell ${collapsed && !isMobile ? "shell--collapsed" : ""}`}>
      <Sidebar
        open={open}
        collapsed={collapsed && !isMobile}
        onClose={() => setOpen(false)}
        onCollapse={toggleCollapse}
        onLogout={() => setLogout(true)}
      />
      {open && <div className="backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}
      <div className="main">
        <Topbar onMenu={() => setOpen(true)} />
        <Outlet />
      </div>
      <Toasts />

      <Modal
        open={logout}
        onClose={() => setLogout(false)}
        eyebrow="SESIÓN LOCAL"
        title="Cerrar sesión"
        footer={
          <div className="row-flex" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn--ghost" onClick={() => setLogout(false)}>
              <X size={14} /> Seguir explorando
            </button>
            <button className="btn btn--danger" onClick={resetAll}>
              <RotateCcw size={14} /> Reiniciar demo
            </button>
          </div>
        }
      >
        <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.65 }}>
          No hay autenticación remota: todo funciona en tu navegador. Si quieres volver al estado inicial (proyecto de
          ejemplo y 1.850 créditos), reinicia los datos locales. Se borrarán los audios y análisis guardados.
        </p>
      </Modal>
    </div>
  );
}
