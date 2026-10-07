'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flame, Loader2 } from 'lucide-react';
import { apiFetch, describeError, isUnauthorized } from '@/utils/api';
import { refreshProfile } from '@/hooks/useApi';
import { calorieAdvice, goalRate, MIN_ENTRIES, MIN_SPAN_DAYS } from '@/utils/calorieAdvice';
import { calcTargetCalories, type BodyProfile } from '@/utils/nutritionCalc';
import type { BodyMetric } from '@/utils/bodyMetrics';

const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`;

/** Compares the real weight trend with the goal and offers a small change of the daily calorie target. */
export default function CalorieAdvicePanel({ metrics, profile }: { metrics: BodyMetric[]; profile: BodyProfile }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const current = profile.calorieAdjustment || 0;
  const advice = calorieAdvice(metrics, profile.goal, current);
  const { trend } = advice;
  const band = goalRate(profile.goal);

  const save = async (calorieAdjustment: number) => {
    setError('');
    setSaving(true);
    try {
      const res = await apiFetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calorieAdjustment }),
      });
      if (isUnauthorized(res)) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Không thể cập nhật mục tiêu calo.');
      }
      await refreshProfile();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  const target = calcTargetCalories(profile);
  const nextTarget = calcTargetCalories({ ...profile, calorieAdjustment: advice.newAdjustment });

  return (
    <section aria-labelledby="calorie-advice-title" className="bg-card border border-border rounded-3xl p-5 sm:p-8 space-y-4">
      <h2 id="calorie-advice-title" className="text-lg font-bold flex items-center gap-2"><Flame className="size-5 text-primary" /> Gợi ý điều chỉnh calo</h2>

      {error && <div role="alert" className="p-3 rounded-2xl border bg-destructive/10 border-destructive/30 text-destructive text-xs font-semibold">{error}</div>}

      {trend ? (
        <p className="text-sm" data-testid="trend-text">
          Xu hướng {trend.entries} số đo gần nhất ({trend.spanDays} ngày):{' '}
          <span className="font-black">{signed(trend.perWeek)} kg/tuần</span>. Mục tiêu của bạn nằm trong khoảng {signed(band.min)} đến {signed(band.max)} kg/tuần.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Cần ít nhất {MIN_ENTRIES} số đo trải trong {MIN_SPAN_DAYS} ngày gần nhất để đánh giá xu hướng cân nặng.
        </p>
      )}

      {advice.status === 'on-track' && (
        <p role="status" className="text-sm font-semibold text-primary">Cân nặng đang đi đúng hướng, không cần thay đổi mục tiêu calo.</p>
      )}
      {advice.status === 'limit' && (
        <p role="status" className="text-sm font-semibold text-muted-foreground">
          Xu hướng chưa khớp mục tiêu nhưng điều chỉnh đã ở mức tối đa ({signed(current)} kcal). Hãy xem lại mức vận động hoặc mục tiêu trong hồ sơ.
        </p>
      )}
      {advice.status === 'adjust' && (
        <div className="space-y-3">
          <p className="text-sm font-semibold" data-testid="advice-text">
            Nên {advice.delta > 0 ? 'tăng' : 'giảm'} {Math.abs(advice.delta)} kcal/ngày: mục tiêu {target} → {nextTarget} kcal.
          </p>
          <button type="button" disabled={saving} onClick={() => save(advice.newAdjustment)} className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 disabled:opacity-50 cursor-pointer flex items-center gap-2">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Áp dụng
          </button>
        </div>
      )}

      {current !== 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">Đang áp dụng điều chỉnh {signed(current)} kcal/ngày so với mục tiêu theo công thức.</p>
          <button type="button" disabled={saving} onClick={() => save(0)} className="text-xs font-bold underline disabled:opacity-50 cursor-pointer">Đặt lại về 0</button>
        </div>
      )}
    </section>
  );
}
