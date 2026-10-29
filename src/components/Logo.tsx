/**
 * Marca gráfica original de SoundLab AI.
 * Diseño propio: cinco barras de forma de onda ascendentes inscritas en un arco.
 * Propiedad de URBINA ASESORÍA E INVERSIONES S.A.C.
 */
import { useId } from "react";
import { BRAND } from "../lib/brand";

export function Logo({ size = 44, glow = true }: { size?: number; glow?: boolean }) {
  const raw = useId().replace(/[:]/g, "");
  const gold = `g-${raw}`;
  const soft = `s-${raw}`;
  const blur = `b-${raw}`;

  // Barras: x, y, alto (viewBox 48x48, centrado)
  const bars = [
    { x: 13.5, y: 27, h: 10 },
    { x: 19.5, y: 21, h: 16 },
    { x: 25.5, y: 15, h: 22 },
    { x: 31.5, y: 20, h: 17 },
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={BRAND.full}
      className={glow ? "logo" : undefined}
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe9a3" />
          <stop offset="0.45" stopColor="#f2ca50" />
          <stop offset="1" stopColor="#c08a12" />
        </linearGradient>
        <radialGradient id={soft} cx="0.5" cy="0.45" r="0.62">
          <stop offset="0" stopColor="#00ce59" stopOpacity="0.32" />
          <stop offset="1" stopColor="#00ce59" stopOpacity="0" />
        </radialGradient>
        <filter id={blur} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      {glow && <circle cx="24" cy="24" r="20" fill={`url(#${soft})`} filter={`url(#${blur})`} />}

      {/* anillo exterior abierto */}
      <circle
        cx="24"
        cy="24"
        r="19"
        fill="none"
        stroke={`url(#${gold})`}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeDasharray="88 32"
        transform="rotate(-118 24 24)"
        opacity="0.85"
      />
      {/* anillo interior tenue */}
      <circle cx="24" cy="24" r="14.6" fill="none" stroke="#f2ca50" strokeWidth="0.55" opacity="0.2" />

      {/* forma de onda */}
      <g stroke={`url(#${gold})`} strokeWidth="2.6" strokeLinecap="round">
        {bars.map((b) => (
          <line key={b.x} x1={b.x} y1={b.y} x2={b.x} y2={b.y + b.h} />
        ))}
      </g>

      {/* punto de referencia */}
      <circle cx="37" cy="24" r="1.6" fill="#00ce59" />
    </svg>
  );
}
