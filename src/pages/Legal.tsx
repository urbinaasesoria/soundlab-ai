import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Building2, CreditCard, FileText, Lock, Mail, ShieldAlert, ShieldCheck } from "lucide-react";
import { BRAND } from "../lib/brand";

/**
 * Centro Legal, Privacidad, Términos y Contacto.
 * Conforme con políticas de Meta Ads, Google Ads y normativas de protección al consumidor y datos personales.
 * © 2026 URBINA ASESORÍA E INVERSIONES S.A.C. Todos los derechos reservados.
 */
export function LegalPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<"terms" | "privacy" | "refunds" | "company">("terms");

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (hash === "privacy" || hash === "refunds" || hash === "company" || hash === "terms") {
      setActiveTab(hash as any);
    }
  }, [location.hash]);

  return (
    <div className="page legal-page" style={{ maxWidth: 960, margin: "0 auto", paddingBottom: 60 }}>
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ color: "var(--gold-ink)" }}>CENTRO LEGAL &amp; TRANSPARENCIA</div>
          <h1 style={{ fontSize: "clamp(24px, 4vw, 36px)", marginTop: 4 }}>Términos, Privacidad y Políticas Comerciales</h1>
          <p className="page-head__sub">
            Información legal transparente, políticas de privacidad y derechos de los usuarios de {BRAND.full}.
          </p>
        </div>
        <Link to="/" className="btn btn--ghost btn--sm">
          <ArrowLeft size={13} /> Volver a la App
        </Link>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN RÁPIDA */}
      <div className="row-flex" style={{ gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        <button
          className={`btn btn--sm ${activeTab === "terms" ? "btn--gold" : "btn--ghost"}`}
          onClick={() => setActiveTab("terms")}
        >
          <FileText size={14} /> Términos del Servicio
        </button>
        <button
          className={`btn btn--sm ${activeTab === "privacy" ? "btn--gold" : "btn--ghost"}`}
          onClick={() => setActiveTab("privacy")}
        >
          <Lock size={14} /> Política de Privacidad (Zero-Knowledge)
        </button>
        <button
          className={`btn btn--sm ${activeTab === "refunds" ? "btn--gold" : "btn--ghost"}`}
          onClick={() => setActiveTab("refunds")}
        >
          <CreditCard size={14} /> Pagos, Planes y Reembolsos
        </button>
        <button
          className={`btn btn--sm ${activeTab === "company" ? "btn--gold" : "btn--ghost"}`}
          onClick={() => setActiveTab("company")}
        >
          <Building2 size={14} /> Datos de la Empresa y Contacto
        </button>
      </div>

      {/* SECCIÓN 1: TÉRMINOS DEL SERVICIO */}
      {(activeTab === "terms" || location.hash === "#terms") && (
        <div className="stack-3" style={{ marginBottom: 32 }}>
          <section className="card legal-block" id="terms">
            <div className="legal-block__head">
              <FileText size={18} color="var(--gold-ink)" />
              <h2>1. Términos del Servicio y Licencia</h2>
            </div>
            <p>
              El presente documento establece las condiciones de uso de la plataforma web <b>{BRAND.full}</b>, propiedad
              exclusiva de <b>{BRAND.legalName}</b> (RUC {BRAND.ruc}). Al acceder a la aplicación, registrar una cuenta o adquirir
              planes de créditos, aceptas estos términos en su totalidad.
            </p>
            <h3 style={{ fontSize: 16, marginTop: 14 }}>1.1. Propiedad y Derechos de Autor del Usuario</h3>
            <p>
              <b>El usuario conserva el 100% de la titularidad y derechos sobre los audios que analiza o procesa en la plataforma.</b> {BRAND.full} no reclama ningún derecho de propiedad, autoría ni distribución sobre las canciones, pistas o letras que cargues o compongas.
            </p>
            <h3 style={{ fontSize: 16, marginTop: 14 }}>1.2. Alcance del Software</h3>
            <p>
              {BRAND.full} provee un entorno de software web como servicio (SaaS) para el diagnóstico acústico, medición de métricas ITU-R BS.1770, asistencia lírica y texturizado digital. Queda estrictamente prohibida la ingeniería inversa, clonación o extracción no autorizada del código fuente de {BRAND.full}.
            </p>
          </section>

          <section className="card legal-block">
            <div className="legal-block__head">
              <ShieldAlert size={18} color="var(--gold-ink)" />
              <h2>1.3. Aclaración Legal: Comprobante SHA-256 e Informes Técnicos</h2>
            </div>
            <p>
              Para total transparencia frente a los usuarios y autoridades:
            </p>
            <ul className="stack-2" style={{ paddingLeft: 20, fontSize: 14, lineHeight: 1.6 }}>
              <li>
                <b>Sello de Integridad Técnica:</b> La huella criptográfica SHA-256 calculada por el Escudo Protector
                constituye una <u>prueba matemática de integridad de archivo y estampa temporal local</u>. Acredita que el
                archivo analizado no ha sufrido alteraciones posteriores en sus bits.
              </li>
              <li>
                <b>No es registro notarial de derechos de autor:</b> Este comprobante técnico <b>no constituye un registro de propiedad intelectual ni reemplaza el registro formal de obras ante organismos gubernamentales</b> (tales como INDECOPI en Perú, la Dirección Nacional de Derecho de Autor o la U.S. Copyright Office).
              </li>
              <li>
                <b>Naturaleza Informativa de los Informes:</b> Los diagnósticos de probabilidad generativa, sonoridad y
                consistencia espectral son mediciones acústicas analíticas y algoritmos DSP. Tienen fines técnicos de producción
                y no reemplazan una pericia judicial ni garantizan la admisión en plataformas de terceros.
              </li>
            </ul>
          </section>
        </div>
      )}

      {/* SECCIÓN 2: PRIVACIDAD ZERO-KNOWLEDGE */}
      {(activeTab === "privacy" || location.hash === "#privacy") && (
        <section className="card legal-block" id="privacy" style={{ marginBottom: 32 }}>
          <div className="legal-block__head">
            <Lock size={18} color="var(--emerald-ink)" />
            <h2>2. Política de Privacidad y Protección de Datos (Zero-Knowledge)</h2>
          </div>
          <p>
            <b>{BRAND.legalName}</b> respeta rigurosamente tu privacidad y cumple con la <b>Ley N° 29733 de Protección de
            Datos Personales (Perú)</b> y el <b>Reglamento General de Protección de Datos (RGPD / GDPR de la UE)</b>.
          </p>
          
          <h3 style={{ fontSize: 16, marginTop: 14 }}>2.1. Arquitectura Zero-Knowledge: Tu audio nunca sale de tu equipo</h3>
          <p>
            A diferencia de la mayoría de servicios en la nube, <b>{BRAND.full} procesa el audio localmente en tu propio
            navegador</b> utilizando Web Audio API, Web Workers e IndexedDB:
          </p>
          <ul className="stack-2" style={{ paddingLeft: 20, fontSize: 14, lineHeight: 1.6 }}>
            <li><b>Cero transferencia de audio:</b> Tus archivos WAV, MP3 y pistas maestras nunca se cargan a servidores remotos ni se almacenan en la nube.</li>
            <li><b>Cero uso para entrenamiento:</b> Tu música jamás es utilizada para entrenar modelos de inteligencia artificial propios ni de terceros.</li>
            <li><b>Control total:</b> Puedes eliminar la memoria local de tus pistas y proyectos en cualquier momento con un solo clic desde tu perfil.</li>
          </ul>

          <h3 style={{ fontSize: 16, marginTop: 14 }}>2.2. Datos de Cuenta y Autenticación</h3>
          <p>
            Únicamente almacenamos los datos indispensables para gestionar tu cuenta y suscripción: tu dirección de correo
            electrónico y tu nombre artístico o de productor. Estos datos se custodian de forma segura con cifrado mediante Supabase Auth.
          </p>

          <h3 style={{ fontSize: 16, marginTop: 14 }}>2.3. Ejercicio de Derechos ARCO</h3>
          <p>
            Para ejercer tus derechos de Acceso, Rectificación, Cancelación u Oposición sobre tus datos de cuenta, puedes enviar
            una solicitud escrita a <a href={`mailto:${BRAND.supportEmail}`} className="link">{BRAND.supportEmail}</a>.
          </p>
        </section>
      )}

      {/* SECCIÓN 3: POLÍTICA DE PAGOS Y REEMBOLSOS */}
      {(activeTab === "refunds" || location.hash === "#refunds") && (
        <section className="card legal-block" id="refunds" style={{ marginBottom: 32 }}>
          <div className="legal-block__head">
            <CreditCard size={18} color="var(--gold-ink)" />
            <h2>3. Política de Precios, Pagos y Reembolsos</h2>
          </div>
          
          <h3 style={{ fontSize: 16, marginTop: 14 }}>3.1. Precios y Transparencia Comercial</h3>
          <p>
            Nuestros planes están estructurados de forma justa y transparente:
          </p>
          <ul className="stack-2" style={{ paddingLeft: 20, fontSize: 14, lineHeight: 1.6 }}>
            <li><b>Plan Free:</b> S/ 0 (1.850 créditos de bienvenida gratuitos para probar todas las herramientas).</li>
            <li><b>Plan Pro Mensual:</b> S/ 35 PEN / mes ($9.90 USD). Suscripción flexible sin permanencia mínima obligatoria.</li>
            <li><b>Plan Pro Anual:</b> S/ 249 PEN / año ($69 USD). Ahorro superior al 40%.</li>
            <li><b>Packs de Créditos Adicionales:</b> Disponibles desde S/ 15 PEN ($4.90 USD). Los créditos no tienen fecha de vencimiento.</li>
          </ul>

          <h3 style={{ fontSize: 16, marginTop: 14 }}>3.2. Medios de Pago</h3>
          <p>
            Aceptamos pagos directos mediante <b>Yape / Plin</b> (canal bancario oficial en Perú), transferencias y tarjetas
            vía <b>Payoneer</b> y pasarela de <b>Mercado Pago</b>.
          </p>

          <h3 style={{ fontSize: 16, marginTop: 14 }}>3.3. Garantía y Política de Reembolso</h3>
          <p>
            Queremos que compres con total tranquilidad. Si tras adquirir una suscripción o pack experimentas algún fallo técnico
            en la herramienta que no podamos resolver, o si solicitas el reembolso dentro de las primeras <b>48 horas</b> posteriores a tu pago sin haber consumido más del 10% de los créditos adquiridos, te reembolsaremos el 100% de tu dinero sin preguntas.
          </p>
          <p>
            Para solicitar una devolución o asistencia de facturación, escribe a <a href={`mailto:${BRAND.supportEmail}`} className="link">{BRAND.supportEmail}</a> indicando tu correo de cuenta y el comprobante de pago.
          </p>
        </section>
      )}

      {/* SECCIÓN 4: DATOS CORPORATIVOS Y CONTACTO */}
      {(activeTab === "company" || location.hash === "#company") && (
        <section className="card legal-block" id="company" style={{ marginBottom: 32 }}>
          <div className="legal-block__head">
            <Building2 size={18} color="var(--gold-ink)" />
            <h2>4. Información Corporativa y Atención al Cliente</h2>
          </div>
          <p>
            En cumplimiento de las normativas de transparencia y comercio electrónico:
          </p>
          <div
            style={{
              background: "var(--surface-sunken)",
              border: "1px solid var(--line)",
              borderRadius: 10,
              padding: 18,
              marginTop: 12,
              marginBottom: 16,
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            <div><b>Razón Social:</b> {BRAND.legalName}</div>
            <div><b>RUC (Registro Único de Contribuyentes):</b> {BRAND.ruc}</div>
            <div><b>Estado de la Empresa:</b> Inscrita y activa en la Superintendencia Nacional de Aduanas y de Administración Tributaria (SUNAT, Perú).</div>
            <div><b>Sede Central:</b> {BRAND.companyAddress}</div>
            <div><b>Email Corporativo y de Soporte:</b> <a href={`mailto:${BRAND.supportEmail}`} className="link">{BRAND.supportEmail}</a></div>
            <div><b>Horario de Atención:</b> Lunes a Viernes de 9:00 a 18:00 (UTC-5)</div>
          </div>
          <p className="mute" style={{ fontSize: 13 }}>
            Para requerimientos comerciales, licencias institucionales para estudios y academias musicales, escribe a nuestro correo oficial.
          </p>
        </section>
      )}

      {/* FOOTER LEGAL */}
      <footer className="legal-foot" style={{ marginTop: 32, borderTop: "1px solid var(--line)", paddingTop: 20 }}>
        <div className="row-flex" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <span className="mono" style={{ fontSize: 12 }}>{BRAND.copyright}</span>
          <div className="row-flex" style={{ gap: 14, fontSize: 12 }}>
            <Link to="/legal#terms" onClick={() => setActiveTab("terms")} className="link">Términos</Link>
            <Link to="/legal#privacy" onClick={() => setActiveTab("privacy")} className="link">Privacidad</Link>
            <Link to="/legal#refunds" onClick={() => setActiveTab("refunds")} className="link">Reembolsos</Link>
            <a href={`mailto:${BRAND.supportEmail}`} className="link">{BRAND.supportEmail}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
