'use client';
import ProgressRing from '@/components/ui/ProgressRing';
import { macroTargets, sumMacros, type BodyProfile } from '@/utils/nutritionCalc';
import type { MealItem } from './types';

interface Props {
  meals: Record<string, MealItem[]>;
  targetCalories: number;
  profile?: BodyProfile | null;
}

const MACROS = [
  { key: 'protein', label: 'Protein', color: 'text-protein' },
  { key: 'carbs', label: 'Carb', color: 'text-carb' },
  { key: 'fat', label: 'Chất béo', color: 'text-fat' },
] as const;

/**
 * Protein / carb / fat eaten today against the targets for the profile (protein by g/kg and goal,
 * fat 25 %, carbs the rest; see macroTargets), each with its own color.
 */
export default function MacroSummary({ meals, targetCalories, profile }: Props) {
  const eaten = sumMacros(Object.values(meals).flat());
  const target = macroTargets(targetCalories, profile);
  return (
    <section aria-label="Dinh dưỡng đa lượng" className="rounded-2xl sm:rounded-3xl border border-border bg-card p-4 sm:p-6">
      <h2 className="mb-4 font-display text-2xl font-bold">Protein · Carb · Chất béo</h2>
      <div className="grid grid-cols-3 gap-3 sm:gap-6">
        {MACROS.map(m => (
          <div key={m.key} className="flex flex-col items-center gap-2 text-center">
            <p className={`text-sm font-bold ${m.color}`}>{m.label}</p>
            <ProgressRing value={eaten[m.key]} max={target[m.key]} label={`${m.label} hôm nay`} colorClass={m.color} size={96}>
              <span className="font-display text-2xl font-bold leading-none">{Math.round(eaten[m.key])}</span>
              <span className="text-xs text-muted-foreground">/ {target[m.key]} g</span>
            </ProgressRing>
          </div>
        ))}
      </div>
      {eaten.estimatedCalories > 0 && (
        <p className="mt-3 text-xs text-muted-foreground" data-testid="macro-estimate-note">
          ≈ Gồm {eaten.estimatedCalories} kcal từ món chưa có thông tin macro (ước tính theo tỷ lệ 30/50/20).
        </p>
      )}
    </section>
  );
}
