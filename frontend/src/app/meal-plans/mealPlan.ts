import { sumMacros } from '@/utils/nutritionCalc';
import type { MealPlan, MealPlanDay } from '@/types/domain';
import type { MealItem } from '../nutrition/types';
import { MEAL_CATEGORIES } from '../nutrition/copyMeals';

export const MAX_MEAL_PLANS = 10;
const OFF_TARGET_SHARE = 0.15;

/** The plan day to use on a date: Monday is day 1, and a plan shorter than a week repeats. */
export const planDayFor = (plan: Pick<MealPlan, 'days'>, date: Date): MealPlanDay =>
  plan.days[((date.getDay() + 6) % 7) % plan.days.length];

export const dayItems = (day: MealPlanDay): MealItem[] => MEAL_CATEGORIES.flatMap(meal => day.meals[meal] ?? []);

/** Calories and macros of a whole plan day. */
export const dayTotals = (day: MealPlanDay) => sumMacros(dayItems(day));

/** True when a day's calories are more than 15% away from the plan's target (never when there is no target). */
export const isOffTarget = (kcal: number, target?: number | null) =>
  !!target && Math.abs(kcal - target) / target > OFF_TARGET_SHARE;

export const planSummary = (plan: Pick<MealPlan, 'days'>) => {
  const average = Math.round(plan.days.reduce((sum, d) => sum + dayTotals(d).calories, 0) / plan.days.length);
  return `${plan.days.length} ngày · ~${average} kcal/ngày`;
};
