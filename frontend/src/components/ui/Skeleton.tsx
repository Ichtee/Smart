/** Loading placeholder shaped like the content, replacing a spinning wheel. Size it with className (h-*, w-*). */
export default function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-[skeleton-pulse_1.4s_ease-in-out_infinite] rounded-xl bg-muted/60 ${className}`} />;
}

/** A page-level loading state: announces "Đang tải" to screen readers and shows a few card-shaped blocks. */
export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Đang tải" className="space-y-4">
      <Skeleton className="h-10 w-56" />
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-32 w-full rounded-3xl" />)}
    </div>
  );
}
