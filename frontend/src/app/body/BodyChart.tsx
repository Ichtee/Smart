'use client';
import EmptyState from '@/components/ui/EmptyState';
import { Scale } from 'lucide-react';
import { chartPoints, formatDateVi, pointsToPath, type BodyMetric } from '@/utils/bodyMetrics';

const W = 600;
const H = 220;

/** Line chart of the weight over time (plain SVG, no chart library). */
export default function BodyChart({ metrics }: { metrics: BodyMetric[] }) {
  if (metrics.length === 0) {
    return <EmptyState icon={<Scale className="size-7" />} title="Chưa có số đo nào" hint="Hãy ghi cân nặng đầu tiên của bạn ở ô bên dưới." />;
  }
  const points = chartPoints(metrics, W, H);
  const first = points[0];
  const last = points[points.length - 1];
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Biểu đồ cân nặng từ ${first.date} đến ${last.date}`} className="w-full h-auto">
        {points.length > 1 && (
          <path d={pointsToPath(points)} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" className="text-primary" />
        )}
        {points.map(p => (
          <circle key={p.date} cx={p.x} cy={p.y} r="4.5" className="fill-primary stroke-background" strokeWidth="2">
            <title>{`${p.date}: ${p.weight} kg`}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="flex justify-between text-xs font-semibold text-muted-foreground mt-2">
        <span>{formatDateVi(first.date)}</span>
        <span>{formatDateVi(last.date)}</span>
      </figcaption>
      {points.length === 1 && <p className="mt-2 text-center text-xs text-muted-foreground">Ghi thêm số đo vào những ngày khác để thấy đường xu hướng.</p>}
    </figure>
  );
}
