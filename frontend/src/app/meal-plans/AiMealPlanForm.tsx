'use client';
import { useState } from 'react';
import { describeError } from '@/utils/api';
import { postAi } from '@/utils/ai';
import { Loader2, Sparkles } from 'lucide-react';
import type { MealPlan } from '@/types/domain';

type PlanDraft = Omit<MealPlan, 'id'>;

interface Props {
  /** From the profile: the calorie target and protein goal the plan is built around */
  targetCalories: number;
  proteinG: number;
  /** Receives the generated plan (not saved yet) */
  onGenerated: (plan: PlanDraft) => void;
  onCancel: () => void;
}

const MIN_BUDGET = 10000;
const MAX_BUDGET = 2000000;
const label = 'text-xs font-semibold text-muted-foreground uppercase tracking-wider';
const input = 'min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm';

export default function AiMealPlanForm({ targetCalories, proteinG, onGenerated, onCancel }: Props) {
  const [days, setDays] = useState('3');
  const [budget, setBudget] = useState(''); // VND per day; empty = no limit
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    if (pending) return;
    const dayCount = Number(days);
    if (!Number.isInteger(dayCount) || dayCount < 1 || dayCount > 7) { setError('Số ngày phải từ 1 đến 7.'); return; }
    const budgetPerDay = budget === '' ? undefined : Number(budget);
    if (budgetPerDay !== undefined && (budgetPerDay < MIN_BUDGET || budgetPerDay > MAX_BUDGET)) {
      setError('Ngân sách mỗi ngày từ 10.000 đến 2.000.000 đồng, hoặc bỏ trống.');
      return;
    }
    setPending(true);
    setError('');
    try {
      const { plan } = await postAi<{ plan: PlanDraft }>('/api/ai/meal-plan', {
        days: dayCount, targetCalories, proteinG, ...(budgetPerDay !== undefined && { budgetPerDay }), notes: notes.trim(),
      });
      onGenerated(plan);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <section aria-label="Tạo thực đơn bằng AI" className="bg-card border border-border rounded-3xl p-4 sm:p-6 space-y-4">
      <h2 className="text-lg font-black flex items-center gap-2">
        <Sparkles className="size-5 text-primary" aria-hidden /> Tạo thực đơn bằng AI
      </h2>
      <p className="text-xs font-semibold text-muted-foreground">Mục tiêu: {targetCalories} kcal · {proteinG} g protein (theo hồ sơ)</p>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-2">
          <span className={label}>Số ngày (1-7)</span>
          <input aria-label="Số ngày" inputMode="numeric" maxLength={1} value={days} onChange={e => setDays(e.target.value.replace(/\D/g, ''))} className={input} />
        </label>
        <label className="block space-y-2">
          <span className={label}>Ngân sách mỗi ngày (VNĐ)</span>
          <input
            aria-label="Ngân sách mỗi ngày (VNĐ)"
            inputMode="numeric"
            maxLength={7}
            value={budget}
            placeholder="Bỏ trống nếu không giới hạn"
            onChange={e => setBudget(e.target.value.replace(/\D/g, ''))}
            className={input}
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className={label}>Ghi chú (tùy chọn)</span>
        <textarea
          aria-label="Ghi chú"
          value={notes}
          maxLength={300}
          rows={2}
          onChange={e => setNotes(e.target.value)}
          placeholder="VD: dị ứng tôm, không ăn cay"
          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
      </label>

      {error && <p role="alert" className="text-xs font-semibold text-destructive">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50 cursor-pointer"
        >
          {pending ? <><Loader2 className="size-4 animate-spin" aria-hidden /> Đang tạo…</> : 'Tạo thực đơn'}
        </button>
        <button type="button" onClick={onCancel} className="min-h-11 rounded-full border border-border px-5 text-sm font-semibold cursor-pointer">
          Hủy
        </button>
      </div>
    </section>
  );
}
