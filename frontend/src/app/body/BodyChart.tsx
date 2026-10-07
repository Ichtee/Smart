'use client';
import { chartPoints, pointsToPath, type BodyMetric } from '@/utils/bodyMetrics';

const W = 600;
const H = 220;

/** Line chart of the weight over time (plain SVG, no chart library). */
export default function BodyChart({ metrics }: { metrics: BodyMetric[] }) {
  if (metrics.length === 0) {
    return <p className="text-sm text-muted-foreground italic py-10 text-center">Chưa có số đo nào. Hãy ghi cân nặng đầu tiên của bạn.</p>;
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
        <span>{first.date}</span>
        <span>{last.date}</span>
      </figcaption>
    </figure>
  );
}
