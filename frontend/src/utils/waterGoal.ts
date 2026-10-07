// Daily water goal. Rule of thumb: about 35 ml per kg of body weight, rounded to 50 ml and kept in a
// sensible range. Without a usable weight the old fixed 2 litres applies.

export const DEFAULT_WATER_GOAL_ML = 2000;
export const WATER_ML_PER_KG = 35;
export const MIN_WATER_GOAL_ML = 1500;
export const MAX_WATER_GOAL_ML = 4000;

export function waterGoalMl(weightKg: unknown): number {
  const w = Number(weightKg);
  if (!Number.isFinite(w) || w <= 0) return DEFAULT_WATER_GOAL_ML;
  const rounded = Math.round((w * WATER_ML_PER_KG) / 50) * 50;
  return Math.min(MAX_WATER_GOAL_ML, Math.max(MIN_WATER_GOAL_ML, rounded));
}

/** How many glasses of `mlPerGlass` reach the goal. */
export const waterGoalGlasses = (goalMl: number, mlPerGlass: number): number =>
  Math.ceil(goalMl / (mlPerGlass > 0 ? mlPerGlass : 250));
