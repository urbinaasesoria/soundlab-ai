import { NavLink } from "react-router-dom";
import {
  Activity,
  AudioWaveform,
  ChevronDown,
  Coins,
  CreditCard,
  Disc3,
  FolderOpen,
  Home,
  LifeBuoy,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ScanLine,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Ear,
  UserRound,
  Wand2,
  Zap,
} from "lucide-react";
import { Logo } from "./Logo";
import { BRAND } from "../lib/brand";
import { useStudio } from "../lib/storage/store";
import { formatNumber } from "../lib/utils";

interface SidebarProps {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onCollapse: () => void;
  onLogout: () => void;
}

const TOOL_LINKS = [
  { to: "/suno", label: "Prompts Suno", icon: Sparkles },
  { to: "/compositor", label: "Compositor Suno", icon: Wand2 },
  { to: "/comparador", label: "Prueba a ciegas", icon: Ear },
  { to: "/scan", label: "Escanear", icon: ScanLine },
  { to: "/humanizer", label: "Texturizador DSP", icon: AudioWaveform, badge: "DSP 24B", locked: false },
  { to: "/forensic", label: "Análisis Forense", icon: Activity },
  { to: "/mix", label: "Mixing IA", icon: SlidersHorizontal, badge: "PRÓXIMAMENTE", locked: true },
  { to: "/master", label: "Mastering", icon: Disc3, badge: "PRÓXIMAMENTE", locked: true },
  { to: "/shield", label: "Escudo Protector", icon: ShieldCheck },
  { to: "/coverizador", label: "Coverizador", icon: Zap, badge: "BETA", badgeClass: "badge--beta" },
];

export function Sidebar({ open, collapsed, onClose, onCollapse, onLogout }: SidebarProps) {
  const { prefs, toast } = useStudio();
  const creditsMax = prefs.plan === "pro" ? 1_000_000 : 2950;
  const pct = Math.min(100, (prefs.credits / creditsMax) * 100);

  return (
    <aside className={`sidebar ${open ? "is-open" : ""} ${collapsed ? "is-collapsed" : ""}`} aria-label="Navegación principal">
      <div className="sidebar__brand">
        <NavLink to="/" className="brand" onClick={onClose} aria-label={`${BRAND.full}, inicio`}>
          <span className="brand__mark">
            <Logo size={collapsed ? 36 : 44} />
          </span>
          <span className="brand__text">
            <span className="brand__word">{BRAND.wordmark}</span>
            <span className="brand__sub">{BRAND.sub}</span>
          </span>
        </NavLink>
        <button className="sidebar__collapse" onClick={onCollapse} aria-label={collapsed ? "Expandir menú" : "Contraer menú"}>
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <div className="sidebar__scroll">
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? "nav-item--active" : ""}`} onClick={onClose}>
            <Home size={18} />
            <span className="nav-item__label">Inicio</span>
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => `nav-item ${isActive ? "nav-item--active" : ""}`} onClick={onClose}>
            <FolderOpen size={18} />
            <span className="nav-item__label">Mis Proyectos</span>
          </NavLink>
        </nav>

        <div className="nav-section">
          <span className="nav-section__label">HERRAMIENTAS</span>
          <span className="nav-section__count">{String(TOOL_LINKS.length).padStart(2, "0")}</span>
        </div>

        <nav className="nav">
          {TOOL_LINKS.map(({ to, label, icon: Icon, badge, badgeClass, locked }) =>
            locked ? (
              <button
                key={to}
                className="nav-item nav-item--locked"
                title={`${label} · próximamente`}
                onClick={() => toast(`${label} estará disponible en una próxima versión.`, "info")}
              >
                <Icon size={18} />
                <span className="nav-item__label">{label}</span>
                {badge && !collapsed && <span className={`badge ${badgeClass ?? ""}`}>{badge}</span>}
              </button>
            ) : (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-item ${isActive ? "nav-item--active" : ""}`}
                onClick={onClose}
                title={collapsed ? label : undefined}
              >
                <Icon size={18} />
                <span className="nav-item__label">{label}</span>
                {badge && !collapsed && <span className={`badge ${badgeClass ?? ""}`}>{badge}</span>}
              </NavLink>
            ),
          )}
        </nav>

        <NavLink to="/billing" className="credits-box" onClick={onClose} aria-label="Créditos y suscripción">
          <span className="credits-box__row">
            <Coins size={14} color="var(--gold-ink)" />
            <span className="credits-box__value">{formatNumber(prefs.credits)}</span>
            <span className="credits-box__chip">{prefs.plan === "pro" ? "PRO" : "FREE"}</span>
            <ChevronDown size={14} className="credits-box__chev" />
          </span>
          <span className="credits-box__meter">
            <span className="credits-box__fill" style={{ width: `${pct}%` }} />
          </span>
        </NavLink>
      </div>

      <div className="sidebar__footer">
        <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? "nav-item--active" : ""}`} onClick={onClose}>
          <UserRound size={18} />
          <span className="nav-item__label">Mi Perfil</span>
        </NavLink>
        <NavLink to="/billing" className={({ isActive }) => `nav-item ${isActive ? "nav-item--active" : ""}`} onClick={onClose}>
          <CreditCard size={18} />
          <span className="nav-item__label">Mi Suscripción</span>
        </NavLink>
        <button className="nav-item" onClick={() => toast(`Soporte de ${BRAND.full}: escribe a ${BRAND.email}. Todo el procesado ocurre en tu equipo.`, "info")}>
          <LifeBuoy size={18} />
          <span className="nav-item__label">Soporte</span>
          <span className="nav-item__pro">PRO</span>
        </button>
        <button className="nav-item" onClick={onLogout}>
          <LogOut size={18} />
          <span className="nav-item__label">Cerrar Sesión</span>
        </button>
        <div className="sidebar__legal">{BRAND.copyrightShort}</div>
      </div>
    </aside>
  );
}
