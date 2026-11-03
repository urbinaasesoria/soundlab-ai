import { Outlet, Link } from "react-router-dom";
import { Lock, Sparkles, UserPlus, LogIn, ArrowLeft, ShieldCheck, Zap } from "lucide-react";
import { useStudio } from "../lib/storage/store";
import { Logo } from "./Logo";
import { BRAND } from "../lib/brand";

export function AuthGuard() {
  const { user, openAuthModal } = useStudio();

  if (user) {
    return <Outlet />;
  }

  return (
    <div
      className="page"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 120px)",
        padding: "32px 16px",
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 620,
          width: "100%",
          padding: "44px 32px",
          textAlign: "center",
          background: "radial-gradient(ellipse at 50% -20%, rgba(242, 202, 80, 0.12), transparent 70%), var(--surface)",
          border: "1px solid var(--line-strong)",
          borderRadius: 16,
          boxShadow: "0 20px 40px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <Logo size={40} />
          <span className="mono" style={{ fontSize: 12, letterSpacing: 1.5, color: "var(--gold-ink)" }}>
            {BRAND.wordmark} · ACCESO PROTEGIDO
          </span>
        </div>

        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: "50%",
            background: "rgba(242, 202, 80, 0.12)",
            border: "1px solid rgba(242, 202, 80, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            color: "var(--gold-ink)",
          }}
        >
          <Lock size={26} />
        </div>

        <h1
          style={{
            fontSize: "clamp(22px, 4vw, 28px)",
            fontWeight: 800,
            lineHeight: 1.25,
            marginBottom: 12,
            letterSpacing: "-0.02em",
          }}
        >
          Crea tu cuenta gratuita para acceder al Laboratorio
        </h1>

        <p
          className="mute"
          style={{
            fontSize: 14.5,
            lineHeight: 1.6,
            maxWidth: 500,
            margin: "0 auto 26px",
          }}
        >
          Para usar las herramientas de diagnóstico acústico BS.1770, composición con Suno 6.0, texturizado DSP
          y gestión de proyectos necesitas una cuenta activa.
        </p>

        {/* BENEFICIOS */}
        <div
          style={{
            textAlign: "left",
            background: "var(--surface-sunken)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 28,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div className="row-flex" style={{ gap: 12, alignItems: "flex-start" }}>
            <Sparkles size={17} color="var(--gold-ink)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, lineHeight: 1.45 }}>
              <b>1.850 Créditos de bienvenida de regalo:</b> Disponibles inmediatamente tras tu registro para escanear y componer.
            </div>
          </div>
          <div className="row-flex" style={{ gap: 12, alignItems: "flex-start" }}>
            <ShieldCheck size={17} color="var(--emerald-ink)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, lineHeight: 1.45 }}>
              <b>Privacidad Zero-Knowledge:</b> Tu música nunca se sube a internet. El procesamiento es 100% en tu navegador.
            </div>
          </div>
          <div className="row-flex" style={{ gap: 12, alignItems: "flex-start" }}>
            <Zap size={17} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, lineHeight: 1.45 }}>
              <b>Planes comerciales y Pro:</b> Actualiza a Pro con créditos ilimitados mediante Yape, Payoneer o Mercado Pago.
            </div>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="row-flex" style={{ justifyContent: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <button
            className="btn btn--gold"
            onClick={() => openAuthModal("signup")}
            style={{ fontSize: 14.5, padding: "12px 24px", fontWeight: 700 }}
          >
            <UserPlus size={16} /> Crear Cuenta Gratis (1.850 Créditos)
          </button>
          <button
            className="btn btn--primary"
            onClick={() => openAuthModal("signin")}
            style={{ fontSize: 14.5, padding: "12px 20px" }}
          >
            <LogIn size={16} /> Iniciar Sesión
          </button>
        </div>

        <div>
          <Link
            to="/"
            className="link link--mono"
            style={{ fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <ArrowLeft size={13} /> Volver a la presentación en la página principal
          </Link>
        </div>
      </div>
    </div>
  );
}
