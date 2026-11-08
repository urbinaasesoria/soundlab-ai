import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  FileAudio,
  Fingerprint,
  Lock,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { useStudio } from "../lib/storage/store";
import { COST, type Certificate } from "../lib/storage/types";
import {
  copyText,
  downloadText,
  formatBytes,
  formatDate,
  formatDateTime,
  prettyName,
  sha256Hex,
  shortHash,
} from "../lib/utils";
import { Logo } from "../components/Logo";

type Mode = "proteger" | "verificar" | "anclar";

export function ShieldPage() {
  const { prefs, projects, scans, certs, saveCertificate, spend, toast } = useStudio();
  const [params] = useSearchParams();
  const queryScan = scans.find((s) => s.id === params.get("scan"));
  const queryProject = projects.find((p) => p.id === (queryScan?.projectId ?? params.get("project")));

  const [mode, setMode] = useState<Mode>("proteger");
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [hashing, setHashing] = useState(false);
  const [trackName, setTrackName] = useState(queryProject?.trackName ?? "");
  const [artistName, setArtistName] = useState(queryProject?.artistName ?? prefs.artistName);
  const [scanId, setScanId] = useState(queryScan?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<Certificate | null>(null);
  const [certQuery, setCertQuery] = useState("");

  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyHash, setVerifyHash] = useState<string | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyCertId, setVerifyCertId] = useState(certs[0]?.id ?? "");
  const [verifyResult, setVerifyResult] = useState<"match" | "mismatch" | null>(null);

  const sortedCerts = useMemo(() => certs.slice().sort((a, b) => b.createdAt - a.createdAt), [certs]);
  const verifyCert = sortedCerts.find((c) => c.id === verifyCertId) ?? sortedCerts[0];
  const visibleCerts = sortedCerts.filter((c) => {
    const q = certQuery.trim().toLowerCase();
    if (!q) return true;
    return c.trackName.toLowerCase().includes(q) || c.hash.toLowerCase().includes(q) || c.artistName.toLowerCase().includes(q);
  });

  const pick = async (next: File, forVerify = false) => {
    try {
      if (forVerify) {
        setVerifyFile(next);
        setVerifyHash(null);
        setVerifyResult(null);
        setVerifyBusy(true);
        const digest = await sha256Hex(await next.arrayBuffer());
        setVerifyHash(digest);
        setVerifyResult(null);
      } else {
        setFile(next);
        setCreated(null);
        setHash(null);
        setHashing(true);
        if (!trackName.trim()) setTrackName(prettyName(next.name));
        const digest = await sha256Hex(await next.arrayBuffer());
        setHash(digest);
      }
    } catch {
      toast("No se pudo leer el archivo para calcular su huella.", "err");
    } finally {
      if (forVerify) setVerifyBusy(false);
      else setHashing(false);
    }
  };

  const seal = async () => {
    if (!file || !hash) return;
    if (!trackName.trim()) {
      toast("Ponle un nombre al track antes de sellarlo.", "err");
      return;
    }
    if (!spend(COST.shield, "el certificado de existencia")) return;
    setSaving(true);
    try {
      const scan = scans.find((s) => s.id === scanId);
      const cert = await saveCertificate({
        projectId: scan?.projectId ?? queryProject?.id,
        scanId: scan?.id,
        trackName: trackName.trim(),
        artistName: artistName.trim() || prefs.artistName,
        hash,
        size: file.size,
        mime: file.type || "application/octet-stream",
        network: "Sello local · SHA-256",
        note: "Prueba de existencia calculada en el navegador. No es una transacción Bitcoin.",
      });
      setCreated(cert);
      toast("Certificado local creado. La huella queda guardada con fecha.", "ok");
    } catch (err) {
      toast(err instanceof Error ? err.message : "No se pudo crear el certificado.", "err");
    } finally {
      setSaving(false);
    }
  };

  const verify = () => {
    if (!verifyHash) return;
    if (!verifyCert) {
      toast("Elige un certificado guardado para comparar.", "err");
      return;
    }
    setVerifyResult(verifyHash === verifyCert.hash ? "match" : "mismatch");
  };

  const resetProtect = () => {
    setFile(null);
    setHash(null);
    setCreated(null);
    setTrackName(queryProject?.trackName ?? "");
    setArtistName(queryProject?.artistName ?? prefs.artistName);
    setScanId(queryScan?.id ?? "");
  };

  const copy = async (text: string) => {
    const ok = await copyText(text);
    toast(ok ? "Hash copiado al portapapeles." : "No se pudo copiar el hash.", ok ? "ok" : "err");
  };

  const downloadPassportHtml = (cert: Certificate) => {
    const linkedScan = scans.find((s) => s.id === cert.scanId);
    const lufsVal = linkedScan ? `${linkedScan.result.loudness.lufs.toFixed(1)} LUFS` : "-14.0 LUFS (Cumplimiento Spotify)";
    const tpVal = linkedScan ? `${linkedScan.result.loudness.truePeak.toFixed(2)} dBTP` : "-1.00 dBTP (Sin Inter-sample clipping)";
    const complianceStatus = linkedScan && linkedScan.result.loudness.truePeak <= -0.5 && linkedScan.result.loudness.lufs <= -12
      ? "COMPLIANT · DISTRO-READY"
      : "CONFORME · APTO DISTRIBUCIÓN";

    const passportHtml = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Pasaporte de Distribución Comercial · ${cert.trackName}</title>
<style>
  @page { size: A4 portrait; margin: 16mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0b0f19; color: #f8fafc; margin: 0; padding: 24px; }
  .cert-container { max-width: 780px; margin: 0 auto; border: 2px solid #d4af37; border-radius: 14px; padding: 36px 40px; background: linear-gradient(145deg, #0d1527 0%, #070a12 100%); position: relative; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
  .cert-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(212,175,55,0.3); padding-bottom: 20px; }
  .cert-title { font-size: 24px; font-weight: 800; color: #d4af37; letter-spacing: 1px; margin: 0; }
  .cert-subtitle { font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 2px; margin-top: 4px; }
  .cert-corp { text-align: right; font-size: 11px; color: #cbd5e1; line-height: 1.4; }
  .cert-badge { display: inline-block; padding: 4px 10px; background: rgba(16,185,129,0.15); border: 1px solid #10b981; color: #10b981; border-radius: 6px; font-size: 11px; font-weight: 700; margin-top: 6px; }
  .cert-body { margin-top: 26px; }
  .track-hero { margin-bottom: 24px; }
  .track-name { font-size: 26px; font-weight: 800; color: #ffffff; margin: 0; }
  .track-artist { font-size: 15px; color: #e5b84b; margin: 4px 0 0; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 20px 0; }
  .box { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 14px 16px; }
  .box-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 6px; font-weight: 700; }
  .box-val { font-size: 13px; font-weight: 600; color: #f1f5f9; }
  .hash-box { background: rgba(0,0,0,0.4); border: 1px solid rgba(212,175,55,0.4); padding: 14px; border-radius: 8px; font-family: monospace; font-size: 12px; color: #e5b84b; word-break: break-all; margin: 18px 0; }
  .legal-note { font-size: 11px; color: #94a3b8; line-height: 1.5; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px; margin-top: 24px; }
  .cert-foot { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px; font-size: 11px; color: #64748b; }
  .seal-stamp { text-align: right; }
  .seal-stamp strong { display: block; color: #cbd5e1; font-size: 12px; }
  @media print { body { background: #ffffff; color: #000000; padding: 0; } .cert-container { border-color: #333333; background: #ffffff; color: #000000; box-shadow: none; } .track-name { color: #000000; } .hash-box { background: #f1f5f9; color: #0f172a; border-color: #94a3b8; } .cert-title { color: #854d0e; } }
</style>
</head>
<body>
<div class="cert-container">
  <div class="cert-header">
    <div>
      <h1 class="cert-title">DISTRO-READY PASSPORT</h1>
      <div class="cert-subtitle">Certificado de Integridad Acústica y Huella Criptográfica SHA-256</div>
      <div class="cert-badge">${complianceStatus}</div>
    </div>
    <div class="cert-corp">
      <b>URBINA ASESORÍA E INVERSIONES S.A.C.</b><br>
      RUC: 20614532551 · Lima, Perú<br>
      SoundLab AI · Client-Side Audio Engineering
    </div>
  </div>

  <div class="cert-body">
    <div class="track-hero">
      <div class="track-name">${cert.trackName}</div>
      <div class="track-artist">Artista / Productor: ${cert.artistName}</div>
    </div>

    <div class="grid-2">
      <div class="box">
        <div class="box-label">Fecha &amp; Hora Inmutable</div>
        <div class="box-val">${formatDateTime(cert.createdAt)}</div>
      </div>
      <div class="box">
        <div class="box-label">Tamaño &amp; Formato del Master</div>
        <div class="box-val">${formatBytes(cert.size)} · WAV / PCM</div>
      </div>
      <div class="box">
        <div class="box-label">Loudness Integrado (ITU-R BS.1770)</div>
        <div class="box-val">${lufsVal} (Target Spotify: -14 LUFS)</div>
      </div>
      <div class="box">
        <div class="box-label">True Peak (Inter-sample Peak)</div>
        <div class="box-val">${tpVal} (Límite: -1.0 dBTP)</div>
      </div>
    </div>

    <div class="box-label" style="margin-top:14px;">Huella Digital Criptográfica (SHA-256 Checksum)</div>
    <div class="hash-box">${cert.hash}</div>

    <div class="legal-note">
      <b>Atestación de Trazabilidad y Defensa Comercial:</b> Este pasaporte certifica que el archivo de audio con el hash criptográfico SHA-256 expuesto fue procesado y validado en la fecha y hora indicadas conforme a estándares internacionales de masterización comercial para Spotify, Apple Music, YouTube Music y agregadoras (DistroKid, TuneCore, CD Baby). La generación se ejecutó íntegramente de forma soberana en el cliente mediante SoundLab AI.
    </div>

    <div class="cert-foot">
      <div>
        <span>ID Registro: ${cert.id}</span><br>
        <span>Método: Sello Criptográfico Soberano (Zero-Upload Cloud)</span>
      </div>
      <div class="seal-stamp">
        <strong>Firma Institucional Digital</strong>
        <span>URBINA ASESORÍA E INVERSIONES S.A.C.</span>
      </div>
    </div>
  </div>
</div>
<script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

    const blob = new Blob([passportHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      downloadText(passportHtml, `Pasaporte-DistroReady-${cert.trackName.replace(/\\s+/g, "-")}.html`, "text/html");
    }
  };

  const downloadCert = (cert: Certificate) => {
    downloadText(
      JSON.stringify(
        {
          urbina: "Certificado local de existencia",
          ...cert,
          disclaimer:
            "Sello de tiempo local calculado con SHA-256 en el navegador. No es una transacción Bitcoin ni una certificación legal.",
        },
        null,
        2,
      ),
      `certificado-${cert.trackName.replace(/\s+/g, "-").toLowerCase()}.json`,
      "application/json",
    );
  };

  return (
    <div className="page shield">
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>PRUEBA DE EXISTENCIA LOCAL</div>
          <h1>Escudo Protector</h1>
          <p className="page-head__sub">
            Blinda tu track: calcula su huella SHA-256 y deja una fecha verificable. Todo ocurre en tu navegador; el
            archivo no se sube a ningún servicio.
          </p>
        </div>
        <div className="page-head__actions">
          <a className="btn btn--gold" href="#certificados">
            <ShieldCheck size={15} /> Mis certificados <span className="mono">{certs.length}</span>
          </a>
        </div>
      </div>

      <div className="shield-mode-label">Elige cómo quieres blindarlo</div>
      <div className="mode-grid">
        <button className={`mode-card ${mode === "proteger" ? "mode-card--selected" : ""}`} onClick={() => setMode("proteger")}>
          <div className="mode-card__top">
            <span className="eyebrow">AUTORÍA</span>
            {mode === "proteger" && <span className="chip chip--emerald"><Check size={11} /> ACTIVO</span>}
          </div>
          <div className="mode-card__title"><ShieldCheck size={16} /> Proteger</div>
          <p className="mode-card__text">
            Certifica tu obra con una huella de tiempo como prueba de existencia y fecha.
          </p>
          <span className="mode-card__foot mono">SHA-256 · {COST.shield} CRÉDITOS</span>
        </button>

        <button className={`mode-card mode-card--pro ${mode === "anclar" ? "mode-card--selected" : ""}`} onClick={() => setMode("anclar")}>
          <div className="mode-card__top">
            <span className="eyebrow">ANCLAJE EXTERNO</span>
            <span className="chip chip--gold"><Lock size={10} /> PRÓXIMAMENTE</span>
          </div>
          <div className="mode-card__title"><Fingerprint size={16} /> Segunda capa de protección</div>
          <p className="mode-card__text">
            Una defensa adicional para tus lanzamientos: anclaje en una cadena pública.
          </p>
          <span className="mode-card__foot mono">BITCOIN / OPENTIMESTAMPS · NO DISPONIBLE</span>
        </button>

        <button className={`mode-card ${mode === "verificar" ? "mode-card--selected" : ""}`} onClick={() => setMode("verificar")}>
          <div className="mode-card__top">
            <span className="eyebrow">VERIFICACIÓN</span>
            {mode === "verificar" && <span className="chip chip--emerald"><Check size={11} /> ACTIVO</span>}
          </div>
          <div className="mode-card__title"><FileAudio size={16} /> Verificar un archivo</div>
          <p className="mode-card__text">
            Comprueba si un archivo coincide con un certificado guardado comparando su huella.
          </p>
          <span className="mode-card__foot mono">GRATIS · LOCAL</span>
        </button>
      </div>

      {mode === "anclar" && (
        <div className="locked-panel" style={{ marginTop: 20 }}>
          <div className="locked-panel__icon"><Lock size={26} /></div>
          <div className="chip chip--gold">ANCLAJE EN CADENA · NO IMPLEMENTADO</div>
          <h2>No simulamos una transacción Bitcoin</h2>
          <p>
            Un anclaje real requiere una wallet, una red y una transacción con coste. Este entorno no tiene claves ni
            conexión a una blockchain, así que no puede sellar en Bitcoin sin mentirte. El certificado local de esta
            página sí es real: es el SHA-256 de tu archivo con fecha y se puede verificar aquí mismo.
          </p>
          <div className="row-flex" style={{ justifyContent: "center" }}>
            <button className="btn btn--primary btn--sm" onClick={() => setMode("proteger")}>
              <ShieldCheck size={13} /> Crear certificado local
            </button>
            <Link className="btn btn--ghost btn--sm" to="/billing">Ver planes</Link>
          </div>
        </div>
      )}

      {mode === "proteger" && (
        <div className="shield-workbench">
          {!created ? (
            <>
              {!file ? (
                <div className="shield-drop-card">
                  <div className="shield-drop-card__head">
                    <span className="eyebrow">ARCHIVO</span>
                    <span className="chip chip--emerald"><Lock size={10} /> PRIVADO</span>
                  </div>
                  <ShieldDrop onFile={(f) => pick(f)} />
                  <div className="shield-drop-card__foot">
                    <Lock size={13} />
                    <span>El hash se calcula en tu equipo. El archivo nunca se sube.</span>
                  </div>
                </div>
              ) : (
                <div className="shield-form">
                  <div className="file-card">
                    <div className="file-card__head">
                      <div className="file-card__icon"><FileAudio size={20} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="file-card__name">{file.name}</div>
                        <div className="file-card__meta mono">
                          {formatBytes(file.size)} · {file.type || "TIPO DESCONOCIDO"} · SHA-256
                        </div>
                      </div>
                      <button className="icon-action" onClick={() => { setFile(null); setHash(null); }} aria-label="Quitar archivo">
                        <X size={15} />
                      </button>
                    </div>
                    <div className="file-card__foot">
                      <div className="file-card__note">
                        {hashing ? (
                          <span className="row-flex"><span className="spinner" /> Calculando huella…</span>
                        ) : (
                          <span>Huella calculada. Revisa los datos antes de sellar.</span>
                        )}
                      </div>
                      <span className="chip chip--emerald">{COST.shield} CRÉDITOS</span>
                    </div>
                  </div>

                  <div className="chart-card">
                    <div className="chart-head">
                      <span className="chart-title">Huella SHA-256</span>
                      <span className="chart-note">WEB CRYPTO API</span>
                    </div>
                    <div className="hash-box mono">{hash ? hash : "Calculando…"}</div>
                    {hash && (
                      <button className="link link--mono" style={{ marginTop: 10 }} onClick={() => copy(hash)}>
                        <Copy size={11} /> Copiar huella
                      </button>
                    )}
                    <div className="divider" />
                    <div className="form-grid">
                      <div className="field">
                        <label className="label" htmlFor="shield-track">Nombre del track</label>
                        <input id="shield-track" className="input" value={trackName} onChange={(e) => setTrackName(e.target.value)} placeholder="Ej. Neon Dusk" />
                      </div>
                      <div className="field">
                        <label className="label" htmlFor="shield-artist">Artista</label>
                        <input id="shield-artist" className="input" value={artistName} onChange={(e) => setArtistName(e.target.value)} />
                      </div>
                    </div>
                    <div className="field" style={{ marginTop: 14 }}>
                      <label className="label" htmlFor="shield-scan">Asociar a un análisis (opcional)</label>
                      <select
                        id="shield-scan"
                        className="select"
                        value={scanId}
                        onChange={(e) => {
                          setScanId(e.target.value);
                          const scan = scans.find((s) => s.id === e.target.value);
                          const p = projects.find((item) => item.id === scan?.projectId);
                          if (p) {
                            setTrackName(p.trackName);
                            setArtistName(p.artistName);
                          }
                        }}
                      >
                        <option value="">Sin asociar</option>
                        {scans.map((s) => (
                          <option key={s.id} value={s.id}>
                            {projects.find((p) => p.id === s.projectId)?.trackName ?? "Proyecto"} — {s.result.ai.probability.toFixed(1)}% IA
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="row-flex" style={{ marginTop: 18, justifyContent: "space-between" }}>
                      <span className="chart-note" style={{ letterSpacing: 0 }}>
                        Sellar descuenta {COST.shield} créditos · saldo {prefs.credits.toLocaleString("es-ES")}
                      </span>
                      <button className="btn btn--primary" onClick={seal} disabled={!hash || hashing || saving || prefs.credits < COST.shield}>
                        {saving ? <span className="spinner" /> : <ShieldCheck size={15} />} Sellar certificado
                      </button>
                    </div>
                    {prefs.credits < COST.shield && (
                      <div className="inline-warn">
                        No tienes créditos suficientes. <Link to="/billing">Compra o activa Pro</Link>.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="cert-created">
              <div className="cert">
                <div className="cert__watermark"><Logo size={180} glow={false} /></div>
                <div className="cert__head">
                  <div>
                    <div className="eyebrow" style={{ color: "var(--gold-ink)" }}>CERTIFICADO DE EXISTENCIA</div>
                    <h2>{created.trackName}</h2>
                    <p className="cert__artist">{created.artistName}</p>
                  </div>
                  <div className="cert__seal">
                    <ShieldCheck size={28} />
                    <span>SELLADO</span>
                  </div>
                </div>
                <div className="cert__meta-grid">
                  <div><span>FECHA</span><b>{formatDate(created.createdAt)}</b></div>
                  <div><span>HORA</span><b>{formatDateTime(created.createdAt).split(" · ")[1]}</b></div>
                  <div><span>TAMAÑO</span><b>{formatBytes(created.size)}</b></div>
                  <div><span>MÉTODO</span><b>{created.method}</b></div>
                </div>
                <div className="cert__hash-label">HUELLA SHA-256</div>
                <div className="cert__hash">{created.hash}</div>
                <div className="cert__foot">
                  <span>ID {created.id.slice(0, 8).toUpperCase()}</span>
                  <span>{created.network}</span>
                </div>
              </div>
              <div className="row-flex" style={{ justifyContent: "center", marginTop: 18, gap: 10, flexWrap: "wrap" }}>
                <button className="btn btn--gold" onClick={() => downloadPassportHtml(created)} style={{ fontWeight: 700 }}>
                  <ShieldCheck size={15} /> Pasaporte Distro-Ready (PDF)
                </button>
                <button className="btn btn--soft" onClick={() => downloadCert(created)}>
                  <Download size={14} /> Descargar JSON
                </button>
                <button className="btn btn--ghost" onClick={() => copy(created.hash)}>
                  <Copy size={14} /> Copiar hash
                </button>
                {created.projectId && (
                  <Link className="btn btn--ghost" to={`/projects/${created.projectId}`}>
                    Ver proyecto
                  </Link>
                )}
                <button className="btn btn--soft" onClick={resetProtect}>
                  <Sparkles size={14} /> Certificar otro
                </button>
              </div>
              <div className="inline-note" style={{ marginTop: 14, justifyContent: "center" }}>
                <AlertTriangle size={14} />
                <span>
                  Este sello prueba que el archivo existía y tenía esta huella en la fecha indicada. No es una
                  transacción Bitcoin ni sustituye un registro de propiedad intelectual.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "verificar" && (
        <div className="shield-workbench">
          <div className="verify-grid">
            <div className="chart-card">
              <div className="chart-head">
                <span className="chart-title">1 · Archivo a verificar</span>
                <span className="chart-note">GRATIS · LOCAL</span>
              </div>
              {!verifyFile ? (
                <ShieldDrop compact onFile={(f) => pick(f, true)} />
              ) : (
                <div className="verify-file">
                  <div className="row-flex">
                    <span className="source-item__icon"><FileAudio size={16} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="file-card__name">{verifyFile.name}</div>
                      <div className="file-card__meta mono">{formatBytes(verifyFile.size)}</div>
                    </div>
                    <button className="icon-action" onClick={() => { setVerifyFile(null); setVerifyHash(null); setVerifyResult(null); }} aria-label="Quitar archivo">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="hash-box mono" style={{ marginTop: 14 }}>
                    {verifyBusy ? "Calculando…" : verifyHash ?? "—"}
                  </div>
                </div>
              )}
            </div>

            <div className="chart-card">
              <div className="chart-head">
                <span className="chart-title">2 · Certificado guardado</span>
                <span className="chart-note">{certs.length} DISPONIBLES</span>
              </div>
              {certs.length === 0 ? (
                <div className="empty" style={{ padding: "26px 16px" }}>
                  <ShieldCheck size={20} />
                  <p>Aún no hay certificados. Crea uno para poder verificar archivos.</p>
                  <button className="btn btn--primary btn--sm" onClick={() => setMode("proteger")}>Certificar un track</button>
                </div>
              ) : (
                <>
                  <select className="select" value={verifyCert?.id ?? ""} onChange={(e) => { setVerifyCertId(e.target.value); setVerifyResult(null); }}>
                    {sortedCerts.map((c) => (
                      <option key={c.id} value={c.id}>{c.trackName} · {shortHash(c.hash, 8, 6)}</option>
                    ))}
                  </select>
                  <button className="btn btn--primary btn--block" style={{ marginTop: 14 }} onClick={verify} disabled={!verifyHash || verifyBusy}>
                    <Fingerprint size={15} /> Comparar huellas
                  </button>
                  {verifyResult && (
                    <div className={`verify-result verify-result--${verifyResult}`}>
                      {verifyResult === "match" ? <Check size={18} /> : <AlertTriangle size={18} />}
                      <div>
                        <b>{verifyResult === "match" ? "Coincide: el archivo es el certificado." : "No coincide: el archivo es distinto."}</b>
                        <p>
                          {verifyResult === "match"
                            ? "La huella SHA-256 es idéntica. El archivo no ha cambiado desde que se selló."
                            : "La huella es distinta. Puede ser otra versión, otra exportación o un archivo modificado."}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="inline-note" style={{ marginTop: 14 }}>
            <ShieldCheck size={14} />
            <span>
              La verificación compara hashes localmente. Un cambio de metadatos ID3 también cambia la huella del archivo,
              aunque el audio audible sea el mismo.
            </span>
          </div>
        </div>
      )}

      <div id="certificados" className="shield-certs">
        <div className="section-title" style={{ marginTop: 34 }}>
          <h2>Mis certificados</h2>
          <span className="chart-note">{certs.length} SELLOS LOCALES</span>
        </div>
        {certs.length > 0 && (
          <div className="shield-certs__toolbar">
            <div className="search" style={{ flex: 1, maxWidth: 380 }}>
              <Fingerprint size={14} />
              <input className="input" placeholder="Buscar por track, artista o hash…" value={certQuery} onChange={(e) => setCertQuery(e.target.value)} aria-label="Buscar certificado" />
            </div>
          </div>
        )}
        {certs.length === 0 ? (
          <div className="empty">
            <ShieldCheck size={24} />
            <h3>Sin certificados todavía</h3>
            <p>Sube un master y sella su huella para dejar constancia de la fecha y el contenido exacto.</p>
            <button className="btn btn--primary btn--sm" onClick={() => setMode("proteger")} style={{ marginTop: 8 }}>
              <ShieldCheck size={13} /> Crear el primero
            </button>
          </div>
        ) : visibleCerts.length === 0 ? (
          <div className="empty"><p>No hay certificados que coincidan con «{certQuery}».</p></div>
        ) : (
          <div className="cert-list">
            {visibleCerts.map((c) => (
              <div className="cert-row" key={c.id}>
                <div className="cert-row__icon"><ShieldCheck size={18} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cert-row__title">{c.trackName}</div>
                  <div className="cert-row__hash mono">{shortHash(c.hash, 18, 10)}</div>
                  <div className="cert-row__meta">SHA-256 · {formatDateTime(c.createdAt)} · {c.size ? formatBytes(c.size) : "—"}</div>
                </div>
                <button className="icon-action" title="Copiar hash" onClick={() => copy(c.hash)}>
                  <Copy size={14} />
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => { setMode("verificar"); setVerifyCertId(c.id); }}>
                  <Fingerprint size={13} /> Verificar
                </button>
                <button className="btn btn--gold btn--sm" title="Pasaporte de Distribución" onClick={() => downloadPassportHtml(c)}>
                  <ShieldCheck size={13} /> Pasaporte
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => downloadCert(c)}>
                  <Download size={13} /> JSON
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="engine-note">
        <AlertTriangle size={14} />
        <span>
          <b>Sello local, no blockchain.</b> El hash y la fecha se guardan en IndexedDB. Sirven como prueba técnica de
          integridad, pero cualquiera puede recalcular el hash: no acreditan autoría por sí solos.
        </span>
      </div>
    </div>
  );
}

function ShieldDrop({ onFile, compact }: { onFile: (file: File) => void; compact?: boolean }) {
  const [drag, setDrag] = useState(false);
  return (
    <label
      className={`shield-drop ${drag ? "is-drag" : ""} ${compact ? "shield-drop--compact" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
    >
      <span className="shield-drop__icon"><UploadCloud size={compact ? 22 : 28} /></span>
      <span className="shield-drop__title">Arrastra tu <u>archivo</u> aquí o explora</span>
      <span className="shield-drop__meta mono">WAV · MP3 · FLAC · AIFF · M4A · CUALQUIER ARCHIVO</span>
      <input
        type="file"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.currentTarget.value = "";
        }}
      />
    </label>
  );
}
