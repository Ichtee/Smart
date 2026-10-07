// Daily water goal: 35 ml per kg of body weight under 60 years, 30 ml/kg from 60 (clinical rule of
// thumb, e.g. OncoLink "Determining Fluid Requirements"), rounded to 50 ml, never below 2 litres and
// at most 4 litres. Without a usable weight the 2 litre floor applies.

export const DEFAULT_WATER_GOAL_ML = 2000;
export const WATER_ML_PER_KG = 35;
export const WATER_ML_PER_KG_60_PLUS = 30;
export const MIN_WATER_GOAL_ML = 2000;
export const MAX_WATER_GOAL_ML = 4000;

export function waterGoalMl(weightKg: unknown, age?: unknown): number {
  const w = Number(weightKg);
  if (weightKg === null || weightKg === '' || !Number.isFinite(w) || w <= 0) return DEFAULT_WATER_GOAL_ML;
  const perKg = Number(age) >= 60 ? WATER_ML_PER_KG_60_PLUS : WATER_ML_PER_KG;
  const rounded = Math.round((w * perKg) / 50) * 50;
  return Math.min(MAX_WATER_GOAL_ML, Math.max(MIN_WATER_GOAL_ML, rounded));
}

/** How many glasses of `mlPerGlass` reach the goal. */
export const waterGoalGlasses = (goalMl: number, mlPerGlass: number): number =>
  Math.ceil(goalMl / (mlPerGlass > 0 ? mlPerGlass : 250));
