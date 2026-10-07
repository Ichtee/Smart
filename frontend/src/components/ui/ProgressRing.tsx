interface Props {
  /** current amount */
  value: number;
  /** target amount; the ring is full at `value >= max` */
  max: number;
  size?: number;
  stroke?: number;
  /** Tailwind text color for the arc, e.g. "text-primary" or "text-protein" */
  colorClass?: string;
  label?: string;
  children?: React.ReactNode;
  className?: string;
}

/** Circular progress (calories, protein, weekly goal). Over-target is clamped to a full ring. */
export default function ProgressRing({ value, max, size = 120, stroke = 10, colorClass = 'text-primary', label, children, className = '' }: Props) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(Math.min(value, max))}
      aria-label={label}
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted/60" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          className={`${colorClass} transition-[stroke-dashoffset] duration-700`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
