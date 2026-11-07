import { useState } from "react";
import {
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  Info,
  Lock,
} from "lucide-react";
import { Modal } from "./Modal";
import type { ProductionSet } from "../lib/suno/composer";
import { useNavigate } from "react-router-dom";

interface SunoMcpModalProps {
  open: boolean;
  onClose: () => void;
  set: ProductionSet;
}

export function SunoMcpModal({ open, onClose, set }: SunoMcpModalProps) {
  const navigate = useNavigate();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [connectingOAuth, setConnectingOAuth] = useState(false);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2500);
    } catch {
      // fallback
    }
  };

  /**
   * Lanzamiento directo vía SUNO Oficial (OAuth / Sesión activa):
   * Abre SUNO para que el usuario inicie sesión de forma segura y directa,
   * sin solicitar ni exponer ninguna API Key en SoundLab.
   * Copia automáticamente el Style Prompt al portapapeles para disponibilidad inmediata.
   */
  const handleLaunchSuno = () => {
    setConnectingOAuth(true);
    void copyToClipboard(set.stylePrompt, "Style Prompt copiado");

    // Abre el entorno de creación oficial de Suno vinculado al protocolo
    const sunoUrl = "https://suno.com/create";
    window.open(sunoUrl, "_blank", "noopener,noreferrer");

    setTimeout(() => {
      setConnectingOAuth(false);
    }, 2000);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="CONEXIÓN DIRECTA OFICIAL · SUNO"
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Sparkles className="gold" size={20} />
          <span>Generar en tu cuenta SUNO</span>
        </div>
      }
      wide
    >
      {/* ----------------- Aviso de Ahorro de Cuota Suno Pro ----------------- */}
      <div
        style={{
          background: "rgba(16, 185, 129, 0.08)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          borderRadius: "var(--radius)",
          padding: "14px 16px",
          marginBottom: 18,
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <ShieldCheck size={22} style={{ color: "var(--color-emerald)", flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          <b style={{ color: "var(--color-emerald)", display: "block", marginBottom: 2 }}>
            🛡️ Protección activa de tu cuota mensual (Suno Pro: 20 descargas)
          </b>
          <span>
            Las pistas se generan <b>dentro de tu cuenta de Suno</b>. Esto te permite escucharlas en{" "}
            <b>streaming ilimitado y gratuito</b> sin gastar tus 20 descargas mensuales. Solo cuando elijas la toma
            ganadora, descárgala en Suno (1 sola descarga) y súbela al Escáner Acústico y Texturizador DSP de SoundLab.
          </span>
        </div>
      </div>

      {/* ----------------- Garantía de Cero Exposición de Claves ----------------- */}
      <div
        style={{
          background: "rgba(212, 175, 55, 0.08)",
          border: "1px solid rgba(212, 175, 55, 0.25)",
          borderRadius: "var(--radius-sm)",
          padding: "10px 14px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 12,
        }}
      >
        <Lock size={16} className="gold" style={{ flexShrink: 0 }} />
        <span>
          <b>Conexión directa sin API Key:</b> No necesitas introducir ninguna clave secreta. Al pulsar el botón,
          se abre tu sesión oficial de Suno para que te identifiques directamente en su plataforma sin compartir credenciales.
        </span>
      </div>

      {/* ----------------- Acción Principal: Lanzar a SUNO ----------------- */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <button
          className="btn btn--primary"
          style={{
            padding: "16px 24px",
            fontSize: 16,
            fontWeight: 600,
            justifyContent: "center",
            boxShadow: "0 4px 16px rgba(212, 175, 55, 0.2)",
          }}
          onClick={handleLaunchSuno}
        >
          <ExternalLink size={18} />
          {connectingOAuth ? "Abriendo SUNO y copiando Style Prompt…" : "Abrir SUNO y Generar con mi Cuenta"}
        </button>

        <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0, textAlign: "center" }}>
          Al hacer clic, se abre tu sesión de Suno y tu <b>Style Prompt ya queda copiado en el portapapeles</b> listo para pegar en Custom Mode.
        </p>

        {/* ----------------- Parámetros Listos para Copiar ----------------- */}
        <div
          style={{
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            padding: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-gold)", letterSpacing: "0.05em" }}>
              PARÁMETROS GENERADOS EN SOUNDLAB (COPIAR DIRECTO)
            </span>
            <span className="chip chip--emerald" style={{ fontSize: 11 }}>
              Optimizado para Suno v4 / v3.5
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Style Prompt */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--color-surface)",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 12 }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--color-gold)", marginRight: 8 }}>
                  STYLE PROMPT:
                </span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{set.stylePrompt}</span>
              </div>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => copyToClipboard(set.stylePrompt, "Style Prompt")}
              >
                {copiedField === "Style Prompt" ? <Check size={13} className="emerald" /> : <Copy size={13} />}
                {copiedField === "Style Prompt" ? "Copiado" : "Copiar"}
              </button>
            </div>

            {/* Letra / Estructura */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--color-surface)",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 12 }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--color-gold)", marginRight: 8 }}>
                  LYRICS:
                </span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                  {set.lyrics ? `${set.lyrics.slice(0, 55)}…` : "(Modo Instrumental)"}
                </span>
              </div>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => copyToClipboard(set.lyrics, "Letra")}
              >
                {copiedField === "Letra" ? <Check size={13} className="emerald" /> : <Copy size={13} />}
                {copiedField === "Letra" ? "Copiado" : "Copiar"}
              </button>
            </div>

            {/* Exclude Styles */}
            {set.excludeStyles && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--color-surface)",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 12 }}>
                  <span className="mono" style={{ fontSize: 11, color: "var(--color-gold)", marginRight: 8 }}>
                    EXCLUDE STYLES:
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{set.excludeStyles}</span>
                </div>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => copyToClipboard(set.excludeStyles, "Exclude")}
                >
                  {copiedField === "Exclude" ? <Check size={13} className="emerald" /> : <Copy size={13} />}
                  {copiedField === "Exclude" ? "Copiado" : "Copiar"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ----------------- Guía Rápida de 3 Pasos ----------------- */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            marginTop: 4,
          }}
        >
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              padding: "12px",
              fontSize: 12,
            }}
          >
            <div className="mono" style={{ color: "var(--color-gold)", marginBottom: 4, fontWeight: 700 }}>
              PASO 1
            </div>
            <span>Pulsa el botón de arriba para abrir tu sesión en Suno Studio.</span>
          </div>

          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              padding: "12px",
              fontSize: 12,
            }}
          >
            <div className="mono" style={{ color: "var(--color-gold)", marginBottom: 4, fontWeight: 700 }}>
              PASO 2
            </div>
            <span>Pega el Style Prompt y la Letra en Create (Custom Mode).</span>
          </div>

          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              padding: "12px",
              fontSize: 12,
            }}
          >
            <div className="mono" style={{ color: "var(--color-gold)", marginBottom: 4, fontWeight: 700 }}>
              PASO 3
            </div>
            <span>Escucha gratis en streaming y descarga solo tu versión favorita.</span>
          </div>
        </div>
      </div>

      {/* ----------------- Footer: Regreso a SoundLab DSP ----------------- */}
      <div
        style={{
          marginTop: 24,
          paddingTop: 16,
          borderTop: "1px solid var(--color-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-muted)" }}>
          <Info size={14} />
          <span>¿Ya descargaste tu toma ganadora desde Suno?</span>
        </div>

        <button
          className="btn btn--gold btn--sm"
          onClick={() => {
            onClose();
            navigate("/scan");
          }}
        >
          <span>Pasar al Escáner Acústico</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </Modal>
  );
}
