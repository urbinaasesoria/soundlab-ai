import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Globe2,
  HardDrive,
  Info,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  Mail,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { Modal } from "../components/Modal";
import { COUNTRIES } from "../lib/data/countries";
import { clearAudioStore } from "../lib/storage/db";
import { useStudio } from "../lib/storage/store";
import { downloadText, formatBytes, formatDateLong, formatNumber } from "../lib/utils";
import { supabase } from "../lib/supabase/client";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "N";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function ProfilePage() {
  const { prefs, user, isAdmin, signOut, openAuthModal, projects, scans, renders, certs, updatePrefs, resetAll, toast } = useStudio();

  const [artistName, setArtistName] = useState(prefs.artistName);
  const [country, setCountry] = useState(prefs.country);
  const [phone, setPhone] = useState(prefs.phone);
  const [birthDate, setBirthDate] = useState(prefs.birthDate);
  const [socials, setSocials] = useState(prefs.socials);
  const [notifications, setNotifications] = useState(prefs.notifications);
  const [resetOpen, setResetOpen] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal("signin");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast("La nueva contraseña debe tener al menos 6 caracteres.", "err");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast("Las contraseñas no coinciden. Por favor verifica.", "err");
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast(
        isAdmin
          ? "¡Clave de Administrador actualizada exitosamente en Supabase!"
          : "¡Contraseña actualizada exitosamente!",
        "ok"
      );
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al actualizar la contraseña";
      toast(msg, "err");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const fetchStorage = () => {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
      navigator.storage
        .estimate()
        .then((est) => {
          if (typeof est.usage === "number" && typeof est.quota === "number") {
            setStorageInfo({ usage: est.usage, quota: est.quota });
          }
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    fetchStorage();
  }, [scans, renders]);

  const purgeAudioBlobs = async () => {
    try {
      await clearAudioStore();
      toast("Archivos de audio pesados liberados de IndexedDB. Los informes y proyectos se conservan.", "ok");
      setPurgeOpen(false);
      fetchStorage();
    } catch {
      toast("No se pudo limpiar el almacén de audio.", "err");
    }
  };

  const completedTutorials = prefs.tutorialScan ? 1 : 0;
  const tutorialPct = completedTutorials * 100;
  const memberSince = prefs.memberSince.includes("T") ? prefs.memberSince : `${prefs.memberSince}T12:00:00`;
  const isPro = prefs.plan === "pro";
  const creditsMax = isPro ? 1_000_000 : 2950;

  const dirty = useMemo(
    () =>
      artistName !== prefs.artistName ||
      country !== prefs.country ||
      phone !== prefs.phone ||
      birthDate !== prefs.birthDate ||
      notifications !== prefs.notifications ||
      socials.instagram !== prefs.socials.instagram ||
      socials.tiktok !== prefs.socials.tiktok ||
      socials.spotify !== prefs.socials.spotify,
    [artistName, country, phone, birthDate, notifications, socials, prefs],
  );

  const save = () => {
    updatePrefs({
      artistName: artistName.trim() || "Artista",
      country,
      phone: phone.trim(),
      birthDate,
      socials: {
        instagram: socials.instagram.trim(),
        tiktok: socials.tiktok.trim(),
        spotify: socials.spotify.trim(),
      },
      notifications,
    });
    toast("Perfil guardado en este navegador.", "ok");
  };

  const exportData = () => {
    const payload = {
      app: "SoundLab AI",
      exportedAt: new Date().toISOString(),
      note: "Exportación de metadatos. Los audios originales y los WAV renderizados permanecen solo en IndexedDB.",
      profile: {
        fullName: prefs.fullName,
        artistName,
        email: prefs.email,
        country,
        phone,
        birthDate,
        memberSince: prefs.memberSince,
        plan: prefs.plan,
        credits: prefs.credits,
        socials,
        notifications,
      },
      stats: {
        projects: projects.length,
        scans: scans.length,
        renders: renders.length,
        certificates: certs.length,
      },
      projects,
      scans,
      renders: renders.map(({ audioId: _audioId, ...rest }) => rest),
      certificates: certs,
    };
    downloadText(
      JSON.stringify(payload, null, 2),
      `urbina-export-${new Date().toISOString().slice(0, 10)}.json`,
      "application/json",
    );
    toast("Datos exportados como JSON (sin archivos de audio).", "ok");
  };

  return (
    <div className="page profile-page">
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            {isAdmin ? "PANEL DE CONTROL ADMINISTRATIVO" : user ? "CUENTA EN LA NUBE" : "CUENTA DE USUARIO"}
          </div>
          <h1>{isAdmin ? "Administrador Oficial" : "Mi Perfil"}</h1>
          <p className="page-head__sub">
            {isAdmin
              ? "Acceso maestro como titular de URBINA ASESORÍA E INVERSIONES S.A.C. con créditos ilimitados."
              : user
                ? `Conectado como ${user.email}. Administra tu información y tus preferencias.`
                : "Inicia sesión o crea tu cuenta para guardar tus créditos en la nube y acceder a planes Pro."}
          </p>
        </div>
        <div className="page-head__actions">
          {user ? (
            <button className="btn btn--danger btn--sm" onClick={() => void signOut()}>
              <LogOut size={14} /> Cerrar sesión
            </button>
          ) : (
            <button className="btn btn--gold btn--sm" onClick={() => openAuthModal("signin")}>
              <LogIn size={14} /> Iniciar Sesión / Registrarse
            </button>
          )}
          <button className="btn btn--ghost btn--sm" onClick={exportData}>
            <Download size={14} /> Exportar datos
          </button>
        </div>
      </div>

      <div className="card profile-summary">
        <div className="profile-summary__avatar" aria-hidden="true">
          {isAdmin ? "UA" : initials(prefs.fullName || prefs.artistName)}
          <span className="profile-summary__status" title="Estado" />
        </div>
        <div className="profile-summary__identity">
          <div className="eyebrow">{isAdmin ? "TITULARIDAD OFICIAL" : "ARTISTA"}</div>
          <h2>{isAdmin ? "URBINA ASESORÍA E INVERSIONES S.A.C." : (artistName || prefs.artistName)}</h2>
          <p>{prefs.fullName} · {user?.email || prefs.email}</p>
          <div className="row-flex" style={{ gap: 6, marginTop: 4 }}>
            {isAdmin ? (
              <span className="chip chip--gold" style={{ fontWeight: 700 }}>
                👑 ADMINISTRADOR
              </span>
            ) : (
              <span className={`chip ${isPro ? "chip--gold" : "chip--emerald"}`}>{isPro ? "PLAN PRO" : "PLAN FREE"}</span>
            )}
            {user ? (
              <span className="chip chip--emerald">NUBE SINCRONIZADA</span>
            ) : (
              <span className="chip">INVITADO</span>
            )}
            {dirty && <span className="chip chip--gold">CAMBIOS SIN GUARDAR</span>}
          </div>
        </div>
        <div className="profile-summary__stats">
          <div>
            <span>PLAN</span>
            <b>{isAdmin ? "PRO VITALICIO" : isPro ? "PRO" : "FREE"}</b>
          </div>
          <div>
            <span>CRÉDITOS</span>
            <b>{isAdmin ? "ILIMITADOS" : formatNumber(prefs.credits)}</b>
          </div>
          <div>
            <span>PAÍS</span>
            <b>{country || "Perú"}</b>
          </div>
          <div>
            <span>MIEMBRO DESDE</span>
            <b className="profile-summary__since">{formatDateLong(memberSince)}</b>
          </div>
        </div>
      </div>

      <form
        className="profile-form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <section className="card profile-card">
          <div className="profile-card__head">
            <div>
              <div className="card__label">DATOS DE CUENTA</div>
              <h2>Información Personal</h2>
            </div>
            <span className="chip">
              <Lock size={11} /> SINCRONIZADO LOCAL
            </span>
          </div>

          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="profile-name">NOMBRE COMPLETO</label>
              <input id="profile-name" className="input" value={prefs.fullName} readOnly />
              <span className="field__hint">Sincronizado desde tu cuenta local · no editable</span>
            </div>
            <div className="field">
              <label className="label" htmlFor="profile-email">EMAIL</label>
              <div className="input-affix input-affix--readonly">
                <Mail size={14} />
                <input id="profile-email" className="input" value={prefs.email} readOnly />
              </div>
              <span className="field__hint">Este entorno no envía correos ni verifica direcciones</span>
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="profile-artist">NOMBRE ARTÍSTICO · Cómo apareces en la plataforma</label>
            <input
              id="profile-artist"
              className="input"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="Tu nombre artístico"
            />
          </div>

          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="profile-country">PAÍS *</label>
              <div className="input-affix">
                <Globe2 size={14} />
                <select id="profile-country" className="select" value={country} onChange={(e) => setCountry(e.target.value)}>
                  <option value="">Selecciona tu país</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="profile-phone">TELÉFONO · Opcional</label>
              <input
                id="profile-phone"
                className="input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+51 999 999 999"
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="profile-birth">FECHA DE NACIMIENTO · Opcional</label>
              <input
                id="profile-birth"
                className="input"
                type="date"
                min="1900-01-01"
                max={new Date().toISOString().slice(0, 10)}
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
              <span className="field__hint">Se guarda solo en tu navegador. Puedes dejarla vacía.</span>
            </div>
            <div className="field">
              <span className="label">RESUMEN DEL PLAN</span>
              <div className="profile-plan-strip">
                <span className={`chip ${isPro ? "chip--gold" : "chip--emerald"}`}>{isPro ? "PRO" : "FREE"}</span>
                <span className="mono">{formatNumber(prefs.credits)} / {formatNumber(creditsMax)} CR</span>
                <Link className="link link--mono" to="/billing">
                  Gestionar <ArrowUpRight size={11} />
                </Link>
              </div>
            </div>
          </div>

          <div className="divider" />

          <div className="profile-card__head profile-card__head--small">
            <div>
              <div className="card__label">PRESENCIA</div>
              <h3>Redes Sociales</h3>
            </div>
            <span className="chart-note">OPCIONAL · SOLO LOCAL</span>
          </div>
          <div className="form-grid form-grid--three">
            <div className="field">
              <label className="label" htmlFor="social-ig">INSTAGRAM</label>
              <div className="input-affix">
                <span>@</span>
                <input
                  id="social-ig"
                  className="input"
                  value={socials.instagram}
                  onChange={(e) => setSocials((s) => ({ ...s, instagram: e.target.value }))}
                  placeholder="tuusuario"
                />
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="social-tiktok">TIKTOK</label>
              <div className="input-affix">
                <span>@</span>
                <input
                  id="social-tiktok"
                  className="input"
                  value={socials.tiktok}
                  onChange={(e) => setSocials((s) => ({ ...s, tiktok: e.target.value }))}
                  placeholder="tuusuario"
                />
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="social-spotify">SPOTIFY ARTIST</label>
              <div className="input-affix">
                <span>artist/</span>
                <input
                  id="social-spotify"
                  className="input"
                  value={socials.spotify}
                  onChange={(e) => setSocials((s) => ({ ...s, spotify: e.target.value }))}
                  placeholder="id-de-artista"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="card profile-card">
          <div className="profile-card__head">
            <div>
              <div className="card__label">PROGRESO</div>
              <h2>Tutoriales</h2>
            </div>
            <span className="chip">{tutorialPct}%</span>
          </div>
          <div className="tutorial-progress">
            <div className="tutorial-progress__bar">
              <span style={{ width: `${tutorialPct}%` }} />
            </div>
            <span className="mono">{completedTutorials} de 1 tutoriales completados</span>
          </div>
          <div className="tutorial-row">
            <span className={`tutorial-row__icon ${prefs.tutorialScan ? "is-done" : ""}`}>
              {prefs.tutorialScan ? <Check size={15} /> : <Sparkles size={15} />}
            </span>
            <span className="tutorial-row__body">
              <b>Escanear tu primer track</b>
              <small>El escáner mide 12 módulos y guarda el informe en tu proyecto.</small>
            </span>
            <span className={`chip ${prefs.tutorialScan ? "chip--emerald" : ""}`}>
              {prefs.tutorialScan ? "COMPLETADO" : "PENDIENTE"}
            </span>
            <Link className="btn btn--ghost btn--sm" to="/scan">
              {prefs.tutorialScan ? "Repetir" : "Empezar"} <ChevronRight size={13} />
            </Link>
          </div>
        </section>

        <section className="card profile-card">
          <div className="profile-card__head">
            <div>
              <div className="card__label">COMUNICACIONES</div>
              <h2>Novedades y ofertas</h2>
            </div>
            <span className="chip">LOCAL</span>
          </div>
          <div className="profile-toggle-row">
            <div>
              <b>Recibe correos ocasionales</b>
              <p>Nuevas herramientas, mejoras y ofertas. En este entorno no se envía ningún correo: la preferencia solo se guarda en tu navegador.</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
                aria-label="Activar comunicaciones"
              />
              <span className="switch__track" aria-hidden="true">
                <span className="switch__thumb" />
              </span>
            </label>
          </div>
        </section>

        <div className="profile-savebar">
          <div className="profile-savebar__note">
            <Info size={14} />
            <span>
              {dirty ? "Tienes cambios pendientes. Guárdalos para actualizar tu perfil local." : "Todos los cambios están guardados."}
            </span>
          </div>
          <div className="row-flex">
            <Link className="btn btn--ghost" to="/billing">
              <BadgeCheck size={14} /> Mi suscripción
            </Link>
            <button className="btn btn--primary" type="submit" disabled={!dirty}>
              <Save size={14} /> Guardar cambios
            </button>
          </div>
        </div>
      </form>

      {/* SEGURIDAD Y CLAVE DE ACCESO (ADMINISTRADOR Y USUARIO) */}
      <section className="card profile-card" style={{ marginBottom: 20 }}>
        <div className="profile-card__head">
          <div>
            <div className="card__label">SEGURIDAD Y AUTENTICACIÓN</div>
            <h2>{isAdmin ? "Clave de Acceso de Administrador" : "Clave de Acceso a tu Cuenta"}</h2>
          </div>
          <span className={`chip ${isAdmin ? "chip--gold" : "chip--emerald"}`}>
            <Lock size={11} /> {isAdmin ? "👑 PANEL ADMINISTRADOR" : user ? "CUENTA VINCULADA" : "SESIÓN REQUERIDA"}
          </span>
        </div>

        {user ? (
          <div>
            <p className="mute" style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 18 }}>
              {isAdmin ? (
                <>
                  Tu cuenta de administrador está vinculada a <b>{user.email}</b>. Aquí puedes cambiar o definir tu contraseña
                  de acceso a la plataforma SoundLab AI y al panel de control. La clave se sincroniza de inmediato con Supabase Auth.
                </>
              ) : (
                <>
                  Tu cuenta está registrada con <b>{user.email}</b>. Puedes cambiar tu contraseña de acceso cuando lo desees.
                </>
              )}
            </p>

            <form onSubmit={handleUpdatePassword} style={{ maxWidth: 640 }}>
              <div className="form-grid" style={{ marginBottom: 16 }}>
                <div className="field">
                  <label className="label" htmlFor="new-pass">NUEVA CONTRASEÑA *</label>
                  <div className="input-affix">
                    <KeyRound size={14} />
                    <input
                      id="new-pass"
                      className="input"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setShowPassword((v) => !v)}
                      style={{ padding: "0 8px", height: "100%", border: "none" }}
                      aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <span className="field__hint">Usa una combinación segura de letras y números.</span>
                </div>

                <div className="field">
                  <label className="label" htmlFor="confirm-pass">CONFIRMAR CONTRASEÑA *</label>
                  <div className="input-affix">
                    <Lock size={14} />
                    <input
                      id="confirm-pass"
                      className="input"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite tu nueva contraseña"
                      autoComplete="new-password"
                    />
                  </div>
                  <span className="field__hint">Debe coincidir exactamente con la contraseña anterior.</span>
                </div>
              </div>

              <div className="row-flex" style={{ gap: 12 }}>
                <button
                  type="submit"
                  className="btn btn--gold"
                  disabled={updatingPassword || !newPassword || !confirmPassword}
                >
                  <Save size={14} /> {updatingPassword ? "Actualizando clave..." : "Guardar Nueva Contraseña"}
                </button>
                {isAdmin && (
                  <span className="chip chip--gold" style={{ fontSize: 11 }}>
                    👑 Permisos de Administrador Activos
                  </span>
                )}
              </div>
            </form>
          </div>
        ) : (
          <div>
            <p className="mute" style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 16 }}>
              Estás navegando en modo invitado sin una sesión remota iniciada. Para configurar o cambiar tu clave de administrador o de usuario, por favor inicia sesión o crea tu cuenta.
            </p>
            <div className="row-flex" style={{ gap: 10 }}>
              <button type="button" className="btn btn--primary" onClick={() => openAuthModal("signin")}>
                <LogIn size={14} /> Iniciar Sesión como Administrador
              </button>
              <button type="button" className="btn btn--gold" onClick={() => openAuthModal("signup")}>
                <UserRound size={14} /> Registrar Nueva Cuenta
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="card" style={{ marginBottom: 20 }}>
        <div className="profile-card__head">
          <div>
            <div className="card__label">ALMACENAMIENTO LOCAL</div>
            <h2>IndexedDB y espacio en disco</h2>
          </div>
          <span className="chip chip--emerald">
            <HardDrive size={11} /> 100% EN TU EQUIPO
          </span>
        </div>
        <p>
          Los audios analizados y los WAV renderizados en 24 bits se guardan localmente para no transmitirlos a ningún servidor.
          {storageInfo ? (
            <>
              {" "}Espacio utilizado en este navegador: <b>{formatBytes(storageInfo.usage)}</b> de{" "}
              <b>{formatBytes(storageInfo.quota)}</b> disponibles ({((storageInfo.usage / storageInfo.quota) * 100).toFixed(1)}%).
            </>
          ) : (
            " Tu navegador asigna espacio dinámico para almacenar las sesiones."
          )}
        </p>
        {storageInfo && storageInfo.quota > 0 && (
          <div className="credit-bar" style={{ margin: "14px 0 16px" }}>
            <span style={{ width: `${Math.min(100, Math.max(1, (storageInfo.usage / storageInfo.quota) * 100))}%` }} />
          </div>
        )}
        <div className="row-flex">
          <button className="btn btn--ghost btn--sm" onClick={() => setPurgeOpen(true)}>
            <Trash2 size={13} /> Liberar audios pesados
          </button>
          <span className="chart-note" style={{ letterSpacing: 0 }}>
            Mantiene los informes, métricas y certificados; solo elimina las muestras de audio en disco para liberar espacio.
          </span>
        </div>
      </section>

      <section className="card profile-danger">
        <div className="profile-danger__head">
          <div>
            <div className="card__label">DATOS LOCALES</div>
            <h2>Privacidad y reinicio</h2>
          </div>
          <span className="chip chip--danger">
            <Trash2 size={11} /> ACCIÓN IRREVERSIBLE
          </span>
        </div>
        <p>
          La aplicación guarda proyectos, análisis, renders y certificados en IndexedDB, dentro de tu navegador. Puedes
          exportar los metadatos o limpiar los proyectos locales de prueba. Tu cuenta en la nube permanece segura.
        </p>
        <div className="row-flex">
          <button className="btn btn--ghost" onClick={exportData}>
            <Download size={14} /> Exportar JSON
          </button>
          <button className="btn btn--danger" onClick={() => setResetOpen(true)}>
            <RotateCcw size={14} /> Limpiar caché local
          </button>
          <span className="chart-note" style={{ letterSpacing: 0 }}>
            Los audios no se incluyen en la exportación.
          </span>
        </div>
      </section>

      <div className="profile-footnote">
        <UserRound size={14} />
        <span>
          {user
            ? `Sesión activa sincronizada con Supabase como ${user.email}. Privacidad garantizada: tus audios nunca salen del equipo.`
            : "Estás explorando en modo local. Inicia sesión para sincronizar tus pedidos y conservar tus créditos permanentemente."}
        </span>
      </div>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        eyebrow="LIMPIAR CACHÉ"
        title="¿Limpiar los proyectos locales del navegador?"
        footer={
          <div className="row-flex" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn--ghost" onClick={() => setResetOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn--danger" onClick={resetAll}>
              <Trash2 size={14} /> Limpiar caché
            </button>
          </div>
        }
      >
        <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          Se eliminarán los proyectos y análisis temporales guardados en este navegador. Tu cuenta de usuario y créditos en Supabase
          no se verán afectados. Esta acción no se puede deshacer.
        </p>
      </Modal>

      <Modal
        open={purgeOpen}
        onClose={() => setPurgeOpen(false)}
        eyebrow="LIBERAR ALMACENAMIENTO"
        title="¿Eliminar archivos de audio pesados?"
        footer={
          <div className="row-flex" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn--ghost" onClick={() => setPurgeOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn--primary" onClick={purgeAudioBlobs}>
              <Trash2 size={14} /> Liberar espacio
            </button>
          </div>
        }
      >
        <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          Esta acción borra los archivos binarios de audio guardados en IndexedDB. Todos tus proyectos, informes de escaneo,
          gráficos forenses, certificados SHA-256 y configuraciones se mantendrán intactos.
        </p>
      </Modal>
    </div>
  );
}
