'use client';
import ProgressRing from '@/components/ui/ProgressRing';
import { macroTargets, sumMacros } from '@/utils/nutritionCalc';
import type { MealItem } from './types';

interface Props {
  meals: Record<string, MealItem[]>;
  targetCalories: number;
}

const MACROS = [
  { key: 'protein', label: 'Protein', color: 'text-protein' },
  { key: 'carbs', label: 'Carb', color: 'text-carb' },
  { key: 'fat', label: 'Chất béo', color: 'text-fat' },
] as const;

/** Protein / carb / fat eaten today against the 30/50/20 split of the calorie target, each with its own color. */
export default function MacroSummary({ meals, targetCalories }: Props) {
  const eaten = sumMacros(Object.values(meals).flat());
  const target = macroTargets(targetCalories);
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
    </section>
  );
}
