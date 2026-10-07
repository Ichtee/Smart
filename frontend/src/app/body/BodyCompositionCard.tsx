'use client';
import { PersonStanding } from 'lucide-react';
import { bodyFatCategory, bodyFatSummary } from '@/utils/bodyFat';
import { formatDateVi, type BodyMetric } from '@/utils/bodyMetrics';

/** Lean / fat mass and the ACE category from the latest measurement that has a body fat. */
export default function BodyCompositionCard({ metrics, gender }: { metrics: BodyMetric[]; gender?: string | null }) {
  const summary = bodyFatSummary(metrics);
  if (!summary) return null;
  const { latest, change } = summary;
  const showCategory = gender === 'Nam' || gender === 'Nữ';

  return (
    <section aria-labelledby="body-comp-title" className="bg-card border border-border rounded-3xl p-5 sm:p-8 space-y-4" data-testid="body-composition">
      <h2 id="body-comp-title" className="text-lg font-bold flex items-center gap-2"><PersonStanding className="size-5 text-primary" aria-hidden="true" /> Thành phần cơ thể</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tỷ lệ mỡ</p>
          <p className="text-xl sm:text-2xl font-black">{latest.bodyFat}%</p>
          {showCategory && <p className="text-xs text-muted-foreground">{bodyFatCategory(latest.bodyFat, gender)} (ACE)</p>}
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Khối nạc</p>
          <p className="text-xl sm:text-2xl font-black">{latest.leanMass} kg</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Khối mỡ</p>
          <p className="text-xl sm:text-2xl font-black">{latest.fatMass} kg</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Thay đổi % mỡ</p>
          <p className="text-xl sm:text-2xl font-black" data-testid="body-fat-change">{change === null ? '—' : `${change > 0 ? '+' : ''}${change}%`}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Theo số đo ngày {formatDateVi(latest.date)}. Khi có tỷ lệ mỡ, BMR được tính theo công thức Katch-McArdle (dựa trên khối nạc).</p>
    </section>
  );
}
