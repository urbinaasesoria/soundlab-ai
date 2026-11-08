import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AudioWaveform,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  CreditCard,
  Crown,
  ExternalLink,
  Fingerprint,
  Gift,
  Globe2,
  Lock,
  LogIn,
  MessageCircle,
  QrCode,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";
import { Modal } from "../components/Modal";
import { useStudio } from "../lib/storage/store";
import { COST } from "../lib/storage/types";
import { copyText, formatDateLong, formatNumber } from "../lib/utils";
import { supabase, type DbOrder } from "../lib/supabase/client";

export type Currency = "PEN" | "USD" | "EUR";
export type PaymentMethod = "yape_plin" | "mercadopago" | "payoneer";

interface CurrencyPrice {
  PEN: number;
  USD: number;
  EUR: number;
}

type PlanChoice = {
  id: "pro-monthly" | "pro-annual";
  name: string;
  prices: CurrencyPrice;
  cadence: string;
  credits: number;
  note: string;
};

type PackChoice = {
  id: string;
  name: string;
  credits: number;
  bonus: number;
  prices: CurrencyPrice;
};

type Checkout =
  | { kind: "plan"; plan: PlanChoice }
  | { kind: "pack"; pack: PackChoice };

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  PEN: "S/",
  USD: "$",
  EUR: "€",
};

const PLANS: PlanChoice[] = [
  {
    id: "pro-monthly",
    name: "Creador Pro",
    prices: { PEN: 25, USD: 6.99, EUR: 6.99 },
    cadence: "/mes",
    credits: 1_000_000,
    note: "Suscripción mensual sin ataduras. Más accesible que Suno Pro ($6.99 vs $10). Cancela cuando quieras.",
  },
  {
    id: "pro-annual",
    name: "Pro Anual",
    prices: { PEN: 199, USD: 54, EUR: 54 },
    cadence: "/año",
    credits: 1_000_000,
    note: "Equivalente a S/ 16.50 /mes ($4.50 /mo) · Ahorras más del 45% con acceso a Pasaporte Distro-Ready.",
  },
];

const PACKS: PackChoice[] = [
  { id: "tripwire", name: "Tripwire OTO", credits: 300, bonus: 50, prices: { PEN: 9.9, USD: 2.99, EUR: 2.99 } },
  { id: "starter", name: "Starter", credits: 600, bonus: 100, prices: { PEN: 15, USD: 4.9, EUR: 4.9 } },
  { id: "studio", name: "Studio", credits: 1_800, bonus: 300, prices: { PEN: 29, USD: 9.9, EUR: 9.9 } },
  { id: "pro", name: "Pro Pack", credits: 5_000, bonus: 800, prices: { PEN: 69, USD: 19, EUR: 19 } },
  { id: "label", name: "Label", credits: 15_000, bonus: 3_000, prices: { PEN: 149, USD: 49, EUR: 49 } },
];

const FREE_FEATURES = [
  "Escaneo rápido de una muestra de 90 s",
  "Análisis forense contra 12 géneros",
  "Texturizador DSP local · WAV 24-bit",
  "Escudo Protector con SHA-256 local",
  "Coverizador con 3 reinterpretaciones",
];

const PRO_FEATURES = [
  "Escaneo profundo del track completo",
  "1.000.000 de créditos renovables",
  "Compositor PRO FLOW completo con IA",
  "Sellos y renders sin límites de plan",
  "Acceso anticipado a nuevos módulos",
];

export function BillingPage() {
  const { prefs, user, isAdmin, openAuthModal, addCredits, updatePrefs, toast } = useStudio();
  const [currency, setCurrency] = useState<Currency>("PEN");
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("yape_plin");
  const [busy, setBusy] = useState(false);

  // Campos para checkout Yape/Plin
  const [opCode, setOpCode] = useState("");
  const [payerName, setPayerName] = useState("");

  // Estado para gestión de pedidos de Administrador
  const [adminOrders, setAdminOrders] = useState<DbOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const fetchAdminOrders = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);
      if (!error && data) {
        setAdminOrders(data as DbOrder[]);
      }
    } catch (e) {
      console.error("Error al cargar pedidos:", e);
    } finally {
      setLoadingOrders(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminOrders();
    }
  }, [isAdmin, fetchAdminOrders]);

  const handleApproveOrder = async (orderId: string) => {
    try {
      const { error } = await supabase.rpc("approve_order", { target_order_id: orderId });
      if (error) {
        // Fallback: actualizar directamente en la tabla orders
        await supabase.from("orders").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", orderId);
      }
      toast("¡Pedido aprobado! Créditos y plan activados para el usuario.", "ok");
      fetchAdminOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "error al aprobar";
      toast("Error al aprobar: " + msg, "err");
    }
  };

  const isPro = prefs.plan === "pro";
  const creditsMax = isPro ? 1_000_000 : 2950;
  const memberSince = prefs.memberSince.includes("T") ? prefs.memberSince : `${prefs.memberSince}T12:00:00`;
  const creditsPct = Math.min(100, (prefs.credits / creditsMax) * 100);

  const formatPrice = (p: CurrencyPrice) => `${CURRENCY_SYMBOLS[currency]} ${p[currency]}`;

  const openPlan = (plan: PlanChoice) => {
    if (isPro) {
      toast("Ya tienes el plan Pro activo.", "info");
      return;
    }
    setCheckout({ kind: "plan", plan });
    setMethod(currency === "PEN" ? "yape_plin" : currency === "USD" ? "payoneer" : "mercadopago");
    setOpCode("");
    setPayerName(prefs.artistName || "");
  };

  const openPack = (pack: PackChoice) => {
    setCheckout({ kind: "pack", pack });
    setMethod(currency === "PEN" ? "yape_plin" : currency === "USD" ? "payoneer" : "mercadopago");
    setOpCode("");
    setPayerName(prefs.artistName || "");
  };

  const currentAmount = checkout
    ? checkout.kind === "plan"
      ? checkout.plan.prices[currency]
      : checkout.pack.prices[currency]
    : 0;

  const currentItemName = checkout
    ? checkout.kind === "plan"
      ? checkout.plan.name
      : checkout.pack.name
    : "";

  const handleCopyYapeNumber = async () => {
    await copyText("976624074");
    toast("Número 976624074 copiado al portapapeles.", "ok");
  };

  const handleYapeConfirm = () => {
    if (!checkout) return;
    if (!opCode.trim()) {
      toast("Por favor ingresa el código de operación del voucher de Yape/Plin.", "err");
      return;
    }

    setBusy(true);

    const whatsappMessage = encodeURIComponent(
      `Hola SoundLab AI, acabo de realizar mi pago con Yape/Plin al 976624074.\n` +
      `• Detalle: ${currentItemName}\n` +
      `• Monto: S/ ${checkout.kind === "plan" ? checkout.plan.prices.PEN : checkout.pack.prices.PEN}\n` +
      `• Código de Operación: ${opCode.trim()}\n` +
      `• Titular que transfiere: ${payerName.trim() || prefs.artistName}\n` +
      `• Usuario: ${prefs.email}\n` +
      `Adjunto la captura del comprobante para confirmación inmediata.`
    );

    // Abrir WhatsApp en pestaña nueva
    window.open(`https://wa.me/51976624074?text=${whatsappMessage}`, "_blank");

    // Registrar pedido en Supabase
    supabase.from("orders").insert({
      user_id: user?.id ?? null,
      item_type: checkout.kind,
      item_id: checkout.kind === "plan" ? checkout.plan.id : checkout.pack.id,
      item_name: currentItemName,
      amount: checkout.kind === "plan" ? checkout.plan.prices.PEN : checkout.pack.prices.PEN,
      currency: "PEN",
      payment_method: "yape_plin",
      reference_code: opCode.trim(),
      customer_name: payerName.trim() || prefs.artistName,
      customer_email: user?.email || prefs.email,
      status: "pending",
      metadata: checkout.kind === "plan" ? { credits: checkout.plan.credits } : { credits: checkout.pack.credits + checkout.pack.bonus },
    }).then(() => {
      if (isAdmin) fetchAdminOrders();
    });

    // Otorgar acceso / créditos provisionales
    window.setTimeout(() => {
      if (checkout.kind === "plan") {
        updatePrefs({ plan: "pro", credits: Math.max(prefs.credits, checkout.plan.credits) });
        toast(`¡Comprobante enviado! Plan Pro habilitado con ${formatNumber(checkout.plan.credits)} créditos.`, "ok");
      } else {
        const added = checkout.pack.credits + checkout.pack.bonus;
        addCredits(added, `Recarga Yape/Plin · ${checkout.pack.name} (Op: ${opCode})`);
        toast(`¡Comprobante enviado! +${formatNumber(added)} créditos acreditados.`, "ok");
      }
      setBusy(false);
      setCheckout(null);
    }, 600);
  };

  const PAYONEER_PAYMENT_URL = "https://link.payoneer.com/Token?t=A79AF4D8F8AB4D3B8B9F3D21E44D1768&src=pl";

  const handlePayoneerRedirect = () => {
    if (!checkout) return;
    toast("Abriendo pasarela de pago oficial de Payoneer...", "info");

    // Registrar pedido en Supabase
    supabase.from("orders").insert({
      user_id: user?.id ?? null,
      item_type: checkout.kind,
      item_id: checkout.kind === "plan" ? checkout.plan.id : checkout.pack.id,
      item_name: currentItemName,
      amount: checkout.kind === "plan" ? checkout.plan.prices.USD : checkout.pack.prices.USD,
      currency: "USD",
      payment_method: "payoneer",
      reference_code: "PAYONEER-" + Date.now().toString(36).toUpperCase(),
      customer_name: payerName.trim() || prefs.artistName,
      customer_email: user?.email || prefs.email,
      status: "pending",
      metadata: checkout.kind === "plan" ? { credits: checkout.plan.credits } : { credits: checkout.pack.credits + checkout.pack.bonus },
    }).then(() => {
      if (isAdmin) fetchAdminOrders();
    });

    window.open(PAYONEER_PAYMENT_URL, "_blank");
  };

  const handleMercadoPagoRedirect = () => {
    if (!checkout) return;
    const msg = encodeURIComponent(
      `Hola SoundLab AI, deseo pagar ${currentItemName} (S/ ${checkout.kind === "plan" ? checkout.plan.prices.PEN : checkout.pack.prices.PEN}) mediante Mercado Pago a la cuenta murbinasojo@gmail.com. Por favor facilítenme el link de pago para completar la transacción.`
    );
    window.open(`https://wa.me/51976624074?text=${msg}`, "_blank");
    toast("Abriendo chat para coordinar link de Mercado Pago...", "info");
  };

  return (
    <div className="page billing-page">
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            PASARELA Y FACTURACIÓN MULTIMODAL
          </div>
          <h1>Créditos y Suscripción</h1>
          <p className="page-head__sub">
            Planes profesionales y recargas instantáneas. Pagos con Yape/Plin en Perú, Mercado Pago en Latinoamérica y Payoneer en EE. UU./Global.
          </p>
        </div>
        <div className="page-head__actions">
          <div className="row-flex" role="group" aria-label="Seleccionar moneda" style={{ gap: 6 }}>
            <button
              className={`btn btn--sm ${currency === "PEN" ? "btn--primary" : "btn--ghost"}`}
              onClick={() => setCurrency("PEN")}
            >
              🇵🇪 Soles (S/)
            </button>
            <button
              className={`btn btn--sm ${currency === "USD" ? "btn--primary" : "btn--ghost"}`}
              onClick={() => setCurrency("USD")}
            >
              🇺🇸 USD ($)
            </button>
            <button
              className={`btn btn--sm ${currency === "EUR" ? "btn--primary" : "btn--ghost"}`}
              onClick={() => setCurrency("EUR")}
            >
              🇪🇺 EUR (€)
            </button>
          </div>
        </div>
      </div>

      <div className="pro-banner">
        <div className="pro-banner__icon">
          <ShieldCheck size={24} />
        </div>
        <div className="pro-banner__body">
          <div className="pro-banner__title">Pasarelas de Pago Seguras &amp; Activación Inmediata</div>
          <p className="pro-banner__text">
            Aceptamos <b>Yape y Plin (al 976624074)</b> para Perú sin comisión, <b>Mercado Pago</b> para tarjetas locales en Latinoamérica y <b>Payoneer</b> para clientes de EE. UU. e internacionales.
          </p>
        </div>
        <div className="row-flex" style={{ gap: 6 }}>
          <span className="chip chip--emerald">YAPE / PLIN 🇵🇪</span>
          <span className="chip chip--gold">MERCADO PAGO 🌎</span>
          <span className="chip">PAYONEER 🇺🇸</span>
        </div>
      </div>

      {!user && (
        <div className="card" style={{ background: "var(--surface)", border: "1px solid var(--primary)", padding: "16px 20px" }}>
          <div className="row-flex" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div className="row-flex" style={{ gap: 10 }}>
              <LogIn size={20} color="var(--primary)" />
              <div>
                <b style={{ display: "block" }}>¿Aún no has iniciado sesión?</b>
                <span className="mute" style={{ fontSize: 13 }}>
                  Regístrate o inicia sesión para que tus compras y créditos queden vinculados a tu cuenta de Supabase en la nube.
                </span>
              </div>
            </div>
            <button className="btn btn--gold btn--sm" onClick={() => openAuthModal("signin")}>
              Iniciar Sesión / Crear Cuenta
            </button>
          </div>
        </div>
      )}

      {isAdmin && (
        <section className="card" style={{ border: "1px solid var(--gold)", background: "rgba(242, 202, 80, 0.03)" }}>
          <div className="row-flex" style={{ justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div className="eyebrow" style={{ color: "var(--gold-ink)" }}>👑 GESTIÓN DE PAGOS · ADMINISTRADOR</div>
              <h2>Pedidos de Clientes (Supabase)</h2>
              <p className="mute" style={{ fontSize: 13, marginTop: 4 }}>
                Revisa los pedidos de Yape/Plin, Payoneer y Mercado Pago. Haz clic en &quot;Aprobar&quot; para acreditar saldo de inmediato.
              </p>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={fetchAdminOrders} disabled={loadingOrders}>
              <RefreshCw size={13} className={loadingOrders ? "composer-spin" : ""} /> Actualizar pedidos
            </button>
          </div>

          {adminOrders.length === 0 ? (
            <div className="mute" style={{ fontSize: 13, padding: "20px 0", textAlign: "center" }}>
              {loadingOrders ? "Cargando pedidos desde Supabase..." : "No hay pedidos registrados en Supabase aún."}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line-strong)", textAlign: "left" }}>
                    <th style={{ padding: "8px 6px" }}>Fecha</th>
                    <th style={{ padding: "8px 6px" }}>Cliente / Email</th>
                    <th style={{ padding: "8px 6px" }}>Ítem</th>
                    <th style={{ padding: "8px 6px" }}>Método</th>
                    <th style={{ padding: "8px 6px" }}>Monto</th>
                    <th style={{ padding: "8px 6px" }}>Código Voucher</th>
                    <th style={{ padding: "8px 6px" }}>Estado</th>
                    <th style={{ padding: "8px 6px", textAlign: "right" }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {adminOrders.map((ord) => (
                    <tr key={ord.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "10px 6px", whiteSpace: "nowrap" }}>
                        {new Date(ord.created_at).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td style={{ padding: "10px 6px" }}>
                        <b>{ord.customer_name || "Cliente"}</b>
                        <span className="mute" style={{ display: "block", fontSize: 11 }}>{ord.customer_email || "Sin email"}</span>
                      </td>
                      <td style={{ padding: "10px 6px" }}>{ord.item_name}</td>
                      <td style={{ padding: "10px 6px" }}>
                        <span className="chip" style={{ fontSize: 10 }}>{ord.payment_method.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: "10px 6px", fontWeight: 700 }}>
                        {ord.currency} {ord.amount}
                      </td>
                      <td style={{ padding: "10px 6px", fontFamily: "monospace" }}>
                        {ord.reference_code || "—"}
                      </td>
                      <td style={{ padding: "10px 6px" }}>
                        <span className={`chip ${ord.status === "approved" ? "chip--emerald" : "chip--gold"}`}>
                          {ord.status === "approved" ? "APROBADO" : "PENDIENTE"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 6px", textAlign: "right" }}>
                        {ord.status !== "approved" ? (
                          <button
                            className="btn btn--sm btn--primary"
                            onClick={() => handleApproveOrder(ord.id)}
                            style={{ fontSize: 12, padding: "4px 8px" }}
                          >
                            <CheckCircle2 size={13} /> Aprobar
                          </button>
                        ) : (
                          <span className="mute" style={{ fontSize: 11 }}>Completado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <div className="billing-overview">
        <div className="card billing-credits">
          <div className="billing-credits__top">
            <span className="card__label">CRÉDITOS DISPONIBLES</span>
            <span className="chip chip--emerald">
              <Coins size={11} /> {formatNumber(prefs.credits)}
            </span>
          </div>
          <div className="billing-credits__amount">
            <strong>{formatNumber(prefs.credits)}</strong>
            <span>/ {formatNumber(creditsMax)} créditos</span>
          </div>
          <div className="billing-credits__bar">
            <span style={{ width: `${creditsPct}%` }} />
          </div>
          <div className="billing-credits__notes">
            <p>
              {isPro
                ? "Créditos de tu cuenta Pro. Se descuentan automáticamente al analizar, texturizar, masterizar o certificar."
                : "Créditos disponibles en tu cuenta. Se descuentan al usar las herramientas; puedes recargar con cualquier método."}
            </p>
          </div>
          <div className="billing-credits__foot">
            <span className="mono">
              <Gift size={13} /> {isPro ? "PLAN PRO ACTIVO" : "PLAN FREE"}
            </span>
            <Link className="link link--mono" to="/profile">
              Miembro desde {formatDateLong(memberSince)}
            </Link>
          </div>
        </div>

        <div className="card billing-plan">
          <div className="card__label">ESTADO DE CUENTA</div>
          <div className={`billing-plan__badge ${isPro ? "is-pro" : ""}`}>
            {isPro ? <Crown size={18} /> : <Sparkles size={18} />}
            <span>{isPro ? "SOUNDLAB PRO" : "SOUNDLAB FREE"}</span>
          </div>
          <p className="billing-plan__text">
            {isPro
              ? "Cuenta Pro activa con escaneo profundo ilimitado, paquetes PRO FLOW de Suno y 1.000.000 de créditos."
              : "Cuenta esencial con acceso local a todas las herramientas y 1.850 créditos iniciales."}
          </p>
          <div className="billing-plan__rows">
            <div>
              <span>Estado</span>
              <b>{isPro ? "PRO ACTIVO" : "FREE"}</b>
            </div>
            <div>
              <span>Moneda preferida</span>
              <b>{currency} ({CURRENCY_SYMBOLS[currency]})</b>
            </div>
            <div>
              <span>Seguridad</span>
              <b>SSL 256-Bit Local</b>
            </div>
          </div>
          {!isPro && (
            <a className="btn btn--gold btn--block" href="#planes">
              <Crown size={14} /> Mejorar a Pro
            </a>
          )}
          {isPro && (
            <Link className="btn btn--ghost btn--block" to="/scan">
              <ScanLine size={14} /> Ir al Escáner Profundo
            </Link>
          )}
        </div>
      </div>

      <section id="planes" className="billing-section">
        <div className="section-title">
          <h2>Planes Pro</h2>
          <span className="chart-note">PRECIOS EN {currency} · PAGO ÚNICO O MENSUAL</span>
        </div>

        <div className="billing-plans">
          <article className={`plan-card billing-plan-card ${!isPro ? "billing-plan-card--current" : ""}`}>
            <div className="billing-plan-card__head">
              <div>
                <div className="eyebrow">PARA EMPEZAR</div>
                <h3>Plan Free</h3>
              </div>
              {!isPro && <span className="chip chip--emerald">PLAN ACTUAL</span>}
            </div>
            <div className="plan-card__price">
              {CURRENCY_SYMBOLS[currency]} 0 <small>/mes</small>
            </div>
            <p className="billing-plan-card__note">Sin tarjeta. Todo el procesamiento se realiza en tu navegador.</p>
            <ul>
              {FREE_FEATURES.map((f) => (
                <li key={f}>
                  <Check size={13} /> {f}
                </li>
              ))}
            </ul>
            <div className="billing-plan-card__foot">
              <span className="mono">1.850 CRÉDITOS INCLUIDOS</span>
              {isPro ? (
                <span className="chip">DISPONIBLE</span>
              ) : (
                <span className="chip chip--emerald">ACTIVO</span>
              )}
            </div>
          </article>

          {PLANS.map((plan) => {
            const featured = plan.id === "pro-annual";
            return (
              <article
                key={plan.id}
                className={`plan-card billing-plan-card ${featured ? "plan-card--featured" : ""} ${
                  isPro ? "billing-plan-card--current" : ""
                }`}
              >
                <div className="billing-plan-card__head">
                  <div>
                    <div className="eyebrow">{featured ? "MÁXIMO AHORRO" : "FLEXIBLE"}</div>
                    <h3>{plan.name}</h3>
                  </div>
                  <span className={`chip ${featured ? "chip--gold" : ""}`}>
                    {featured ? "AHORRA >45%" : "MENSUAL"}
                  </span>
                </div>
                <div className="plan-card__price">
                  {formatPrice(plan.prices)} <small>{plan.cadence}</small>
                </div>
                <p className="billing-plan-card__note">{plan.note}</p>
                <ul>
                  {PRO_FEATURES.map((f) => (
                    <li key={f}>
                      <Check size={13} /> {f}
                    </li>
                  ))}
                </ul>
                <div className="billing-plan-card__foot">
                  <span className="mono">YAPE · PLIN · MP · PAYONEER</span>
                  <button
                    className={`btn ${featured ? "btn--gold" : "btn--primary"} btn--block`}
                    onClick={() => openPlan(plan)}
                    disabled={isPro}
                  >
                    {isPro ? (
                      <>
                        <Lock size={13} /> Plan Pro activo
                      </>
                    ) : (
                      <>
                        <CreditCard size={13} /> Obtener {plan.name}
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="billing-section">
        <div className="section-title">
          <h2>Packs de Créditos</h2>
          <span className="chart-note">RECARGAS DIRECTAS SIN SUSCRIPCIÓN</span>
        </div>
        <div className="billing-packs">
          {PACKS.map((pack) => (
            <article className="card billing-pack" key={pack.id}>
              <div className="billing-pack__head">
                <span className="chip">{pack.name}</span>
                <Coins size={16} color="var(--gold-ink)" />
              </div>
              <div className="billing-pack__credits">
                +{formatNumber(pack.credits)}
                {pack.bonus > 0 && <small> +{formatNumber(pack.bonus)} bono</small>}
              </div>
              <p className="billing-pack__text">Se acreditan directamente a tu saldo local.</p>
              <button className="btn btn--ghost btn--block" onClick={() => openPack(pack)}>
                Comprar por {formatPrice(pack.prices)}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="billing-usage card">
        <div className="chart-head billing-usage__head">
          <div>
            <div className="chart-title">Coste transparente por herramienta</div>
            <p className="chart-note" style={{ marginTop: 6, letterSpacing: 0 }}>
              Cada acción descuenta créditos reales. Si un render o análisis falla, la app te reembolsa automáticamente.
            </p>
          </div>
          <span className="chip chip--gold">{formatNumber(prefs.credits)} DISPONIBLES</span>
        </div>
        <div className="billing-usage__grid">
          {[
            { icon: ScanLine, label: "Escáner de IA", cost: COST.scan, detail: "Muestra de 90 s o track completo" },
            { icon: Activity, label: "Análisis Forense", cost: COST.forensic, detail: "Comparación contra 12 géneros" },
            { icon: AudioWaveform, label: "Texturizador DSP", cost: COST.humanizer, detail: "Render DSP analógico en 24-bit" },
            { icon: Zap, label: "Coverizador", cost: COST.cover, detail: "Por minuto facturable · 3 estilos" },
            { icon: ShieldCheck, label: "Escudo Protector", cost: COST.shield, detail: "Certificado SHA-256 local" },
          ].map(({ icon: Icon, label, cost: itemCost, detail }) => (
            <div className="billing-usage__row" key={label}>
              <span className="billing-usage__icon">
                <Icon size={16} />
              </span>
              <span>
                <b>{label}</b>
                <small>{detail}</small>
              </span>
              <span className="billing-usage__cost mono">{itemCost} CR</span>
            </div>
          ))}
        </div>
      </section>

      <div className="billing-reasons">
        <div className="section-title">
          <h2>Compromiso y Garantía de SoundLab AI</h2>
          <span className="chart-note">URBINA ASESORÍA E INVERSIONES S.A.C.</span>
        </div>
        <div className="billing-reasons__grid">
          <div className="billing-reason">
            <ShieldCheck size={18} />
            <b>Privacidad Total</b>
            <p>Tu música nunca se sube a un servidor. Todo el procesamiento DSP y criptográfico corre en tu equipo.</p>
          </div>
          <div className="billing-reason">
            <Fingerprint size={18} />
            <b>Atención Directa por WhatsApp</b>
            <p>Soporte técnico y validación inmediata de pagos al número directo 976624074.</p>
          </div>
          <div className="billing-reason">
            <Coins size={18} />
            <b>Sin Comisiones Fantasma</b>
            <p>Pagas exactamente el monto mostrado en tu moneda local con confirmación transparente.</p>
          </div>
        </div>
      </div>

      {/* MODAL DE CHECKOUT MULTIMODAL */}
      <Modal
        open={Boolean(checkout)}
        onClose={() => (busy ? undefined : setCheckout(null))}
        eyebrow="PASARELA DE PAGO SEGURA"
        title={checkout ? `Adquirir ${currentItemName}` : "Confirmar"}
        footer={
          <div className="row-flex" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn--ghost" onClick={() => setCheckout(null)} disabled={busy}>
              Cerrar
            </button>
            {method === "yape_plin" && (
              <button className="btn btn--primary" onClick={handleYapeConfirm} disabled={busy}>
                {busy ? <span className="spinner" /> : <MessageCircle size={15} />} Confirmar y Enviar a WhatsApp
              </button>
            )}
            {method === "mercadopago" && (
              <button className="btn btn--gold" onClick={handleMercadoPagoRedirect} disabled={busy}>
                <MessageCircle size={14} /> Solicitar Link por WhatsApp (S/ {currentAmount})
              </button>
            )}
            {method === "payoneer" && (
              <button className="btn btn--primary" onClick={handlePayoneerRedirect} disabled={busy}>
                <ExternalLink size={14} /> Pagar con Payoneer ($ {checkout?.kind === "plan" ? checkout.plan.prices.USD : checkout?.pack.prices.USD} USD)
              </button>
            )}
          </div>
        }
      >
        {checkout && (
          <div className="stack-4">
            {/* SELECTOR DE MÉTODO DE PAGO */}
            <div className="tier-switch" role="tablist" aria-label="Método de pago">
              <button
                type="button"
                className={`tier-card ${method === "yape_plin" ? "is-active" : ""}`}
                onClick={() => setMethod("yape_plin")}
              >
                <Smartphone size={18} />
                <span className="tier-card__body">
                  <span className="tier-card__name">🇵🇪 Yape / Plin</span>
                  <span className="tier-card__desc">Perú · Al 976624074</span>
                </span>
                <span className="tier-card__meta mono">SIN COMISIÓN</span>
              </button>

              <button
                type="button"
                className={`tier-card ${method === "mercadopago" ? "is-active" : ""}`}
                onClick={() => setMethod("mercadopago")}
              >
                <CreditCard size={18} />
                <span className="tier-card__body">
                  <span className="tier-card__name">🌎 Mercado Pago</span>
                  <span className="tier-card__desc">Latam · Tarjetas locales</span>
                </span>
                <span className="tier-card__meta mono">DÉBITO / CRÉDITO</span>
              </button>

              <button
                type="button"
                className={`tier-card ${method === "payoneer" ? "is-active" : ""}`}
                onClick={() => setMethod("payoneer")}
              >
                <Globe2 size={18} />
                <span className="tier-card__body">
                  <span className="tier-card__name">🇺🇸 Payoneer</span>
                  <span className="tier-card__desc">Global &amp; USA · USD/EUR</span>
                </span>
                <span className="tier-card__meta mono">INTERNACIONAL</span>
              </button>
            </div>

            {/* VISTA 1: YAPE / PLIN */}
            {method === "yape_plin" && (
              <div className="card" style={{ background: "var(--surface-sunken)", padding: "18px", border: "1px solid var(--line-strong)" }}>
                <div className="row-flex" style={{ justifyContent: "space-between", marginBottom: 14 }}>
                  <div className="row-flex" style={{ gap: 8 }}>
                    <QrCode size={22} color="var(--emerald-ink)" />
                    <b style={{ fontSize: 15 }}>Pago Móvil Inmediato Yape / Plin (Perú)</b>
                  </div>
                  <span className="chip chip--emerald" style={{ fontSize: 13, padding: "4px 10px", fontWeight: 700 }}>
                    Monto a pagar: S/ {checkout.kind === "plan" ? checkout.plan.prices.PEN : checkout.pack.prices.PEN}
                  </span>
                </div>

                {/* Código QR Oficial de Pago */}
                <div style={{ display: "flex", gap: 18, alignItems: "center", background: "var(--surface)", padding: "16px", borderRadius: 12, marginBottom: 16, border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                  <div style={{ background: "#ffffff", padding: "8px", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 14px rgba(0,0,0,0.25)" }}>
                    <img
                      src="/images/payment-qr.png"
                      alt="Código QR Oficial Yape y Plin"
                      style={{ width: 130, height: 130, objectFit: "contain", display: "block" }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-emerald, #10b981)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                      📱 Escaneo Directo con Cámara Yape o Plin
                    </div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--color-text)" }}>
                      Abre tu aplicación de <b>Yape</b> o <b>Plin</b> en tu teléfono, selecciona <b>«Escanear QR»</b> y apunta al código en pantalla con el monto exacto.
                    </div>
                    <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 6, border: "1px solid var(--line)" }}>
                      <span className="mute" style={{ fontSize: 11.5, display: "block" }}>
                        Destinatario Oficial: <b>URBINA ASESORÍA E INVERSIONES S.A.C.</b> (RUC 20614532551)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="stack-2" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
                  <p style={{ margin: 0 }}>
                    <b>Paso 2:</b> Ingresa el código de operación o adjunta tu comprobante para activación instantánea:
                  </p>

                  <div className="form-grid">
                    <div className="field">
                      <label className="label" htmlFor="yape-code">CÓDIGO DE OPERACIÓN (Voucher)</label>
                      <input
                        id="yape-code"
                        className="input mono"
                        placeholder="Ej. 1849203"
                        value={opCode}
                        onChange={(e) => setOpCode(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label className="label" htmlFor="yape-name">NOMBRE DEL TITULAR / NÚMERO DE ENVÍO</label>
                      <input
                        id="yape-name"
                        className="input"
                        placeholder="Ej. Carlos Pérez o 987654321"
                        value={payerName}
                        onChange={(e) => setPayerName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="inline-note" style={{ marginTop: 8 }}>
                    <MessageCircle size={14} color="var(--emerald-ink)" />
                    <span>
                      Al hacer clic en &quot;Confirmar y Enviar a WhatsApp&quot;, se valida tu pedido y se abre el chat oficial con el comprobante pre-rellenado para acreditación prioritaria.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* VISTA 2: MERCADO PAGO */}
            {method === "mercadopago" && (
              <div className="card" style={{ background: "var(--surface-sunken)", padding: "16px", border: "1px solid var(--line-strong)" }}>
                <div className="row-flex" style={{ justifyContent: "space-between", marginBottom: 12 }}>
                  <div className="row-flex" style={{ gap: 8 }}>
                    <CreditCard size={20} color="var(--gold-ink)" />
                    <b>Mercado Pago (Latinoamérica)</b>
                  </div>
                  <span className="chip chip--gold">
                    Monto: S/ {checkout.kind === "plan" ? checkout.plan.prices.PEN : checkout.pack.prices.PEN}
                  </span>
                </div>
                <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>
                  Paga de forma 100% segura con tus tarjetas de débito o crédito locales, cuotas sin interés y saldo de Mercado Pago.
                </p>

                <div className="stack-2" style={{ marginTop: 12, background: "var(--surface)", padding: "12px 14px", borderRadius: 8 }}>
                  <span className="mute" style={{ fontSize: 11 }}>CUENTA RECEPTORA: murbinasojo@gmail.com</span>
                  <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                    Para procesar tu cobro con Mercado Pago, haz clic en <b>&quot;Solicitar Link por WhatsApp&quot;</b> y te facilitaremos el enlace de pago personalizado de inmediato.
                  </div>
                </div>

                <div className="inline-note" style={{ marginTop: 12 }}>
                  <ShieldCheck size={14} />
                  <span>Tu pago está protegido por el cifrado bancario de Mercado Pago. Activación en menos de 5 minutos.</span>
                </div>
              </div>
            )}

            {/* VISTA 3: PAYONEER */}
            {method === "payoneer" && (
              <div className="card" style={{ background: "var(--surface-sunken)", padding: "16px", border: "1px solid var(--line-strong)" }}>
                <div className="row-flex" style={{ justifyContent: "space-between", marginBottom: 12 }}>
                  <div className="row-flex" style={{ gap: 8 }}>
                    <Globe2 size={20} color="var(--primary)" />
                    <b>Payoneer Global Payment</b>
                  </div>
                  <span className="chip">
                    Monto: $ {checkout.kind === "plan" ? checkout.plan.prices.USD : checkout.pack.prices.USD} USD
                  </span>
                </div>
                <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>
                  Acepta tarjetas de crédito y débito internacionales (Visa, Mastercard, Amex) y saldo de cuenta Payoneer en dólares americanos (USD).
                </p>

                <div className="row-flex" style={{ marginTop: 14, gap: 16, alignItems: "center", background: "var(--surface)", padding: "12px", borderRadius: 8 }}>
                  <img
                    src="/images/payment-qr.png"
                    alt="Código QR de Pago Payoneer"
                    style={{ width: 105, height: 105, borderRadius: 6, background: "#fff", padding: 4, flexShrink: 0 }}
                  />
                  <div className="stack-1" style={{ flex: 1, fontSize: 13 }}>
                    <span className="mute" style={{ fontSize: 11 }}>ENLACE OFICIAL &amp; QR DE PAGO</span>
                    <strong style={{ display: "block", marginBottom: 4 }}>Escanea el código QR con tu móvil o abre el link directo:</strong>
                    <button
                      type="button"
                      className="btn btn--sm btn--primary"
                      style={{ alignSelf: "flex-start" }}
                      onClick={handlePayoneerRedirect}
                    >
                      <ExternalLink size={13} /> Ir a Pasarela Payoneer
                    </button>
                  </div>
                </div>

                <div className="inline-note" style={{ marginTop: 12 }}>
                  <Globe2 size={14} />
                  <span>Titular oficial: URBINA ASESORÍA E INVERSIONES S.A.C. · Enlace oficial cifrado con SSL por Payoneer.</span>
                </div>
              </div>
            )}

            <div className="checkout-summary">
              <div>
                <span>Producto seleccionado</span>
                <b>{currentItemName}</b>
              </div>
              <div>
                <span>Moneda de cobro</span>
                <b>{currency} ({CURRENCY_SYMBOLS[currency]})</b>
              </div>
              <div>
                <span>Beneficio</span>
                <b>
                  {checkout.kind === "plan"
                    ? "Acceso Pro + 1M créditos"
                    : `+${formatNumber(checkout.pack.credits + checkout.pack.bonus)} créditos`}
                </b>
              </div>
              <div>
                <span>Total a pagar</span>
                <b className="emerald" style={{ fontSize: 16 }}>
                  {CURRENCY_SYMBOLS[currency]} {currentAmount}
                </b>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
