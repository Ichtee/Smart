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

const DAY_OPTIONS = [1, 3, 5, 7];
const BUDGETS = [
  { value: 'thrifty', label: 'Tiết kiệm' },
  { value: 'normal', label: 'Vừa phải' },
  { value: 'generous', label: 'Thoải mái' },
];

export default function AiMealPlanForm({ targetCalories, proteinG, onGenerated, onCancel }: Props) {
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState('normal');
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const { plan } = await postAi<{ plan: PlanDraft }>('/api/ai/meal-plan', { days, targetCalories, proteinG, budget, notes: notes.trim() });
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

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Số ngày</p>
        <div className="flex flex-wrap gap-2">
          {DAY_OPTIONS.map(n => (
            <button
              key={n}
              type="button"
              aria-label={`${n} ngày`}
              aria-pressed={days === n}
              onClick={() => setDays(n)}
              className={`size-11 rounded-xl border text-sm font-bold cursor-pointer ${days === n ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary'}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ngân sách</span>
        <select
          aria-label="Ngân sách"
          value={budget}
          onChange={e => setBudget(e.target.value)}
          className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
        >
          {BUDGETS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ghi chú (tùy chọn)</span>
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
