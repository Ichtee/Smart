/** Standard surface: rounded card with a hairline border. `tone="highlight"` adds the volt glow for the hero card. */
export default function Card({ tone = 'default', className = '', children, ...rest }: React.HTMLAttributes<HTMLDivElement> & { tone?: 'default' | 'highlight' }) {
  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 sm:rounded-3xl ${tone === 'highlight' ? 'border-primary/30 bg-card glow-primary' : 'border-border bg-card elevated'} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
