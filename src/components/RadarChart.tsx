import { useId } from "react";

export interface RadarAxis {
  label: string;
  value: number; // 0-100
}

export function RadarChart({ axes, size = 320 }: { axes: RadarAxis[]; size?: number }) {
  const id = useId().replace(/[:]/g, "");
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.31;
  const labelR = radius + size * 0.115;
  const n = axes.length;
  const angle = (i: number) => (-Math.PI / 2) + (i * 2 * Math.PI) / n;
  const point = (i: number, r: number) => [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r] as const;
  const polygon = (factor: number) =>
    axes.map((_, i) => point(i, radius * factor).join(",")).join(" ");
  const values = axes.map((a, i) => point(i, radius * Math.max(0, Math.min(1, a.value / 100))).join(",")).join(" ");

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Radar: ${axes.map((a) => `${a.label} ${Math.round(a.value)}`).join(", ")}`}
      className="radar"
    >
      <defs>
        <linearGradient id={`radar-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00ce59" stopOpacity="0.5" />
          <stop offset="1" stopColor="#f2ca50" stopOpacity="0.22" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon
          key={f}
          points={polygon(f)}
          fill="none"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth={f === 1 ? 1.2 : 0.7}
        />
      ))}
      {axes.map((a, i) => {
        const [x, y] = point(i, radius);
        return <line key={a.label} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" />;
      })}
      <polygon points={values} fill={`url(#radar-${id})`} stroke="#00ce59" strokeWidth="1.6" strokeLinejoin="round" />
      {axes.map((a, i) => {
        const [x, y] = point(i, radius * Math.max(0.02, Math.min(1, a.value / 100)));
        return <circle key={`d-${a.label}`} cx={x} cy={y} r="2.6" fill="#00ce59" stroke="#04140a" strokeWidth="1" />;
      })}
      {axes.map((a, i) => {
        const [x, y] = point(i, labelR);
        const cos = Math.cos(angle(i));
        const anchor = Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end";
        return (
          <g key={`l-${a.label}`}>
            <text
              x={x}
              y={y - 2}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={size * 0.03}
              fontFamily="var(--font-mono)"
              letterSpacing="1.4"
              fill="var(--text-mute)"
            >
              {a.label.toUpperCase()}
            </text>
            <text
              x={x}
              y={y + size * 0.042}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={size * 0.032}
              fontFamily="var(--font-mono)"
              fill="var(--text-mid)"
            >
              {Math.round(a.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
