import { useId } from "react";
import { Check } from "lucide-react";

export type RingTone = "emerald" | "gold" | "danger" | "neutral";

const TONE_COLORS: Record<RingTone, [string, string]> = {
  emerald: ["#00ce59", "#8bf06a"],
  gold: ["#f2ca50", "#f9e08a"],
  danger: ["#f36356", "#ff9a6b"],
  neutral: ["#808279", "#c9c7ba"],
};

interface ScoreRingProps {
  value: number;
  label: string;
  caption?: string;
  display?: string;
  size?: number;
  tone?: RingTone;
  variant?: "value" | "check";
  small?: boolean;
}

export function ScoreRing({
  value,
  label,
  caption,
  display,
  size = 156,
  tone = "emerald",
  variant = "value",
  small,
}: ScoreRingProps) {
  const id = useId().replace(/[:]/g, "");
  const stroke = small ? 5 : 7;
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c * (1 - pct / 100);
  const [from, to] = TONE_COLORS[tone];

  return (
    <div className={`score-ring ${small ? "score-ring--sm" : ""}`} style={{ width: size }}>
      <div className="score-ring__visual" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <defs>
            <linearGradient id={`ring-${id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={from} />
              <stop offset="1" stopColor={to} />
            </linearGradient>
            <filter id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-strong)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#ring-${id})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={variant === "check" ? 0 : offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            filter={`url(#glow-${id})`}
            style={{ transition: "stroke-dashoffset 1200ms cubic-bezier(0.22,1,0.36,1)" }}
          />
        </svg>
        <div className="score-ring__center">
          {variant === "check" ? (
            <Check size={small ? 20 : 34} strokeWidth={2.2} color={from} />
          ) : (
            <>
              <span className="score-ring__value" style={{ fontSize: small ? 20 : size * 0.23 }}>
                {display ?? `${Math.round(pct)}%`}
              </span>
              <span className="score-ring__unit">{small ? "" : "IA"}</span>
            </>
          )}
        </div>
      </div>
      <div className="score-ring__label">{label}</div>
      {caption && <div className="score-ring__caption">{caption}</div>}
    </div>
  );
}
