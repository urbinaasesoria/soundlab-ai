import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { LogOut, X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Toasts } from "./Toasts";
import { Modal } from "./Modal";
import { AuthModal } from "./AuthModal";
import { useStudio } from "../lib/storage/store";
import { BRAND } from "../lib/brand";
import { useMediaQuery } from "../lib/utils";

const COLLAPSE_KEY = BRAND.storage.sidebar;

export function Shell() {
  const { user, signOut, authModalOpen, closeAuthModal, authModalMode } = useStudio();
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
      <main className="main" id="contenido">
        <Topbar onMenu={() => setOpen(true)} />
        <Outlet />
      </main>
      <Toasts />

      <Modal
        open={logout}
        onClose={() => setLogout(false)}
        eyebrow="SESIÓN DE USUARIO"
        title="¿Deseas cerrar tu sesión?"
        footer={
          <div className="row-flex" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn--ghost" onClick={() => setLogout(false)}>
              <X size={14} /> Cancelar
            </button>
            <button
              className="btn btn--danger"
              onClick={async () => {
                await signOut();
                setLogout(false);
              }}
            >
              <LogOut size={14} /> Cerrar sesión
            </button>
          </div>
        }
      >
        <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.65 }}>
          {user ? (
            <>
              Estás conectado como <b>{user.email}</b>. Al cerrar sesión, tus proyectos locales se conservan y
              deberás volver a iniciar sesión para acceder a tus créditos y beneficios de cuenta.
            </>
          ) : (
            "No tienes una sesión remota activa actualmente."
          )}
        </p>
      </Modal>

      <AuthModal
        open={authModalOpen}
        onClose={closeAuthModal}
        defaultMode={authModalMode}
      />
    </div>
  );
}
