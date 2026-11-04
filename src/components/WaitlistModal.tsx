import { useState, type FormEvent } from "react";
import { CheckCircle2, Disc3, Loader2, Mail, Music, Sparkles, User } from "lucide-react";
import { Modal } from "./Modal";
import { useStudio } from "../lib/storage/store";
import { supabase } from "../lib/supabase/client";

interface WaitlistModalProps {
  open: boolean;
  featureName: string;
  onClose: () => void;
}

export function WaitlistModal({ open, featureName, onClose }: WaitlistModalProps) {
  const { user, prefs, toast } = useStudio();
  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState(prefs.artistName || "");
  const [platform, setPlatform] = useState("Suno & Udio");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast("Por favor ingresa tu correo electrónico.", "err");
      return;
    }

    setBusy(true);
    try {
      // Intentar guardar en Supabase si la tabla waitlist existe
      const { error } = await supabase.from("waitlist").insert({
        email: cleanEmail,
        artist_name: name.trim() || "Productor",
        feature: featureName,
        genre: platform,
      });

      if (error) {
        console.warn("Aviso al guardar en tabla waitlist:", error.message);
      }

      // Guardar también localmente para no repetir
      try {
        const stored = JSON.parse(localStorage.getItem("soundlab_waitlist") || "[]");
        stored.push({ email: cleanEmail, feature: featureName, date: new Date().toISOString() });
        localStorage.setItem("soundlab_waitlist", JSON.stringify(stored));
      } catch {
        /* noop */
      }

      setSubmitted(true);
      toast("¡Te has unido exitosamente a la lista de espera VIP!", "ok");
    } catch {
      setSubmitted(true);
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      eyebrow="ACCESO ANTICIPADO · LISTA VIP"
      title={submitted ? "¡Registro confirmado!" : `Sé de los primeros en probar ${featureName}`}
    >
      {submitted ? (
        <div style={{ textAlign: "center", padding: "16px 8px" }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: "rgba(52, 211, 153, 0.15)",
              color: "var(--emerald-ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <CheckCircle2 size={28} />
          </div>
          <h3 style={{ fontSize: 20, marginBottom: 8 }}>¡Estás en la lista prioritaria!</h3>
          <p className="mute" style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 440, margin: "0 auto 24px" }}>
            Te enviaremos una invitación exclusiva a <b>{email}</b> en cuanto abramos los primeros cupos beta de{" "}
            <b>{featureName}</b>, junto a <b>5.000 créditos gratis de bienvenida</b> para procesar tus stems.
          </p>
          <button className="btn btn--gold" onClick={handleClose} style={{ minWidth: 140 }}>
            Entendido
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="stack-3">
          <p className="mute" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
            Estamos afinando los motores de procesamiento multicanal por stems y masterización con IA para música generativa.
            Únete a la lista de espera para recibir acceso prioritario y <b>5.000 créditos de regalo</b> el día del lanzamiento.
          </p>

          <div className="field">
            <label className="label" htmlFor="wl-email">CORREO ELECTRÓNICO *</label>
            <div className="row-flex" style={{ position: "relative" }}>
              <input
                id="wl-email"
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
            <label className="label" htmlFor="wl-name">NOMBRE O SEUDÓNIMO DE PRODUCTOR</label>
            <div className="row-flex" style={{ position: "relative" }}>
              <input
                id="wl-name"
                type="text"
                className="input"
                placeholder="Ej. Urbina Studio o tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ paddingLeft: 34 }}
              />
              <User size={15} style={{ position: "absolute", left: 10, color: "var(--muted)" }} />
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="wl-platform">¿QUÉ HERRAMIENTA O DAW USAS PRINCIPALMENTE?</label>
            <select
              id="wl-platform"
              className="input select"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              <option value="Suno & Udio">Suno AI / Udio</option>
              <option value="FL Studio">FL Studio</option>
              <option value="Ableton Live">Ableton Live</option>
              <option value="Logic Pro">Logic Pro</option>
              <option value="Cubase / Pro Tools">Cubase / Pro Tools</option>
              <option value="Otras plataformas">Otras plataformas</option>
            </select>
          </div>

          <div className="row-flex" style={{ justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
            <button type="button" className="btn btn--ghost" onClick={handleClose} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--gold" disabled={busy} style={{ gap: 6 }}>
              {busy ? <Loader2 size={15} className="composer-spin" /> : <Sparkles size={15} />}
              Unirme a la lista VIP (+5.000 CR)
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
