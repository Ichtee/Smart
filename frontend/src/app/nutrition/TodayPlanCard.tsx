'use client';
import { useState } from 'react';
import { CalendarDays, ChevronDown, Plus } from 'lucide-react';
import type { MealPlan, MealPlanDay } from '@/types/domain';
import { MEAL_CATEGORIES } from './copyMeals';
import { dayTotals, isOffTarget } from '../meal-plans/mealPlan';

interface TodayPlanCardProps {
  plan: MealPlan;
  /** the plan day that falls on the selected date */
  day: MealPlanDay;
  /** false until the selected day has loaded from the server: adding would overwrite unread data */
  canApply: boolean;
  /** no meal = the whole day */
  onApply: (meal?: string) => void;
  /** the foods are folded away by default so the page keeps its one-screen layout; "Thêm cả ngày" stays on the header */
  defaultOpen?: boolean;
}

/** The active meal plan's foods for the selected date, each meal one tap away from the log. */
export default function TodayPlanCard({ plan, day, canApply, onApply, defaultOpen = false }: TodayPlanCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const totals = dayTotals(day);
  const meals = MEAL_CATEGORIES.filter(meal => (day.meals[meal] ?? []).length > 0);

  return (
    <section className="bg-card/90 border border-slate-800/80 rounded-2xl sm:rounded-3xl px-4 py-2 sm:px-5 shadow-2xl space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
          className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 text-left cursor-pointer"
        >
          <span className="min-w-0">
            <span className="flex items-center gap-2 whitespace-nowrap text-sm font-bold text-white sm:text-base">
              <CalendarDays className="hidden size-5 shrink-0 text-primary sm:block" aria-hidden /> Thực đơn hôm nay
            </span>
            <span className="block truncate text-xs font-semibold text-muted-foreground">
              <span className={`font-bold ${isOffTarget(totals.calories, plan.targetCalories) ? 'text-warning' : 'text-primary'}`}>
                {totals.calories}{plan.targetCalories ? ` / ${plan.targetCalories}` : ''} kcal
              </span>
              {' · '}{plan.name} · {day.name}
            </span>
          </span>
          <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Thêm cả ngày vào nhật ký"
          disabled={!canApply}
          onClick={() => onApply()}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap rounded-xl bg-primary px-2.5 text-xs font-black text-primary-foreground disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          <Plus className="size-4" aria-hidden /> Thêm cả ngày
        </button>
      </div>

      {open && (
        <ul className="space-y-2 pb-2">
          {meals.map(meal => (
            <li key={meal} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/60 bg-inset px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">{meal}</p>
                <ul className="text-xs text-slate-300">
                  {day.meals[meal].map(item => (
                    <li key={item.id} className="break-words">
                      <span className="font-semibold">{item.name}</span>
                      {item.quantity && <span className="ml-1 text-slate-400">({item.quantity})</span>}
                      <span className="ml-1.5 font-bold text-primary">{item.calories} kcal</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                aria-label={`Thêm ${meal} vào nhật ký`}
                disabled={!canApply}
                onClick={() => onApply(meal)}
                className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl bg-secondary px-3 text-xs font-bold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                <Plus className="size-4" aria-hidden /> Thêm
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
