import { Link } from "react-router-dom";
import { ArrowLeft, Building2, FileText, Lock, ShieldCheck } from "lucide-react";
import { BRAND } from "../lib/brand";

/**
 * Aviso legal y de titularidad.
 * © 2026 URBINA ASESORÍA E INVERSIONES S.A.C. Todos los derechos reservados.
 */
export function LegalPage() {
  return (
    <div className="page legal-page">
      <div className="page-head">
        <div>
          <div className="eyebrow">INFORMACIÓN LEGAL</div>
          <h1>Aviso legal y titularidad</h1>
          <p className="page-head__sub">
            Quién es el titular de este software, qué puedes hacer con él y cómo tratamos tus datos.
          </p>
        </div>
        <Link to="/" className="btn btn--ghost btn--sm">
          <ArrowLeft size={13} /> Volver
        </Link>
      </div>

      <section className="card legal-block">
        <div className="legal-block__head">
          <Building2 size={18} />
          <h2>Titularidad</h2>
        </div>
        <p>
          <b>{BRAND.full}</b> es un producto desarrollado, explotado y titularizado en exclusiva por{" "}
          <b>{BRAND.legalName}</b>.
        </p>
        <p className="legal-quote">{BRAND.ownership}</p>
        <p className="muted">{BRAND.copyright}</p>
      </section>

      <section className="card legal-block">
        <div className="legal-block__head">
          <Lock size={18} />
          <h2>Licencia de uso</h2>
        </div>
        <p>
          El acceso a esta aplicación no concede licencia alguna sobre el software. Queda prohibida su reproducción,
          distribución, modificación, sublicencia, ingeniería inversa o explotación comercial sin autorización expresa
          y por escrito de {BRAND.legalName}.
        </p>
        <p>
          El uso productivo se rige por el contrato de licencia suscrito con el titular. Para solicitar una licencia
          escribe a <a href={`mailto:${BRAND.email}`} className="link">{BRAND.email}</a>.
        </p>
      </section>

      <section className="card legal-block">
        <div className="legal-block__head">
          <ShieldCheck size={18} />
          <h2>Privacidad: tu audio no sale de tu equipo</h2>
        </div>
        <p>
          El análisis, el procesado y la certificación se ejecutan íntegramente en tu navegador mediante Web Audio,
          Web Crypto e IndexedDB. <b>Ningún archivo de audio se sube a un servidor.</b>
        </p>
        <p>
          Los datos que generas (proyectos, análisis, renders y certificados) se almacenan solo en el almacenamiento
          local de este navegador y puedes borrarlos en cualquier momento desde <Link to="/profile" className="link">Mi Perfil</Link>.
        </p>
        <p className="muted">
          Tratamiento de datos personales conforme a la Ley 29733 (Perú) y, cuando resulte aplicable, al Reglamento
          General de Protección de Datos (UE) 2016/679.
        </p>
      </section>

      <section className="card legal-block">
        <div className="legal-block__head">
          <FileText size={18} />
          <h2>Naturaleza de los resultados</h2>
        </div>
        <p>
          Los informes son una lectura técnica e informativa generada por procesado digital de señal. No certifican
          autoría ni originalidad, no predicen el comportamiento de ninguna plataforma de distribución y no
          sustituyen asesoría legal.
        </p>
        <p>
          La huella SHA-256 y el sello del Escudo acreditan la integridad y la fecha de un archivo en tu equipo; no
          constituyen prueba de autoría por sí solos ni una transacción en una cadena de bloques.
        </p>
      </section>

      <footer className="legal-foot">
        <span className="mono">{BRAND.copyright}</span>
        <a href={`mailto:${BRAND.email}`} className="link link--mono">
          {BRAND.email}
        </a>
      </footer>
    </div>
  );
}
