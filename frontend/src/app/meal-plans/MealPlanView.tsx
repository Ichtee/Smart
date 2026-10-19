'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import type { MealPlan, MealPlanDay } from '@/types/domain';
import { MEAL_CATEGORIES } from '../nutrition/copyMeals';
import { dayTotals, isOffTarget } from './mealPlan';

interface MealPlanViewProps {
  plan: Pick<MealPlan, 'days' | 'targetCalories'>;
  /** shows a remove button on every food; the parent owns the days and gets the new list in `onChange` */
  editable?: boolean;
  onChange?: (days: MealPlanDay[]) => void;
}

/** One plan, one day at a time: day tabs, the day's total against the target, and the foods by meal. */
export default function MealPlanView({ plan, editable = false, onChange }: MealPlanViewProps) {
  const [active, setActive] = useState(0);
  const dayIndex = Math.min(active, plan.days.length - 1);
  const day = plan.days[dayIndex];
  const totals = dayTotals(day);
  const off = isOffTarget(totals.calories, plan.targetCalories);
  const meals = MEAL_CATEGORIES.filter(meal => (day.meals[meal] ?? []).length > 0);

  const removeItem = (meal: string, id: string) =>
    onChange?.(plan.days.map((d, i) => (i === dayIndex ? { ...d, meals: { ...d.meals, [meal]: (d.meals[meal] ?? []).filter(x => x.id !== id) } } : d)));

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Ngày trong thực đơn" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {plan.days.map((d, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === dayIndex}
            onClick={() => setActive(i)}
            className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-bold cursor-pointer ${i === dayIndex ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
          >
            {d.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-border bg-secondary/40 px-4 py-3">
        <p className="text-sm font-bold text-foreground">
          {totals.calories}{plan.targetCalories ? ` / ${plan.targetCalories}` : ''} kcal
        </p>
        <p className="text-xs font-semibold text-muted-foreground">Đạm {totals.protein} g · Tinh bột {totals.carbs} g · Béo {totals.fat} g</p>
        {off && <span className="rounded-full border border-warning/40 bg-warning/10 px-2.5 py-0.5 text-xs font-bold text-warning">Lệch mục tiêu</span>}
      </div>

      {meals.length === 0 && <p className="text-sm text-muted-foreground">Ngày này chưa có món nào.</p>}

      {meals.map(meal => {
        const items = day.meals[meal];
        return (
          <section key={meal} aria-label={meal} className="space-y-2">
            <h4 className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-primary">
              <span>{meal}</span>
              <span className="text-muted-foreground">{items.reduce((s, i) => s + i.calories, 0)} kcal</span>
            </h4>
            <ul className="space-y-2">
              {items.map(item => (
                <li key={item.id} className="flex items-start justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                  <span className="min-w-0 break-words">
                    <span className="font-semibold text-foreground">{item.name}</span>
                    {item.quantity && <span className="ml-1.5 text-xs text-muted-foreground">({item.quantity})</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <span className="whitespace-nowrap text-xs font-bold text-primary">{item.calories} kcal</span>
                    {editable && (
                      <button
                        type="button"
                        aria-label={`Bỏ ${item.name}`}
                        onClick={() => removeItem(meal, item.id)}
                        className="-my-2 -mr-2 inline-flex size-11 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <X className="size-4" aria-hidden />
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
