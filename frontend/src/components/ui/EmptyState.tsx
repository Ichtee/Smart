import Link from 'next/link';

interface Props {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  /** call to action: a link when `href` is given, otherwise a button */
  action?: { label: string; href?: string; onClick?: () => void };
  className?: string;
}

const CTA = 'mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:opacity-90 cursor-pointer';

/** "Nothing here yet" with the next step, instead of a bare empty box. */
export default function EmptyState({ icon, title, hint, action, className = '' }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-10 text-center ${className}`}>
      {icon && <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</div>}
      <p className="text-lg font-bold">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{hint}</p>}
      {action && (action.href
        ? <Link href={action.href} className={CTA}>{action.label}</Link>
        : <button type="button" onClick={action.onClick} className={CTA}>{action.label}</button>)}
    </div>
  );
}
