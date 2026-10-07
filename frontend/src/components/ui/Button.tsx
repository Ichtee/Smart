import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20',
  secondary: 'bg-surface-elevated text-foreground border border-border hover:bg-muted',
  ghost: 'text-muted-foreground hover:text-foreground hover:bg-surface-elevated',
  danger: 'bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25',
};
const SIZE: Record<Size, string> = {
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-14 px-6 text-base',
};

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

/** Touch-friendly button (44px minimum, 56px for `lg`). `loading` disables it and shows a spinner. */
export default function Button({ variant = 'primary', size = 'md', loading = false, disabled, className = '', children, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
