import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  AudioWaveform,
  BadgeCheck,
  Check,
  Coins,
  CreditCard,
  Crown,
  Fingerprint,
  Gift,
  Info,
  Lock,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Modal } from "../components/Modal";
import { useStudio } from "../lib/storage/store";
import { COST } from "../lib/storage/types";
import { formatDateLong, formatNumber } from "../lib/utils";

type PlanChoice = {
  id: "pro-monthly" | "pro-annual";
  name: string;
  price: string;
  cadence: string;
  credits: number;
  note: string;
};

type PackChoice = {
  id: string;
  name: string;
  credits: number;
  bonus: number;
  price: number;
};

type Checkout =
  | { kind: "plan"; plan: PlanChoice }
  | { kind: "pack"; pack: PackChoice };

const PLANS: PlanChoice[] = [
  {
    id: "pro-monthly",
    name: "Pro Mensual",
    price: "19 €",
    cadence: "/mes",
    credits: 1_000_000,
    note: "Facturación mensual simulada. Sin permanencia.",
  },
  {
    id: "pro-annual",
    name: "Pro Anual",
    price: "10 €",
    cadence: "/mes",
    credits: 1_000_000,
    note: "120 € al año · equivalente a 10 €/mes. Mejor precio simulado.",
  },
];

const PACKS: PackChoice[] = [
  { id: "starter", name: "Starter", credits: 500, bonus: 50, price: 8 },
  { id: "studio", name: "Studio", credits: 1_500, bonus: 200, price: 20 },
  { id: "pro", name: "Pro Pack", credits: 5_000, bonus: 800, price: 49 },
  { id: "label", name: "Label", credits: 15_000, bonus: 3_000, price: 99 },
];

const FREE_FEATURES = [
  "Escaneo rápido de una muestra de 90 s",
  "Análisis forense contra 12 géneros",
  "Humanizador DSP local · WAV 24-bit",
  "Escudo Protector con SHA-256 local",
  "Coverizador con 3 reinterpretaciones",
];

const PRO_FEATURES = [
  "Escaneo profundo del track completo",
  "1.000.000 de créditos al activar",
  "Catálogo completo de Prompts Suno",
  "Sellos y renders sin límites de plan",
  "Acceso anticipado a nuevos módulos",
];

export function BillingPage() {
  const { prefs, addCredits, updatePrefs, toast } = useStudio();
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [busy, setBusy] = useState(false);

  const isPro = prefs.plan === "pro";
  const creditsMax = isPro ? 1_000_000 : 2950;
  const memberSince = prefs.memberSince.includes("T") ? prefs.memberSince : `${prefs.memberSince}T12:00:00`;
  const creditsPct = Math.min(100, (prefs.credits / creditsMax) * 100);

  const openPlan = (plan: PlanChoice) => {
    if (isPro) {
      toast("Ya tienes el plan Pro activo.", "info");
      return;
    }
    setCheckout({ kind: "plan", plan });
  };

  const openPack = (pack: PackChoice) => setCheckout({ kind: "pack", pack });

  const confirmCheckout = () => {
    if (!checkout) return;
    setBusy(true);
    window.setTimeout(() => {
      if (checkout.kind === "plan") {
        updatePrefs({ plan: "pro", credits: Math.max(prefs.credits, checkout.plan.credits) });
        toast(`Plan Pro activado (simulación) · ${formatNumber(checkout.plan.credits)} créditos disponibles.`, "ok");
      } else {
        addCredits(checkout.pack.credits + checkout.pack.bonus, `Compra simulada · ${checkout.pack.name}`);
      }
      setBusy(false);
      setCheckout(null);
    }, 720);
  };

  return (
    <div className="page billing-page">
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            CRÉDITOS Y SUSCRIPCIÓN
          </div>
          <h1>Créditos y Suscripción</h1>
          <p className="page-head__sub">Administra tu plan y tus créditos disponibles.</p>
        </div>
        <div className="page-head__actions">
          <Link className="btn btn--ghost" to="/profile">
            <BadgeCheck size={15} /> Mi perfil
          </Link>
        </div>
      </div>

      <div className="simulation-flag">
        <Info size={15} />
        <div>
          <b>Pago simulado.</b> Este entorno de demostración no procesa tarjetas ni cobra dinero. Activar Pro o comprar créditos solo
          cambia el estado local de tu navegador para que puedas probar la interfaz.
        </div>
      </div>

      {isPro ? (
        <div className="pro-banner">
          <div className="pro-banner__icon">
            <Crown size={22} />
          </div>
          <div className="pro-banner__body">
            <div className="pro-banner__title">Plan Pro activo · simulación local</div>
            <p className="pro-banner__text">
              Escaneo profundo y catálogo completo desbloqueados. No hay una suscripción real ni renovación automática.
            </p>
          </div>
          <span className="chip chip--gold">PRO</span>
        </div>
      ) : (
        <div className="pro-banner">
          <div className="pro-banner__icon">
            <Crown size={22} />
          </div>
          <div className="pro-banner__body">
            <div className="pro-banner__title">Desbloquea todo el poder de URBINA Studio</div>
            <p className="pro-banner__text">
              Pásate a Pro y accede al escaneo profundo, más créditos y las funciones premium del producto.
            </p>
          </div>
          <a className="btn btn--gold" href="#planes">
            Ver planes Pro <ArrowRight size={14} />
          </a>
        </div>
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
                ? "Créditos del plan Pro. Se descuentan al analizar, humanizar, cubrir o certificar."
                : "Créditos de bienvenida. Se descuentan al usar las herramientas; puedes recargar cuando quieras."}
            </p>
            <p className="mute">
              En la app original hay un bono diario. Aquí no simulamos renovaciones: el saldo solo cambia cuando tú lo
              usas o lo recargas.
            </p>
          </div>
          <div className="billing-credits__foot">
            <span className="mono">
              <Gift size={13} /> {isPro ? "PLAN PRO" : "PLAN FREE"}
            </span>
            <Link className="link link--mono" to="/profile">
              Miembro desde {formatDateLong(memberSince)}
            </Link>
          </div>
        </div>

        <div className="card billing-plan">
          <div className="card__label">PLAN ACTUAL</div>
          <div className={`billing-plan__badge ${isPro ? "is-pro" : ""}`}>
            {isPro ? <Crown size={18} /> : <Sparkles size={18} />}
            <span>{isPro ? "PRO LOCAL" : "PLAN FREE"}</span>
          </div>
          <p className="billing-plan__text">
            {isPro
              ? "Plan Pro simulado. Tienes acceso al escaneo profundo y a todas las herramientas del producto."
              : "Sin tarjeta. Acceso a las herramientas esenciales y a 1.850 créditos de bienvenida."}
          </p>
          <div className="billing-plan__rows">
            <div>
              <span>Miembro desde</span>
              <b>{formatDateLong(memberSince)}</b>
            </div>
            <div>
              <span>Renovación</span>
              <b>{isPro ? "Simulada · sin cargo" : "No aplica"}</b>
            </div>
            <div>
              <span>Método de pago</span>
              <b>Ninguno</b>
            </div>
          </div>
          {!isPro && (
            <a className="btn btn--gold btn--block" href="#planes">
              <Crown size={14} /> Ver planes Pro
            </a>
          )}
          {isPro && (
            <Link className="btn btn--ghost btn--block" to="/scan">
              <ScanLine size={14} /> Usar escaneo profundo
            </Link>
          )}
        </div>
      </div>

      <section id="planes" className="billing-section">
        <div className="section-title">
          <h2>Planes</h2>
          <span className="chart-note">PRECIOS SIMULADOS · SIN COBRO REAL</span>
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
              0 € <small>/mes</small>
            </div>
            <p className="billing-plan-card__note">Sin tarjeta. Todo se procesa en tu navegador.</p>
            <ul>
              {FREE_FEATURES.map((f) => (
                <li key={f}>
                  <Check size={13} /> {f}
                </li>
              ))}
            </ul>
            <div className="billing-plan-card__foot">
              <span className="mono">1.850 CRÉDITOS DE BIENVENIDA</span>
              {isPro ? (
                <span className="chip">DISPONIBLE AL VOLVER A FREE</span>
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
                    <div className="eyebrow">{featured ? "MEJOR VALOR" : "SIN PERMANENCIA"}</div>
                    <h3>{plan.name}</h3>
                  </div>
                  <span className={`chip ${featured ? "chip--gold" : ""}`}>
                    {featured ? "−76%" : "−60%"}
                  </span>
                </div>
                <div className="plan-card__price">
                  {plan.price} <small>{plan.cadence}</small>
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
                  <span className="mono">PAGO SIMULADO</span>
                  <button
                    className={`btn ${featured ? "btn--gold" : "btn--primary"} btn--block`}
                    onClick={() => openPlan(plan)}
                    disabled={isPro}
                  >
                    {isPro ? (
                      <>
                        <Lock size={13} /> Ya estás en Pro
                      </>
                    ) : (
                      <>
                        <CreditCard size={13} /> Activar {plan.name}
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
          <h2>Recargar créditos</h2>
          <span className="chart-note">PACKS SIMULADOS · SE AÑADEN AL SALDO</span>
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
              <p className="billing-pack__text">Se suman a tu saldo local al instante.</p>
              <button className="btn btn--ghost btn--block" onClick={() => openPack(pack)}>
                {pack.price} € · simulado
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="billing-usage card">
        <div className="chart-head billing-usage__head">
          <div>
            <div className="chart-title">Coste por herramienta</div>
            <p className="chart-note" style={{ marginTop: 6, letterSpacing: 0 }}>
              Cada acción descuenta créditos reales del saldo local. Si un proceso falla, la app devuelve el coste.
            </p>
          </div>
          <span className="chip chip--gold">{formatNumber(prefs.credits)} DISPONIBLES</span>
        </div>
        <div className="billing-usage__grid">
          {[
            { icon: ScanLine, label: "Escáner de IA", cost: COST.scan, detail: "Muestra de 90 s o track completo" },
            { icon: Activity, label: "Análisis Forense", cost: COST.forensic, detail: "Comparación contra 12 géneros" },
            { icon: AudioWaveform, label: "Humanizador", cost: COST.humanizer, detail: "Render DSP + WAV 24-bit" },
            { icon: Zap, label: "Coverizador", cost: COST.cover, detail: "Por minuto facturable · 3 estilos" },
            { icon: ShieldCheck, label: "Escudo Protector", cost: COST.shield, detail: "Certificado SHA-256 local" },
          ].map(({ icon: Icon, label, cost, detail }) => (
            <div className="billing-usage__row" key={label}>
              <span className="billing-usage__icon">
                <Icon size={16} />
              </span>
              <span>
                <b>{label}</b>
                <small>{detail}</small>
              </span>
              <span className="billing-usage__cost mono">{cost} CR</span>
            </div>
          ))}
        </div>
        <div className="inline-note">
          <Lock size={14} />
          <span>
            Mixing IA y Mastering IA siguen bloqueados: no hay un motor real que pueda mezclar o masterizar aquí, y no
            vamos a inventar resultados.
          </span>
        </div>
      </section>

      <div className="billing-reasons">
        <div className="section-title">
          <h2>Por qué esta suscripción es distinta</h2>
          <span className="chart-note">TRANSPARENCIA LOCAL</span>
        </div>
        <div className="billing-reasons__grid">
          <div className="billing-reason">
            <ShieldCheck size={18} />
            <b>Tu audio no viaja</b>
            <p>Todo el análisis y los renders ocurren en tu navegador. No hay servidor ni clave de API.</p>
          </div>
          <div className="billing-reason">
            <Fingerprint size={18} />
            <b>Resultados explicables</b>
            <p>El índice de IA muestra sus señales y pesos. No es una caja negra ni ACRCloud.</p>
          </div>
          <div className="billing-reason">
            <Coins size={18} />
            <b>Sin cobros ocultos</b>
            <p>Los planes de este entorno de demostración son una simulación. No se solicita tarjeta ni se envía ningún pago.</p>
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(checkout)}
        onClose={() => (busy ? undefined : setCheckout(null))}
        eyebrow="CHECKOUT SIMULADO"
        title={checkout?.kind === "plan" ? `Activar ${checkout.plan.name}` : checkout ? `Comprar ${checkout.pack.name}` : "Confirmar"}
        footer={
          <div className="row-flex" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn--ghost" onClick={() => setCheckout(null)} disabled={busy}>
              Cancelar
            </button>
            <button className="btn btn--primary" onClick={confirmCheckout} disabled={busy}>
              {busy ? <span className="spinner" /> : <Check size={14} />} Confirmar simulación
            </button>
          </div>
        }
      >
        {checkout?.kind === "plan" && (
          <div className="stack-4">
            <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
              Se activará el plan <b>{checkout.plan.name}</b> y se añadirán{" "}
              <b>{formatNumber(checkout.plan.credits)} créditos</b> a tu saldo local. No se procesará ningún pago.
            </p>
            <div className="checkout-summary">
              <div>
                <span>Plan</span>
                <b>{checkout.plan.name}</b>
              </div>
              <div>
                <span>Precio mostrado</span>
                <b>
                  {checkout.plan.price}
                  {checkout.plan.cadence}
                </b>
              </div>
              <div>
                <span>Créditos</span>
                <b>{formatNumber(checkout.plan.credits)}</b>
              </div>
              <div>
                <span>Cargo real</span>
                <b className="emerald">0,00 €</b>
              </div>
            </div>
            <div className="inline-note">
              <Info size={14} />
              <span>Al confirmar, el plan Pro quedará guardado en este navegador hasta que reinicies los datos.</span>
            </div>
          </div>
        )}
        {checkout?.kind === "pack" && (
          <div className="stack-4">
            <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
              Se añadirán{" "}
              <b>
                {formatNumber(checkout.pack.credits + checkout.pack.bonus)} créditos
              </b>{" "}
              ({formatNumber(checkout.pack.credits)} + {formatNumber(checkout.pack.bonus)} de bono) a tu saldo local.
            </p>
            <div className="checkout-summary">
              <div>
                <span>Pack</span>
                <b>{checkout.pack.name}</b>
              </div>
              <div>
                <span>Precio mostrado</span>
                <b>{checkout.pack.price} €</b>
              </div>
              <div>
                <span>Cargo real</span>
                <b className="emerald">0,00 €</b>
              </div>
            </div>
            <div className="inline-note">
              <Info size={14} />
              <span>Esta compra es una simulación de interfaz. No se solicita ni se almacena ningún dato de pago.</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
