import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  AudioWaveform,
  Check,
  CheckCircle2,
  ChevronRight,
  Coins,
  CreditCard,
  Crown,
  Ear,
  ExternalLink,
  Flame,
  Globe2,
  Headphones,
  Lock,
  LogIn,
  Play,
  RotateCcw,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Star,
  UserPlus,
  Volume2,
  Wand2,
  Zap,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { WaitlistModal } from "../components/WaitlistModal";
import { BRAND } from "../lib/brand";
import { useStudio } from "../lib/storage/store";

export function LandingPage() {
  const { openAuthModal } = useStudio();
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistFeature, setWaitlistFeature] = useState("Mixing IA & Mastering Multitrack");

  // Estado para la demo visual interactiva
  const [demoState, setDemoState] = useState<"raw" | "processed">("processed");
  const [isDemoSimulating, setIsDemoSimulating] = useState(false);

  const toggleDemo = (mode: "raw" | "processed") => {
    setIsDemoSimulating(true);
    setTimeout(() => {
      setDemoState(mode);
      setIsDemoSimulating(false);
    }, 280);
  };

  const handleOpenWaitlist = (feature: string) => {
    setWaitlistFeature(feature);
    setWaitlistOpen(true);
  };

  return (
    <div className="page landing-page" style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 80 }}>
      {/* -------------------- HERO HEADER -------------------- */}
      <section
        className="card"
        style={{
          textAlign: "center",
          padding: "52px 24px 44px",
          background: "radial-gradient(ellipse at 50% -20%, rgba(242, 202, 80, 0.15), transparent 70%), var(--surface)",
          border: "1px solid var(--line-strong)",
          borderRadius: 16,
          marginBottom: 36,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Logo size={42} />
          <span className="mono" style={{ fontSize: 13, letterSpacing: 1.5, color: "var(--gold-ink)" }}>
            {BRAND.wordmark} · EDICIÓN ESTUDIO
          </span>
        </div>

        <h1
          style={{
            fontSize: "clamp(28px, 5vw, 48px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            maxWidth: 900,
            margin: "0 auto 18px",
          }}
        >
          Haz que tu música creada con IA suene con{" "}
          <span style={{ color: "var(--gold-ink)" }}>Calidad de Estudio Comercial</span>
        </h1>

        <p
          className="page-head__sub"
          style={{
            maxWidth: 760,
            margin: "0 auto 30px",
            fontSize: "clamp(15px, 2vw, 17.5px)",
            lineHeight: 1.65,
            color: "var(--text-soft)",
          }}
        >
          Atenúa asperezas armónicas y previene la saturación digital en tus canciones de <b>Suno &amp; Udio</b>. Diagnostica el volumen
          óptimo para <b>Spotify y Apple Music</b> (LUFS BS.1770), compón letras con estructuras reales y certifica la
          integridad de tus archivos.
          <b style={{ display: "block", marginTop: 10, color: "var(--text)" }}>
            🔒 100% Privado: tu audio nunca se sube a internet. Se procesa íntegramente en tu navegador.
          </b>
        </p>

        {/* BOTONES PRINCIPALES DE LLAMADA A LA ACCIÓN */}
        <div className="row-flex" style={{ justifyContent: "center", gap: 14, flexWrap: "wrap", marginBottom: 30 }}>
          <button
            className="btn btn--gold"
            onClick={() => openAuthModal("signup")}
            style={{ fontSize: 15, padding: "13px 26px", fontWeight: 700 }}
          >
            <UserPlus size={17} /> Probar Gratis · 1.850 Créditos de Bienvenida
          </button>
          <button
            className="btn btn--primary"
            onClick={() => openAuthModal("signin")}
            style={{ fontSize: 15, padding: "13px 24px" }}
          >
            <LogIn size={17} /> Iniciar Sesión
          </button>
        </div>

        {/* BADGES DE CONFIANZA */}
        <div
          className="row-flex"
          style={{
            justifyContent: "center",
            gap: 24,
            flexWrap: "wrap",
            borderTop: "1px solid var(--line)",
            paddingTop: 22,
            fontSize: 13,
            color: "var(--text-soft)",
          }}
        >
          <div className="row-flex" style={{ gap: 8 }}>
            <Lock size={15} color="var(--emerald-ink)" />
            <span><b>Privacidad Zero-Knowledge:</b> Tu música nunca sale de tu equipo</span>
          </div>
          <div className="row-flex" style={{ gap: 8 }}>
            <Zap size={15} color="var(--gold-ink)" />
            <span><b>Optimizado para SUNO &amp; UDIO</b></span>
          </div>
          <div className="row-flex" style={{ gap: 8 }}>
            <Sparkles size={15} color="var(--primary)" />
            <span><b>Sin tarjeta para empezar:</b> 1.850 créditos gratis</span>
          </div>
        </div>
      </section>

      {/* -------------------- DEMO VISUAL INTERACTIVA: ANTES VS DESPUÉS -------------------- */}
      <section
        className="card"
        style={{
          padding: "36px 28px",
          marginBottom: 48,
          background: "var(--surface)",
          border: "1px solid var(--line-strong)",
          borderRadius: 16,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div className="eyebrow" style={{ color: "var(--gold-ink)", marginBottom: 6 }}>
            DEMOSTRACIÓN INTERACTIVA EN VIVO
          </div>
          <h2 style={{ fontSize: "clamp(22px, 3.5vw, 32px)", fontWeight: 800 }}>
            Mira la Diferencia: Audio IA Crudo vs Procesado con SoundLab
          </h2>
          <p className="mute" style={{ maxWidth: 640, margin: "8px auto 0", fontSize: 14.5 }}>
            Alterna entre ambos modos para observar cómo SoundLab corrige la compresión destructiva y adapta las métricas
            acústicas para los estándares comerciales.
          </p>
        </div>

        {/* SELECTOR ANTES / DESPUÉS */}
        <div
          className="row-flex"
          style={{
            justifyContent: "center",
            gap: 12,
            marginBottom: 26,
            background: "var(--surface-sunken)",
            padding: 6,
            borderRadius: 30,
            maxWidth: 420,
            margin: "0 auto 28px",
            border: "1px solid var(--line)",
          }}
        >
          <button
            className={`btn btn--sm ${demoState === "raw" ? "btn--danger" : "btn--ghost"}`}
            style={{ flex: 1, borderRadius: 24, fontSize: 13 }}
            onClick={() => toggleDemo("raw")}
          >
            Pista IA Cruda (Sin Corregir)
          </button>
          <button
            className={`btn btn--sm ${demoState === "processed" ? "btn--gold" : "btn--ghost"}`}
            style={{ flex: 1, borderRadius: 24, fontSize: 13, fontWeight: 700 }}
            onClick={() => toggleDemo("processed")}
          >
            Con SoundLab (DSP + Dinámica)
          </button>
        </div>

        {/* TABLERO DE MÉTRICAS COMPARATIVAS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 18,
            opacity: isDemoSimulating ? 0.4 : 1,
            transition: "opacity 0.2s ease",
          }}
        >
          {/* MÉTRICA 1: LOUDNESS SPOTIFY */}
          <div
            style={{
              background: "var(--surface-sunken)",
              border: `1px solid ${demoState === "processed" ? "var(--emerald)" : "var(--danger)"}`,
              borderRadius: 12,
              padding: "20px 18px",
            }}
          >
            <div className="row-flex" style={{ justifyContent: "space-between", marginBottom: 8 }}>
              <span className="mono mute" style={{ fontSize: 11 }}>SONORIDAD INTEGRADA</span>
              <span className={`chip ${demoState === "processed" ? "chip--emerald" : "chip--danger"}`}>
                {demoState === "processed" ? "ÓPTIMO SPOTIFY" : "SATURACIÓN / CLIPPING"}
              </span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
              {demoState === "processed" ? "-14.0 LUFS" : "-7.8 LUFS"}
            </div>
            <p className="mute" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
              {demoState === "processed"
                ? "Cumple estrictamente la norma ITU-R BS.1770. No será atenuado de forma agresiva por las plataformas."
                : "Demasiado comprimido. Spotify y Apple Music aplicarán penalización de volumen restándole claridad a tu tema."}
            </p>
          </div>

          {/* MÉTRICA 2: TRUE PEAK */}
          <div
            style={{
              background: "var(--surface-sunken)",
              border: `1px solid ${demoState === "processed" ? "var(--emerald)" : "var(--danger)"}`,
              borderRadius: 12,
              padding: "20px 18px",
            }}
          >
            <div className="row-flex" style={{ justifyContent: "space-between", marginBottom: 8 }}>
              <span className="mono mute" style={{ fontSize: 11 }}>PICOS TRUE PEAK</span>
              <span className={`chip ${demoState === "processed" ? "chip--emerald" : "chip--danger"}`}>
                {demoState === "processed" ? "SIN DISTORSIÓN" : "DISTORSIÓN INTERMUESTRA"}
              </span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
              {demoState === "processed" ? "-1.0 dBFS" : "+1.4 dBFS"}
            </div>
            <p className="mute" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
              {demoState === "processed"
                ? "Margen de seguridad de 1 dB para evitar distorsión al convertir a formatos AAC / MP3 / OGG."
                : "Supera el techo digital. Genera artefactos de distorsión audible en parlantes y audífonos de consumo."}
            </p>
          </div>

          {/* MÉTRICA 3: RANGO DINÁMICO */}
          <div
            style={{
              background: "var(--surface-sunken)",
              border: `1px solid ${demoState === "processed" ? "var(--emerald)" : "var(--warn)"}`,
              borderRadius: 12,
              padding: "20px 18px",
            }}
          >
            <div className="row-flex" style={{ justifyContent: "space-between", marginBottom: 8 }}>
              <span className="mono mute" style={{ fontSize: 11 }}>RANGO DINÁMICO (PLR)</span>
              <span className={`chip ${demoState === "processed" ? "chip--emerald" : "chip--warn"}`}>
                {demoState === "processed" ? "RESPIRA Y TIENE PEGADA" : "HIPERCOMPRIMIDO"}
              </span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
              {demoState === "processed" ? "9.8 dB" : "4.2 dB"}
            </div>
            <p className="mute" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
              {demoState === "processed"
                ? "La batería y los transitorios tienen impacto acústico natural y sensación analógica."
                : "Sonido plano y fatigoso. Pierde impacto y punch en el drop y los estribillos."}
            </p>
          </div>
        </div>

        {/* LLAMADO A LA ACCIÓN BAJO LA DEMO */}
        <div style={{ textAlign: "center", marginTop: 28 }}>
          <button
            className="btn btn--gold"
            onClick={() => openAuthModal("signup")}
            style={{ padding: "12px 24px", fontSize: 14.5, fontWeight: 700 }}
          >
            <Sparkles size={16} /> Analizar y Corregir Mi Propio Track Gratis
          </button>
        </div>
      </section>

      {/* -------------------- 6 HERRAMIENTAS DE ESTUDIO (BENEFICIOS CLAROS) -------------------- */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div className="eyebrow" style={{ color: "var(--gold-ink)", marginBottom: 6 }}>
            SUITE PROFESIONAL INTEGRADA
          </div>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800 }}>
            Herramientas Creadas para Productores y Creadores con IA
          </h2>
          <p className="mute" style={{ maxWidth: 640, margin: "6px auto 0", fontSize: 14.5 }}>
            Deja de adivinar si tus canciones están listas para publicarse. Ten control técnico total en minutos.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 18,
          }}
        >
          {/* TOOL 1 */}
          <div className="card" style={{ padding: 24, background: "var(--surface)" }}>
            <div className="row-flex" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <span className="chip chip--gold">
                <Wand2 size={13} /> COMPOSITOR SUNO &amp; UDIO
              </span>
              <span className="mono mute" style={{ fontSize: 11 }}>PRO FLOW</span>
            </div>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>Escribe Letras que la IA Respeta a la Primera</h3>
            <p className="mute" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
              Genera letras alineadas con BPM y tonalidad, estructuradas con metatags reales <code>[Intro]</code>,{" "}
              <code>[Verse]</code>, <code>[Chorus]</code> y <code>[End]</code>. Incluye 20 presets de género optimizados
              para que Suno y Udio no corten tus coros.
            </p>
          </div>

          {/* TOOL 2 */}
          <div className="card" style={{ padding: 24, background: "var(--surface)" }}>
            <div className="row-flex" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <span className="chip chip--emerald">
                <ScanLine size={13} /> ESCÁNER DE AUDIO
              </span>
              <span className="mono mute" style={{ fontSize: 11 }}>LOCAL EN 2S</span>
            </div>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>Diagnóstico de Volumen para Spotify y Streaming</h3>
            <p className="mute" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
              Verifica en segundos el volumen real integrado (LUFS BS.1770), transitorios y consistencia espectral.
              Descarga informes técnicos en formato A4 listos para enviar a tu sello discográfico o distribuidora.
            </p>
          </div>

          {/* TOOL 3 */}
          <div className="card" style={{ padding: 24, background: "var(--surface)" }}>
            <div className="row-flex" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <span className="chip">
                <AudioWaveform size={13} /> TEXTURIZADOR ORGÁNICO
              </span>
              <span className="mono mute" style={{ fontSize: 11 }}>WAV 24-BIT</span>
            </div>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>Elimina la Aspereza Robótica de la IA</h3>
            <p className="mute" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
              Motor de procesamiento acústico que añade microvariación dinámica no lineal y calidez armónica a tracks
              excesivamente planos o hipercuantizados. Exporta tu audio final en WAV de 24-bit sin pérdida de calidad.
            </p>
          </div>

          {/* TOOL 4 */}
          <div className="card" style={{ padding: 24, background: "var(--surface)" }}>
            <div className="row-flex" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <span className="chip chip--gold">
                <ShieldCheck size={13} /> SELLO SHA-256
              </span>
              <span className="mono mute" style={{ fontSize: 11 }}>INTEGRIDAD</span>
            </div>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>Comprobante de Integridad Técnica de Archivo</h3>
            <p className="mute" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
              Calcula la huella criptográfica SHA-256 de tu máster con estampa temporal local. Genera un certificado
              técnico inmutable para acreditar que tu archivo no ha sido alterado. <i>(Prueba técnica de integridad, no registro de derechos de autor).</i>
            </p>
          </div>

          {/* TOOL 5 */}
          <div className="card" style={{ padding: 24, background: "var(--surface)" }}>
            <div className="row-flex" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <span className="chip">
                <Zap size={13} /> COVERIZADOR CREATIVO
              </span>
              <span className="mono mute" style={{ fontSize: 11 }}>3 ESTILOS</span>
            </div>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>Variaciones Tímbricas y Espaciales</h3>
            <p className="mute" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
              Genera versiones alternativas de tu pista aplicando transformaciones acústicas y ecualización selectiva,
              con limitación estricta de picos a −1 dBFS para que no sature en plataformas móviles.
            </p>
          </div>

          {/* TOOL 6 */}
          <div className="card" style={{ padding: 24, background: "var(--surface)" }}>
            <div className="row-flex" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <span className="chip chip--emerald">
                <Ear size={13} /> COMPARADOR A CIEGAS
              </span>
              <span className="mono mute" style={{ fontSize: 11 }}>LOUDNESS MATCH</span>
            </div>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>Pruebas A/B Objetivas sin Autoengaño</h3>
            <p className="mute" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
              Compara tu mezcla original frente a la procesada con volumen idéntico y orden aleatorizado. Elimina el
              sesgo psicológico de que &quot;lo que suena más fuerte suena mejor&quot; y evalúa con tus oídos con rigor profesional.
            </p>
          </div>
        </div>
      </section>

      {/* -------------------- BANNER DE CAPTACIÓN VIP (MIXING & MASTERING) -------------------- */}
      <section
        className="card"
        style={{
          padding: "28px 24px",
          marginBottom: 48,
          background: "linear-gradient(135deg, rgba(242, 202, 80, 0.08), rgba(0, 0, 0, 0.5)), var(--surface)",
          border: "1px solid rgba(242, 202, 80, 0.3)",
          borderRadius: 16,
        }}
      >
        <div className="row-flex" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
          <div>
            <div className="row-flex" style={{ gap: 8, marginBottom: 6 }}>
              <span className="chip chip--gold">
                <Flame size={13} /> PRÓXIMO LANZAMIENTO VIP
              </span>
              <span className="mono mute" style={{ fontSize: 11 }}>BETA CERRADA</span>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
              Mixing IA Multitrack y Mastering por Stems
            </h3>
            <p className="mute" style={{ fontSize: 14, maxWidth: 620, lineHeight: 1.5 }}>
              Estamos ultimando los algoritmos de separación de pistas y mezcla inteligente. Inscríbete en la lista de espera
              y recibe <b>5.000 créditos gratis</b> el día del lanzamiento.
            </p>
          </div>
          <div>
            <button
              className="btn btn--gold"
              onClick={() => handleOpenWaitlist("Mixing IA & Mastering")}
              style={{ padding: "12px 22px", fontWeight: 700, gap: 6 }}
            >
              <Sparkles size={16} /> Unirme a la Lista VIP (+5.000 CR)
            </button>
          </div>
        </div>
      </section>

      {/* -------------------- FASE BETA & FEEDBACK DE MÚSICOS -------------------- */}
      <section
        className="card"
        style={{
          padding: "36px 28px",
          textAlign: "center",
          marginBottom: 48,
          background: "var(--surface)",
          border: "1px dashed var(--line-strong)",
          borderRadius: 16,
        }}
      >
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div className="eyebrow" style={{ color: "var(--gold-ink)", marginBottom: 8 }}>
            FASE DE PRUEBAS &amp; FEEDBACK TÉCNICO
          </div>
          <h2 style={{ fontSize: "clamp(22px, 3.5vw, 28px)", fontWeight: 800, marginBottom: 12 }}>
            ¿Eres músico o productor independiente? Pruébalo gratis
          </h2>
          <p className="mute" style={{ fontSize: 14.5, lineHeight: 1.6, marginBottom: 22 }}>
            Actualmente nos encontramos en fase de validación directa con colegas productores y músicos. Crea tu cuenta,
            recibe tus <b>1.850 créditos de bienvenida</b> para escanear y componer, y ayúdanos con tu feedback técnico
            escribiéndonos a <b>{BRAND.supportEmail}</b>.
          </p>
          <button
            className="btn btn--gold"
            onClick={() => openAuthModal("signup")}
            style={{ padding: "12px 24px", fontWeight: 700 }}
          >
            <UserPlus size={16} /> Crear Cuenta y Comenzar Pruebas
          </button>
        </div>
      </section>

      {/* -------------------- PLANES Y PRECIOS COMPETITIVOS -------------------- */}
      <section style={{ marginBottom: 48 }} id="planes">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div className="eyebrow" style={{ color: "var(--gold-ink)", marginBottom: 6 }}>
            PRECIOS TRANSPARENTES
          </div>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800 }}>Elige tu Plan de Trabajo</h2>
          <p className="mute" style={{ maxWidth: 600, margin: "6px auto 0", fontSize: 14.5 }}>
            Empieza gratis hoy mismo y escala a Pro al mejor precio del mercado. Sin permanencias forzosas.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 20,
            maxWidth: 960,
            margin: "0 auto",
          }}
        >
          {/* PLAN FREE */}
          <div className="card" style={{ padding: 28, background: "var(--surface)", border: "1px solid var(--line)" }}>
            <div className="row-flex" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <span className="chip chip--emerald">PLAN FREE</span>
              <span className="mute" style={{ fontSize: 12 }}>ACCESO INMEDIATO</span>
            </div>
            <h3 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
              $0 USD <span style={{ fontSize: 14, fontWeight: 400 }}>/ S/ 0 PEN</span>
            </h3>
            <p className="mute" style={{ fontSize: 13, marginBottom: 20 }}>
              Ideal para probar la suite sin compromisos.
            </p>

            <ul className="stack-2" style={{ listStyle: "none", padding: 0, margin: "0 0 24px", fontSize: 13.5 }}>
              <li className="row-flex" style={{ gap: 8 }}>
                <Check size={16} color="var(--emerald-ink)" /> <b>1.850 créditos de bienvenida gratuitos</b>
              </li>
              <li className="row-flex" style={{ gap: 8 }}>
                <Check size={16} color="var(--emerald-ink)" /> Escaneo acústico de 90 segundos
              </li>
              <li className="row-flex" style={{ gap: 8 }}>
                <Check size={16} color="var(--emerald-ink)" /> Compositor de prompts y letras con IA
              </li>
              <li className="row-flex" style={{ gap: 8 }}>
                <Check size={16} color="var(--emerald-ink)" /> Sello de integridad SHA-256 local
              </li>
              <li className="row-flex" style={{ gap: 8 }}>
                <Check size={16} color="var(--emerald-ink)" /> Procesamiento 100% en tu navegador
              </li>
            </ul>

            <button
              className="btn btn--primary"
              style={{ width: "100%", justifyContent: "center", padding: "12px 0", fontSize: 14.5 }}
              onClick={() => openAuthModal("signup")}
            >
              Crear Cuenta Gratis (1.850 Créditos)
            </button>
          </div>

          {/* PLAN PRO */}
          <div
            className="card"
            style={{
              padding: 28,
              background: "var(--surface)",
              border: "2px solid var(--gold)",
              boxShadow: "0 0 24px rgba(242, 202, 80, 0.12)",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -12,
                right: 20,
                background: "var(--gold)",
                color: "#08090b",
                fontWeight: 800,
                fontSize: 11,
                padding: "2px 10px",
                borderRadius: 12,
                letterSpacing: 0.5,
              }}
            >
              MÁS POPULAR
            </div>

            <div className="row-flex" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <span className="chip chip--gold">PLAN PRO ILIMITADO</span>
              <span className="mute" style={{ fontSize: 12 }}>PRODUCTORES &amp; SELLOS</span>
            </div>
            <h3 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
              $9.90 USD <span style={{ fontSize: 14, fontWeight: 400 }}>/ mes (S/ 35 PEN)</span>
            </h3>
            <p className="mute" style={{ fontSize: 13, marginBottom: 20 }}>
              Potencia comercial ilimitada al mismo precio que Suno o Udio.
            </p>

            <ul className="stack-2" style={{ listStyle: "none", padding: 0, margin: "0 0 24px", fontSize: 13.5 }}>
              <li className="row-flex" style={{ gap: 8 }}>
                <Check size={16} color="var(--gold-ink)" /> <b>1.000.000 créditos renovables</b>
              </li>
              <li className="row-flex" style={{ gap: 8 }}>
                <Check size={16} color="var(--gold-ink)" /> <b>Análisis profundo del track completo</b>
              </li>
              <li className="row-flex" style={{ gap: 8 }}>
                <Check size={16} color="var(--gold-ink)" /> <b>Compositor PRO FLOW completo con IA</b>
              </li>
              <li className="row-flex" style={{ gap: 8 }}>
                <Check size={16} color="var(--gold-ink)" /> <b>Texturizador y renders WAV 24-bit sin límites</b>
              </li>
              <li className="row-flex" style={{ gap: 8 }}>
                <Check size={16} color="var(--gold-ink)" /> Informes y sellos SHA-256 ilimitados
              </li>
              <li className="row-flex" style={{ gap: 8 }}>
                <Check size={16} color="var(--gold-ink)" /> Soporte prioritario directo
              </li>
            </ul>

            <button
              className="btn btn--gold"
              style={{ width: "100%", justifyContent: "center", padding: "12px 0", fontWeight: 700, fontSize: 14.5 }}
              onClick={() => openAuthModal("signup")}
            >
              Comenzar con Plan Pro ($9.90 / S/ 35)
            </button>
          </div>
        </div>
      </section>

      {/* -------------------- MEDIOS DE PAGO Y GARANTÍA -------------------- */}
      <section className="card" style={{ padding: "26px 28px", background: "var(--surface)", border: "1px solid var(--line)" }}>
        <div className="row-flex" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
          <div>
            <div className="eyebrow" style={{ color: "var(--gold-ink)", marginBottom: 4 }}>
              CHECOUT SEGURO &amp; ACTIVACIÓN INMEDIATA
            </div>
            <h3 style={{ fontSize: 18, marginBottom: 4 }}>Canales de Pago Directo Disponibles</h3>
            <p className="mute" style={{ fontSize: 13.5, maxWidth: 640 }}>
              Paga con <b>Yape / Plin</b> en Perú mediante transferencia oficial, o con tarjeta y saldo vía <b>Payoneer</b> y pasarela de <b>Mercado Pago</b> para clientes internacionales.
            </p>
          </div>
          <div className="row-flex" style={{ gap: 10, flexWrap: "wrap" }}>
            <span className="chip chip--emerald">
              <Smartphone size={13} /> YAPE / PLIN 🇵🇪
            </span>
            <span className="chip chip--gold">
              <Globe2 size={13} /> PAYONEER 🇺🇸
            </span>
            <span className="chip">
              <CreditCard size={13} /> MERCADO PAGO 🌎
            </span>
          </div>
        </div>
      </section>

      {/* -------------------- FOOTER COMPLETO PARA META & GOOGLE ADS COMPLIANCE -------------------- */}
      <footer
        style={{
          marginTop: 48,
          paddingTop: 28,
          borderTop: "1px solid var(--line)",
          fontSize: 13,
          color: "var(--muted)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 24,
            marginBottom: 24,
            textAlign: "left",
          }}
        >
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Logo size={24} />
              <b style={{ color: "var(--text)" }}>{BRAND.full}</b>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.5 }}>
              Copiloto y suite técnica de audio para música generativa. Procesamiento local con privacidad Zero-Knowledge.
            </p>
          </div>

          <div>
            <b style={{ color: "var(--text)", display: "block", marginBottom: 10 }}>Enlaces Legales</b>
            <div className="stack-1" style={{ fontSize: 12.5 }}>
              <Link to="/legal#terms" className="link">Términos y Condiciones</Link>
              <Link to="/legal#privacy" className="link">Política de Privacidad (RGPD y Ley 29733)</Link>
              <Link to="/legal#refunds" className="link">Garantía y Política de Reembolsos</Link>
              <Link to="/legal#integrity" className="link">Aviso sobre Sello SHA-256</Link>
            </div>
          </div>

          <div>
            <b style={{ color: "var(--text)", display: "block", marginBottom: 10 }}>Empresa &amp; Soporte</b>
            <div className="stack-1" style={{ fontSize: 12 }}>
              <div><b>Titular:</b> {BRAND.legalName}</div>
              <div><b>RUC:</b> {BRAND.ruc} (SUNAT, Perú)</div>
              <div><b>Contacto:</b> <a href={`mailto:${BRAND.supportEmail}`} className="link">{BRAND.supportEmail}</a></div>
              <div><b>Sede:</b> {BRAND.companyAddress}</div>
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid var(--line)",
            paddingTop: 16,
            textAlign: "center",
            fontSize: 12,
          }}
        >
          <p style={{ marginBottom: 4 }}>
            {BRAND.copyright}
          </p>
          <p style={{ fontSize: 11 }}>
            Suno y Udio son marcas registradas de sus respectivos titulares. SoundLab AI es una suite independiente desarrollada por URBINA ASESORÍA E INVERSIONES S.A.C.
          </p>
        </div>
      </footer>

      {/* MODAL DE LISTA DE ESPERA VIP (MIXING & MASTERING) */}
      <WaitlistModal
        open={waitlistOpen}
        featureName={waitlistFeature}
        onClose={() => setWaitlistOpen(false)}
      />
    </div>
  );
}
