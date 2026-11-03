import { useState, type FormEvent } from "react";
import { Lock, Mail, User, ShieldCheck, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Modal } from "./Modal";
import { supabase, checkIsAdmin } from "../lib/supabase/client";
import { useStudio } from "../lib/storage/store";

interface AuthModalProps {
  open: boolean;
  onClose?: () => void;
  defaultMode?: "signin" | "signup";
  forceRequired?: boolean;
}

export function AuthModal({
  open,
  onClose,
  defaultMode = "signin",
  forceRequired = false,
}: AuthModalProps) {
  const { toast } = useStudio();
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [artistName, setArtistName] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMsg("Por favor completa tu correo y contraseña.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setBusy(true);

    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            throw new Error("Credenciales inválidas. Verifica tu correo y contraseña.");
          }
          throw error;
        }

        const isAdmin = checkIsAdmin(data.user?.email);
        toast(
          isAdmin
            ? "¡Bienvenido, Administrador! Acceso Pro y créditos ilimitados activados."
            : `¡Bienvenido de vuelta! Sesión iniciada como ${cleanEmail}.`,
          "ok"
        );
        if (onClose) onClose();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              artist_name: artistName.trim() || "Artista",
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          toast("¡Cuenta creada exitosamente! Has recibido 1.850 créditos de bienvenida.", "ok");
          if (onClose) onClose();
        } else {
          setSuccessMsg(
            "Cuenta registrada. Si tu proyecto de Supabase tiene confirmación de email activa, revisa tu bandeja de entrada para verificar tu cuenta."
          );
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ocurrió un error al procesar la solicitud.";
      setErrorMsg(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={forceRequired ? () => {} : onClose ?? (() => {})}
      eyebrow={mode === "signin" ? "INICIAR SESIÓN" : "CREAR CUENTA"}
      title={mode === "signin" ? "Acceso a SoundLab AI" : "Regístrate en SoundLab AI"}
    >
      <div className="stack-4">
        {/* PESTAÑAS MODO */}
        <div className="row-flex" style={{ gap: 8, background: "var(--surface)", padding: 4, borderRadius: 8 }}>
          <button
            type="button"
            className={`btn btn--sm ${mode === "signin" ? "btn--primary" : "btn--ghost"}`}
            style={{ flex: 1 }}
            onClick={() => {
              setMode("signin");
              setErrorMsg(null);
            }}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            className={`btn btn--sm ${mode === "signup" ? "btn--primary" : "btn--ghost"}`}
            style={{ flex: 1 }}
            onClick={() => {
              setMode("signup");
              setErrorMsg(null);
            }}
          >
            Crear Cuenta
          </button>
        </div>

        {errorMsg && (
          <div className="callout callout--danger" style={{ fontSize: 13 }}>
            <AlertCircle size={16} />
            <div>{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="callout callout--success" style={{ fontSize: 13 }}>
            <CheckCircle2 size={16} />
            <div>{successMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="stack-3">
          {mode === "signup" && (
            <div className="field">
              <label className="label" htmlFor="auth-artist">NOMBRE ARTÍSTICO / PRODUCTOR</label>
              <div className="row-flex" style={{ position: "relative" }}>
                <input
                  id="auth-artist"
                  type="text"
                  className="input"
                  placeholder="Ej. Urbina Studio o tu nombre"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  style={{ paddingLeft: 34 }}
                />
                <User size={15} style={{ position: "absolute", left: 10, color: "var(--muted)" }} />
              </div>
            </div>
          )}

          <div className="field">
            <label className="label" htmlFor="auth-email">CORREO ELECTRÓNICO</label>
            <div className="row-flex" style={{ position: "relative" }}>
              <input
                id="auth-email"
                type="email"
                className="input"
                placeholder="tu@correo.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: 34 }}
              />
              <Mail size={15} style={{ position: "absolute", left: 10, color: "var(--muted)" }} />
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="auth-password">CONTRASEÑA</label>
            <div className="row-flex" style={{ position: "relative" }}>
              <input
                id="auth-password"
                type="password"
                className="input"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: 34 }}
              />
              <Lock size={15} style={{ position: "absolute", left: 10, color: "var(--muted)" }} />
            </div>
            <span className="mute" style={{ fontSize: 11, marginTop: 4, display: "block" }}>
              Mínimo 6 caracteres. Acceso seguro cifrado con Supabase.
            </span>
          </div>

          <div className="row-flex" style={{ justifyContent: "flex-end", marginTop: 8 }}>
            {!forceRequired && onClose && (
              <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
                Cancelar
              </button>
            )}
            <button type="submit" className="btn btn--gold" disabled={busy} style={{ minWidth: 140 }}>
              {busy ? (
                <>
                  <Loader2 size={14} className="composer-spin" /> Procesando…
                </>
              ) : mode === "signin" ? (
                "Entrar al Estudio"
              ) : (
                "Registrarme"
              )}
            </button>
          </div>
        </form>

        <div className="inline-note" style={{ fontSize: 12 }}>
          <ShieldCheck size={14} color="var(--emerald-ink)" />
          <span>
            {mode === "signin"
              ? "Los administradores de URBINA ASESORÍA E INVERSIONES S.A.C. obtienen acceso Pro ilimitado automáticamente."
              : "Al registrarte obtienes acceso gratuito y 1.850 créditos para escanear y componer música."}
          </span>
        </div>
      </div>
    </Modal>
  );
}
