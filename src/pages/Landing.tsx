import {
  Activity,
  ArrowRight,
  AudioWaveform,
  Check,
  Coins,
  CreditCard,
  Crown,
  Ear,
  ExternalLink,
  Globe2,
  Lock,
  LogIn,
  QrCode,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserPlus,
  Wand2,
  Zap,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { BRAND } from "../lib/brand";
import { useStudio } from "../lib/storage/store";

export function LandingPage() {
  const { openAuthModal } = useStudio();

  return (
    <div className="page landing-page" style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 80 }}>
      {/* -------------------- HERO HEADER -------------------- */}
      <section
        className="card"
        style={{
          textAlign: "center",
          padding: "54px 24px",
          background: "radial-gradient(ellipse at 50% -20%, rgba(242, 202, 80, 0.14), transparent 70%), var(--surface)",
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
            {BRAND.wordmark} 2.1 · ULTRA PREMIUM
          </span>
        </div>

        <h1
          style={{
            fontSize: "clamp(28px, 5vw, 48px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            maxWidth: 880,
            margin: "0 auto 18px",
          }}
        >
          Copiloto Técnico y Creativo para la <span style={{ color: "var(--gold-ink)" }}>Producción Musical con IA</span>
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
          Diagnóstico técnico de máster en el navegador (loudness ITU-R BS.1770, dinámica, microtiming), compositor Suno 6.0
          con PRO FLOW, texturizador DSP 24-bit y certificación criptográfica SHA-256.
          <b style={{ display: "block", marginTop: 8, color: "var(--text)" }}>
            100% Privado: tu audio nunca se sube a internet. Se procesa íntegramente en tu equipo.
          </b>
        </p>

        <div className="row-flex" style={{ justifyContent: "center", gap: 14, flexWrap: "wrap", marginBottom: 32 }}>
          <button
            className="btn btn--gold"
            onClick={() => openAuthModal("signup")}
            style={{ fontSize: 15, padding: "12px 24px", fontWeight: 700 }}
          >
            <UserPlus size={17} /> Probar Gratis · 1.850 Créditos de Bienvenida
          </button>
          <button
            className="btn btn--primary"
            onClick={() => openAuthModal("signin")}
            style={{ fontSize: 15, padding: "12px 22px" }}
          >
            <LogIn size={17} /> Iniciar Sesión
          </button>
        </div>

        {/* METRICS ROW */}
        <div
          className="row-flex"
          style={{
            justifyContent: "center",
            gap: 24,
            flexWrap: "wrap",
            borderTop: "1px solid var(--line)",
            paddingTop: 24,
            fontSize: 13,
          }}
        >
          <div className="row-flex" style={{ gap: 8 }}>
            <Lock size={15} color="var(--emerald-ink)" />
            <span><b>Zero-Knowledge:</b> Audio 100% en cliente</span>
          </div>
          <div className="row-flex" style={{ gap: 8 }}>
            <Zap size={15} color="var(--gold-ink)" />
            <span><b>DSP 24-Bit:</b> Coma flotante multihilo</span>
          </div>
          <div className="row-flex" style={{ gap: 8 }}>
            <Sparkles size={15} color="var(--primary)" />
            <span><b>Suno 6.0:</b> Arquitectura tri-campo estricta</span>
          </div>
        </div>
      </section>

      {/* -------------------- 6 HERRAMIENTAS -------------------- */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div className="eyebrow" style={{ color: "var(--gold-ink)", marginBottom: 6 }}>
            SUITE PROFESIONAL INTEGRADA
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 700 }}>Herramientas de Grado Estudio Comercial</h2>
          <p className="mute" style={{ maxWidth: 600, margin: "6px auto 0", fontSize: 14 }}>
            Todo lo necesario para validar, refinar y proteger tus tracks producidos con plataformas generativas.
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
          <div className="card" style={{ padding: 22, background: "var(--surface)" }}>
            <div className="row-flex" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <span className="chip chip--gold">
                <Wand2 size={13} /> COMPOSITOR SUNO 6.0
              </span>
              <span className="mono mute" style={{ fontSize: 11 }}>PRO FLOW</span>
            </div>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>Composición de Prompts y Letras con IA</h3>
            <p className="mute" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
              20 presets de género optimizados, separación de campos Style y Exclusions, metatags estructurados
              <code>[Intro]</code>, <code>[Verse]</code>, <code>[Chorus]</code>, <code>[End]</code> y generación de letra
              alineada con BPM, tonalidad y emoción.
            </p>
          </div>

          {/* TOOL 2 */}
          <div className="card" style={{ padding: 22, background: "var(--surface)" }}>
            <div className="row-flex" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <span className="chip chip--emerald">
                <ScanLine size={13} /> ESCÁNER DE AUDIO
              </span>
              <span className="mono mute" style={{ fontSize: 11 }}>DSP LOCAL</span>
            </div>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>Diagnóstico de Autenticidad y Consistencia</h3>
            <p className="mute" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
              Analiza en menos de 2 segundos el microtiming, consistencia transitoria, piso de ruido y equilibrio
              espectral de tus másters. Genera informes técnicos imprimibles de alta resolución en formato A4.
            </p>
          </div>

          {/* TOOL 3 */}
          <div className="card" style={{ padding: 22, background: "var(--surface)" }}>
            <div className="row-flex" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <span className="chip">
                <AudioWaveform size={13} /> TEXTURIZADOR ORGÁNICO
              </span>
              <span className="mono mute" style={{ fontSize: 11 }}>24-BIT / 48 kHz</span>
            </div>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>Procesamiento Acústico Analógico</h3>
            <p className="mute" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
              Motor de renderizado en coma flotante que añade microvariación dinámica no lineal y calidez armónica a
              tracks hipercuantizados. Exporta en WAV de 24-bit sin pérdida.
            </p>
          </div>

          {/* TOOL 4 */}
          <div className="card" style={{ padding: 22, background: "var(--surface)" }}>
            <div className="row-flex" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <span className="chip chip--gold">
                <ShieldCheck size={13} /> ESCUDO PROTECTOR
              </span>
              <span className="mono mute" style={{ fontSize: 11 }}>SHA-256</span>
            </div>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>Certificación de Integridad y Autoría</h3>
            <p className="mute" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
              Calcula la huella criptográfica SHA-256 de tu archivo de audio en tu navegador y genera un certificado
              técnico inmutable con metadatos de autoría y fecha exacta de sellado.
            </p>
          </div>

          {/* TOOL 5 */}
          <div className="card" style={{ padding: 22, background: "var(--surface)" }}>
            <div className="row-flex" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <span className="chip">
                <Zap size={13} /> COVERIZADOR CREATIVO
              </span>
              <span className="mono mute" style={{ fontSize: 11 }}>3 VARIANTES</span>
            </div>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>Reinterpretación Sonora y Estilos</h3>
            <p className="mute" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
              Aplica transformaciones tímbricas y de espacio acústico para generar versiones alternativas de tu pista,
              incorporando limitación estricta a −1 dBFS para evitar distorsión intermuestra.
            </p>
          </div>

          {/* TOOL 6 */}
          <div className="card" style={{ padding: 22, background: "var(--surface)" }}>
            <div className="row-flex" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <span className="chip chip--emerald">
                <Ear size={13} /> COMPARADOR A CIEGAS
              </span>
              <span className="mono mute" style={{ fontSize: 11 }}>ITU-R BS.1770</span>
            </div>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>Pruebas A/B con Loudness Emparejado</h3>
            <p className="mute" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
              Compara tu mezcla original frente a la procesada con volumen idéntico y orden aleatorizado. Elimina el
              sesgo de que &quot;lo más fuerte suena mejor&quot; y evalúa con tus oídos de forma objetiva.
            </p>
          </div>
        </div>
      </section>

      {/* -------------------- MODELO COMERCIAL Y PLANES -------------------- */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div className="eyebrow" style={{ color: "var(--gold-ink)", marginBottom: 6 }}>
            ACCESO Y SUSCRIPCIÓN
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 700 }}>Elige tu Plan de Trabajo</h2>
          <p className="mute" style={{ maxWidth: 600, margin: "6px auto 0", fontSize: 14 }}>
            Empieza gratis hoy mismo y escala a Pro cuando necesites potencia ilimitada y análisis profundo.
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
            <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>S/ 0 <span style={{ fontSize: 14, fontWeight: 400 }}>/ siempre</span></h3>
            <p className="mute" style={{ fontSize: 13, marginBottom: 20 }}>
              Ideal para probar el motor y conocer la suite.
            </p>

            <ul className="stack-2" style={{ listStyle: "none", padding: 0, margin: "0 0 24px", fontSize: 13.5 }}>
              <li className="row-flex" style={{ gap: 8 }}>
                <Check size={16} color="var(--emerald-ink)" /> 1.850 créditos de bienvenida
              </li>
              <li className="row-flex" style={{ gap: 8 }}>
                <Check size={16} color="var(--emerald-ink)" /> Escaneo rápido de muestra (90 s)
              </li>
              <li className="row-flex" style={{ gap: 8 }}>
                <Check size={16} color="var(--emerald-ink)" /> Compositor Suno y presets básicos
              </li>
              <li className="row-flex" style={{ gap: 8 }}>
                <Check size={16} color="var(--emerald-ink)" /> Sellado SHA-256 local
              </li>
              <li className="row-flex" style={{ gap: 8 }}>
                <Check size={16} color="var(--emerald-ink)" /> Todo procesado en tu navegador
              </li>
            </ul>

            <button
              className="btn btn--primary"
              style={{ width: "100%", justifyContent: "center", padding: "10px 0" }}
              onClick={() => openAuthModal("signup")}
            >
              Crear Cuenta Gratis
            </button>
          </div>

          {/* PLAN PRO */}
          <div
            className="card"
            style={{
              padding: 28,
              background: "var(--surface)",
              border: "2px solid var(--gold)",
              boxShadow: "0 0 24px rgba(242, 202, 80, 0.1)",
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
              RECOMENDADO
            </div>

            <div className="row-flex" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <span className="chip chip--gold">PLAN PRO ILIMITADO</span>
              <span className="mute" style={{ fontSize: 12 }}>PRODUCTORES &amp; ESTUDIOS</span>
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
              S/ 79 <span style={{ fontSize: 14, fontWeight: 400 }}>PEN / mes ($29 USD)</span>
            </h3>
            <p className="mute" style={{ fontSize: 13, marginBottom: 20 }}>
              Potencia máxima para sellos, productores y creadores activos.
            </p>

            <ul className="stack-2" style={{ listStyle: "none", padding: 0, margin: "0 0 24px", fontSize: 13.5 }}>
              <li className="row-flex" style={{ gap: 8 }}>
                <Check size={16} color="var(--gold-ink)" /> <b>1.000.000 créditos renovables</b>
              </li>
              <li className="row-flex" style={{ gap: 8 }}>
                <Check size={16} color="var(--gold-ink)" /> <b>Escaneo profundo del track completo</b>
              </li>
              <li className="row-flex" style={{ gap: 8 }}>
                <Check size={16} color="var(--gold-ink)" /> <b>Compositor PRO FLOW completo con IA</b>
              </li>
              <li className="row-flex" style={{ gap: 8 }}>
                <Check size={16} color="var(--gold-ink)" /> <b>Texturizador y renders sin límites</b>
              </li>
              <li className="row-flex" style={{ gap: 8 }}>
                <Check size={16} color="var(--gold-ink)" /> Certificados e informes ilimitados
              </li>
              <li className="row-flex" style={{ gap: 8 }}>
                <Check size={16} color="var(--gold-ink)" /> Soporte prioritario directo
              </li>
            </ul>

            <button
              className="btn btn--gold"
              style={{ width: "100%", justifyContent: "center", padding: "10px 0", fontWeight: 700 }}
              onClick={() => openAuthModal("signup")}
            >
              Comenzar con Plan Pro
            </button>
          </div>
        </div>
      </section>

      {/* -------------------- MEDIOS DE PAGO Y GARANTÍA -------------------- */}
      <section className="card" style={{ padding: "24px 28px", background: "var(--surface)", border: "1px solid var(--line)" }}>
        <div className="row-flex" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
          <div>
            <div className="eyebrow" style={{ color: "var(--gold-ink)", marginBottom: 4 }}>
              PAGOS SEGUROS &amp; ACTIVACIÓN INMEDIATA
            </div>
            <h3 style={{ fontSize: 18, marginBottom: 4 }}>Múltiples canales de pago disponibles</h3>
            <p className="mute" style={{ fontSize: 13.5, maxWidth: 640 }}>
              Aceptamos <b>Yape y Plin (al 976624074)</b> para Perú sin comisiones, <b>Payoneer</b> con código QR para clientes en EE. UU. e internacionales, y <b>Mercado Pago</b> para Latinoamérica.
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

      {/* -------------------- FOOTER INSTITUCIONAL -------------------- */}
      <footer style={{ marginTop: 40, textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
        <p style={{ marginBottom: 6 }}>
          <b>{BRAND.full}</b> · RUC e inscripción oficial en Perú.
        </p>
        <p>
          © 2026 Todos los derechos reservados. El audio de los usuarios es de su exclusiva propiedad y nunca es almacenado en servidores externos.
        </p>
      </footer>
    </div>
  );
}
