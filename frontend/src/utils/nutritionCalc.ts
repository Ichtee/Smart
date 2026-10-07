// Shared BMR / TDEE / calorie-target maths (Mifflin-St Jeor).
// Used by onboarding, dashboard, nutrition and progress so all pages agree.

export interface BodyProfile {
  weight?: number | string | null;
  height?: number | string | null;
  age?: number | string | null;
  gender?: string | null;
  activityLevel?: string | null;
  goal?: string | null;
  /** kcal/day added to the goal target (from the weight-trend advice) */
  calorieAdjustment?: number | null;
}

export const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  'Ít vận động': 1.2,
  'Vận động nhẹ': 1.375,
  'Vận động vừa': 1.55,
  'Vận động nhiều': 1.725,
  'Vận động cực nhiều': 1.9,
};

const DEFAULTS = { weight: 65, height: 170, age: 25 };

const num = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export function calcBmr(p: BodyProfile): number {
  const w = num(p.weight, DEFAULTS.weight);
  const h = num(p.height, DEFAULTS.height);
  const a = num(p.age, DEFAULTS.age);
  const base = 10 * w + 6.25 * h - 5 * a;
  // Only "Nữ" gets the female constant; unknown/empty gender uses the male one consistently.
  return Math.round(p.gender === 'Nữ' ? base - 161 : base + 5);
}

export function calcTdee(p: BodyProfile): number {
  const mult = ACTIVITY_MULTIPLIERS[p.activityLevel || ''] ?? 1.2;
  return Math.round(calcBmr(p) * mult);
}

export function calcTargetCalories(p: BodyProfile): number {
  const tdee = calcTdee(p);
  let target = tdee;
  if (p.goal === 'Giảm mỡ') target = Math.max(1200, tdee - 500);
  else if (p.goal === 'Tăng cơ' || p.goal === 'Tăng cân') target = tdee + 300;
  const adjustment = Number(p.calorieAdjustment);
  if (Number.isFinite(adjustment) && adjustment !== 0) target = Math.max(1200, target + Math.round(adjustment));
  return target;
}

/** Signed calorie adjustment vs TDEE for the goal (for display). */
export function calcGoalAdjustment(p: BodyProfile): number {
  return calcTargetCalories(p) - calcTdee(p);
}

export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

/** Target macro grams from a calorie target (30/50/20 split). */
export function macroTargets(calories: number): Macros {
  return {
    protein: Math.round((calories * 0.3) / 4),
    carbs: Math.round((calories * 0.5) / 4),
    fat: Math.round((calories * 0.2) / 9),
  };
}

interface MacroItem {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

/**
 * Real macro totals from logged items. Items logged before macros were stored
 * (no protein/carbs/fat) fall back to the 30/50/20 split of their calories.
 */
export function sumMacros(items: MacroItem[]): Macros & { calories: number } {
  let calories = 0, protein = 0, carbs = 0, fat = 0;
  for (const it of items) {
    const cal = it.calories || 0;
    calories += cal;
    const hasMacros = it.protein !== undefined || it.carbs !== undefined || it.fat !== undefined;
    if (hasMacros) {
      protein += it.protein || 0;
      carbs += it.carbs || 0;
      fat += it.fat || 0;
    } else {
      const est = macroTargets(cal);
      protein += est.protein;
      carbs += est.carbs;
      fat += est.fat;
    }
  }
  return { calories, protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat) };
}
