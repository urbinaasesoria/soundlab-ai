import { useState } from "react";
import {
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Radio,
  Terminal,
  ArrowRight,
  Loader2,
  Info,
} from "lucide-react";
import { Modal } from "./Modal";
import type { ProductionSet } from "../lib/suno/composer";
import { useNavigate } from "react-router-dom";

interface SunoMcpModalProps {
  open: boolean;
  onClose: () => void;
  set: ProductionSet;
}

type TabMode = "studio" | "mcp" | "agent";

export function SunoMcpModal({ open, onClose, set }: SunoMcpModalProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabMode>("studio");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // MCP Direct State
  const [sunoKey, setSunoKey] = useState(() => localStorage.getItem("soundlab_suno_token") || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mcpResponse, setMcpResponse] = useState<{ ok: boolean; message: string } | null>(null);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2500);
    } catch {
      // fallback
    }
  };

  const handleOpenStudio = () => {
    // Copiar style prompt automáticamente al portapapeles
    void copyToClipboard(set.stylePrompt, "Style Prompt copiado");
    window.open("https://suno.com/create", "_blank", "noopener,noreferrer");
  };

  const handleDirectMcp = async () => {
    if (!sunoKey.trim()) {
      setMcpResponse({
        ok: false,
        message: "Por favor introduce tu Bearer Token o API Key de Suno.",
      });
      return;
    }

    localStorage.setItem("soundlab_suno_token", sunoKey.trim());
    setIsSubmitting(true);
    setMcpResponse(null);

    try {
      const resp = await fetch("/api/suno-mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${sunoKey.trim()}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          params: {
            name: "generate_music",
            arguments: {
              prompt: set.stylePrompt,
              tags: set.stylePrompt,
              title: set.title,
              lyrics: set.lyrics,
              negative_tags: set.excludeStyles,
              make_instrumental: !set.lyrics.trim(),
            },
          },
          id: Date.now(),
        }),
      });

      const data = await resp.json();

      if (!resp.ok || data.error) {
        setMcpResponse({
          ok: false,
          message: data.error || `Suno MCP devolvió código ${resp.status}`,
        });
      } else {
        setMcpResponse({
          ok: true,
          message:
            "¡Petición enviada con éxito a Suno! La canción se está procesando en tu biblioteca de Suno.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error de conexión";
      setMcpResponse({
        ok: false,
        message: `No se pudo conectar con Suno MCP: ${msg}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const mcpConfigJson = JSON.stringify(
    {
      mcpServers: {
        suno: {
          url: "https://api.suno.com/mcp",
          headers: {
            Authorization: sunoKey ? `Bearer ${sunoKey}` : "Bearer TU_SUNO_TOKEN",
          },
        },
      },
    },
    null,
    2,
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="INTEGRACIÓN OFICIAL SUNO MCP"
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
          marginBottom: 20,
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
            <b>streaming ilimitado y gratuito</b> sin gastar tu cupo mensual. Solo cuando elijas la toma
            ganadora, descárgala en Suno (1 descarga) y procésala en el Escáner Acústico y Texturizador DSP de SoundLab.
          </span>
        </div>
      </div>

      {/* ----------------- Selector de Modo / Tabs ----------------- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          marginBottom: 20,
        }}
      >
        <button
          className={`btn ${tab === "studio" ? "btn--gold" : "btn--ghost"} btn--sm`}
          onClick={() => setTab("studio")}
        >
          <ExternalLink size={14} /> 1-Click Studio Web
        </button>
        <button
          className={`btn ${tab === "mcp" ? "btn--gold" : "btn--ghost"} btn--sm`}
          onClick={() => setTab("mcp")}
        >
          <Radio size={14} /> Suno MCP Directo
        </button>
        <button
          className={`btn ${tab === "agent" ? "btn--gold" : "btn--ghost"} btn--sm`}
          onClick={() => setTab("agent")}
        >
          <Terminal size={14} /> Configuración Agente
        </button>
      </div>

      {/* ----------------- TAB 1: 1-Click Studio Web (Recomendado) ----------------- */}
      {tab === "studio" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>
            Ideal si ya tienes tu sesión abierta en el navegador. Haz clic en el botón principal para abrir{" "}
            <b>suno.com/create</b> con el <b>Style Prompt</b> ya copiado en tu portapapeles.
          </p>

          <button
            className="btn btn--primary"
            style={{ padding: "14px 20px", fontSize: 15, justifyContent: "center" }}
            onClick={handleOpenStudio}
          >
            <ExternalLink size={16} /> Abrir SUNO Studio y Copiar Style Prompt
          </button>

          <div
            style={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
              padding: 14,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-muted)", marginBottom: 10 }}>
              PARÁMETROS DEL PACK SOUNDLAB (COPIAR INDIVIDUAL):
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Style Prompt */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--color-surface)",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 10 }}>
                  <span className="mono" style={{ fontSize: 11, color: "var(--color-gold)", marginRight: 8 }}>
                    STYLE:
                  </span>
                  <span style={{ fontSize: 12 }}>{set.stylePrompt}</span>
                </div>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => copyToClipboard(set.stylePrompt, "Style Prompt")}
                >
                  {copiedField === "Style Prompt" ? <Check size={12} className="emerald" /> : <Copy size={12} />}
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
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 10 }}>
                  <span className="mono" style={{ fontSize: 11, color: "var(--color-gold)", marginRight: 8 }}>
                    LYRICS:
                  </span>
                  <span style={{ fontSize: 12 }}>
                    {set.lyrics ? `${set.lyrics.slice(0, 50)}…` : "(Instrumental)"}
                  </span>
                </div>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => copyToClipboard(set.lyrics, "Letra")}
                >
                  {copiedField === "Letra" ? <Check size={12} className="emerald" /> : <Copy size={12} />}
                  {copiedField === "Letra" ? "Copiado" : "Copiar"}
                </button>
              </div>

              {/* Exclude */}
              {set.excludeStyles && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "var(--color-surface)",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 10 }}>
                    <span className="mono" style={{ fontSize: 11, color: "var(--color-gold)", marginRight: 8 }}>
                      EXCLUDE:
                    </span>
                    <span style={{ fontSize: 12 }}>{set.excludeStyles}</span>
                  </div>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => copyToClipboard(set.excludeStyles, "Exclude")}
                  >
                    {copiedField === "Exclude" ? <Check size={12} className="emerald" /> : <Copy size={12} />}
                    {copiedField === "Exclude" ? "Copiado" : "Copiar"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: Suno MCP Directo (api.suno.com/mcp) ----------------- */}
      {tab === "mcp" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>
            Conéctate directamente al endpoint oficial de Suno MCP (<code>https://api.suno.com/mcp</code>). Tu clave
            se almacena únicamente en tu navegador.
          </p>

          <div className="field">
            <label className="label" htmlFor="suno-key-input">
              Suno Bearer Token / API Key
            </label>
            <input
              id="suno-key-input"
              type="password"
              className="input"
              placeholder="suno_..."
              value={sunoKey}
              onChange={(e) => setSunoKey(e.target.value)}
            />
            <span style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 4 }}>
              Lo obtienes desde tu panel de desarrollador en api.suno.com.
            </span>
          </div>

          <button
            className="btn btn--primary"
            onClick={handleDirectMcp}
            disabled={isSubmitting}
            style={{ justifyContent: "center" }}
          >
            {isSubmitting ? <Loader2 size={15} className="composer-spin" /> : <Radio size={15} />}
            {isSubmitting ? "Enviando a Suno MCP…" : "Disparar Generación en Suno MCP"}
          </button>

          {mcpResponse && (
            <div
              style={{
                background: mcpResponse.ok ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                border: `1px solid ${mcpResponse.ok ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
                fontSize: 13,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <span>{mcpResponse.message}</span>
              {mcpResponse.ok && (
                <a
                  href="https://suno.com/me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--ghost btn--sm"
                  style={{ alignSelf: "flex-start" }}
                >
                  <ExternalLink size={12} /> Abrir Biblioteca en Suno para escuchar
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB 3: Configuración MCP para Agentes ----------------- */}
      {tab === "agent" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>
            Si trabajas con Antigravity, Claude Desktop, Cursor o Windsurf, añade el MCP oficial de Suno a tu
            configuración:
          </p>

          <pre
            className="mono"
            style={{
              background: "var(--color-surface-2)",
              padding: 12,
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
              overflowX: "auto",
              border: "1px solid var(--color-border)",
            }}
          >
            {mcpConfigJson}
          </pre>

          <button
            className="btn btn--soft btn--sm"
            onClick={() => copyToClipboard(mcpConfigJson, "Configuración MCP")}
            style={{ alignSelf: "flex-start" }}
          >
            {copiedField === "Configuración MCP" ? <Check size={12} className="emerald" /> : <Copy size={12} />}
            {copiedField === "Configuración MCP" ? "Configuración copiada" : "Copiar JSON para MCP"}
          </button>
        </div>
      )}

      {/* ----------------- Footer: Paso siguiente en SoundLab ----------------- */}
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
