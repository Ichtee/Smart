type Tone = 'default' | 'primary' | 'success' | 'warning' | 'pr' | 'destructive';

const TONE: Record<Tone, string> = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  pr: 'text-pr',
  destructive: 'text-destructive',
};

interface Props {
  label: string;
  value: React.ReactNode;
  unit?: string;
  icon?: React.ReactNode;
  hint?: string;
  tone?: Tone;
  className?: string;
}

/** A big number with a small label: kg, kcal, streak... The value uses the condensed display face. */
export default function StatTile({ label, value, unit, icon, hint, tone = 'default', className = '' }: Props) {
  return (
    <div className={`rounded-2xl border border-border bg-inset p-4 ${className}`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        {icon && <span className={`shrink-0 ${TONE[tone === 'default' ? 'primary' : tone]}`}>{icon}</span>}
        <span>{label}</span>
      </div>
      <p className={`mt-1 font-display text-4xl font-bold leading-none ${TONE[tone]}`}>
        {value}
        {unit && <span className="ml-1 text-base font-semibold text-muted-foreground">{unit}</span>}
      </p>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
