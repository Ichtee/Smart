// Shared BMR / TDEE / calorie-target / macro maths. Every page goes through calcEnergyPlan and
// macroTargets so they all show the same numbers. Each constant names the source it comes from.

export interface BodyProfile {
  weight?: number | string | null;
  height?: number | string | null;
  age?: number | string | null;
  gender?: string | null;
  activityLevel?: string | null;
  goal?: string | null;
  /** 'Chậm' | 'Vừa' | 'Nhanh' (how fast the goal is pursued); empty = 'Vừa' */
  goalPace?: string | null;
  /** kg the user wants to reach (optional) */
  targetWeight?: number | string | null;
  /** % body fat of the latest measurement (optional) */
  bodyFat?: number | string | null;
  /** kcal/day added to the goal target (from the weight-trend advice) */
  calorieAdjustment?: number | null;
}

/**
 * TDEE = BMR x activity factor. Factors adapted from the FAO/WHO/UNU (1985) energy-requirement
 * report, as used by most TDEE calculators.
 */
export const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  'Ít vận động': 1.2,
  'Vận động nhẹ': 1.375,
  'Vận động vừa': 1.55,
  'Vận động nhiều': 1.725,
  'Vận động cực nhiều': 1.9,
};

/** Energy of 1 kg of body weight change (Wishnofsky). Only the starting point: the weight-trend advice corrects it (Hall 2008/2011). */
export const KCAL_PER_KG = 7700;

export const PACES = ['Chậm', 'Vừa', 'Nhanh'] as const;
export type Pace = typeof PACES[number];
export const DEFAULT_PACE: Pace = 'Vừa';

/**
 * Fat loss: weekly loss as a share of body weight. Helms et al. 2014 (JISSN): 0.5-1 %/week keeps
 * lean mass; Garthe et al. 2011: 0.7 %/week gained lean mass where 1.4 % did not.
 */
export const FAT_LOSS_RATE: Record<Pace, number> = { 'Chậm': 0.005, 'Vừa': 0.007, 'Nhanh': 0.01 };
/** CDC / NHS / NICE CG189: a 500-1000 kcal/day deficit, i.e. about 0.5-1 kg/week. */
export const MIN_DEFICIT = 500;
export const MAX_DEFICIT = 1000;
export const MAX_LOSS_KG_PER_WEEK = 1;

/** Muscle gain: surplus as a share of TDEE. Iraki et al. 2019 (Sports): ~10-20 %, gaining ~0.25-0.5 % of body weight/week. */
export const MUSCLE_GAIN_SURPLUS: Record<Pace, number> = { 'Chậm': 0.1, 'Vừa': 0.15, 'Nhanh': 0.2 };
export const MUSCLE_GAIN_RATE = { min: 0.0025, max: 0.005 };
export const MUSCLE_GAIN_AIM: Record<Pace, number> = { 'Chậm': 0.0025, 'Vừa': 0.00375, 'Nhanh': 0.005 };

/** Weight gain (underweight): NHS "advice for underweight adults": +300-500 kcal/day, no more than 0.5-1 kg/week. */
export const WEIGHT_GAIN_SURPLUS: Record<Pace, number> = { 'Chậm': 300, 'Vừa': 400, 'Nhanh': 500 };
export const WEIGHT_GAIN_RATE_KG = { min: 0.25, max: 1 };

/** Maintenance band (kg/week) used by the weight-trend advice. */
export const MAINTENANCE_RATE_KG = { min: -0.25, max: 0.25 };

const num = (v: unknown): number | null => {
  const n = Number(v);
  return v !== null && v !== '' && Number.isFinite(n) && n > 0 ? n : null;
};

export const normalizePace = (pace?: string | null): Pace =>
  (PACES as readonly string[]).includes(pace || '') ? (pace as Pace) : DEFAULT_PACE;

/** Whether the goal has a speed to choose (maintenance goals do not). */
export const goalHasPace = (goal?: string | null) => goal === 'Giảm mỡ' || goal === 'Tăng cơ' || goal === 'Tăng cân';

/** A usable % body fat (the range the body-measurement form accepts), else null. */
export const usableBodyFat = (bf: unknown): number | null => {
  const n = num(bf);
  return n !== null && n >= 2 && n <= 70 ? n : null;
};

/** Lean body mass (kg) from weight and % body fat; null without a usable body fat. */
export function calcLeanMass(weight: unknown, bodyFat: unknown): number | null {
  const w = num(weight);
  const bf = usableBodyFat(bodyFat);
  if (w === null || bf === null) return null;
  return Math.round(w * (1 - bf / 100) * 10) / 10;
}

export const hasCompleteProfile = (p: BodyProfile) => num(p.weight) !== null && num(p.height) !== null && num(p.age) !== null;

export type BmrFormula = 'mifflin' | 'katch';

/**
 * Mifflin-St Jeor (1990), the equation the Academy of Nutrition and Dietetics adopted after
 * Frankenfield et al. 2005. With a measured % body fat: Katch-McArdle, 370 + 21.6 x lean mass.
 * Only "Nữ" gets the female constant; other/empty gender uses the male one. Null when weight,
 * height or age is missing.
 */
export function calcBmrDetail(p: BodyProfile): { bmr: number; formula: BmrFormula } | null {
  if (!hasCompleteProfile(p)) return null;
  const lean = calcLeanMass(p.weight, p.bodyFat);
  if (lean !== null) return { bmr: Math.round(370 + 21.6 * lean), formula: 'katch' };
  const base = 10 * num(p.weight)! + 6.25 * num(p.height)! - 5 * num(p.age)!;
  return { bmr: Math.round(p.gender === 'Nữ' ? base - 161 : base + 5), formula: 'mifflin' };
}

export const activityMultiplier = (level?: string | null) => ACTIVITY_MULTIPLIERS[level || ''] ?? 1.2;

export interface EnergyPlan {
  bmr: number;
  formula: BmrFormula;
  tdee: number;
  goal: string;
  pace: Pace | null;
  /** kcal/day from the goal and pace alone (negative = deficit) */
  goalDelta: number;
  /** goalDelta + calorieAdjustment */
  delta: number;
  target: number;
  /** expected change in kg/week from `delta` (estimate, KCAL_PER_KG) */
  weeklyChangeKg: number;
  /** weeks until targetWeight at that rate; null without a target or when it is the other way */
  weeksToGoal: number | null;
}

const goalDeltaFor = (goal: string, pace: Pace, weight: number, tdee: number): number => {
  if (goal === 'Giảm mỡ') {
    const deficit = Math.min(MAX_DEFICIT, Math.max(MIN_DEFICIT, (weight * FAT_LOSS_RATE[pace] * KCAL_PER_KG) / 7));
    return -Math.round(deficit);
  }
  if (goal === 'Tăng cơ') return Math.round(tdee * MUSCLE_GAIN_SURPLUS[pace]);
  if (goal === 'Tăng cân') return WEIGHT_GAIN_SURPLUS[pace];
  return 0;
};

/** The whole calorie plan of a profile, or null when weight, height or age is missing. */
export function calcEnergyPlan(p: BodyProfile): EnergyPlan | null {
  const detail = calcBmrDetail(p);
  if (!detail) return null;
  const weight = num(p.weight)!;
  const tdee = Math.round(detail.bmr * activityMultiplier(p.activityLevel));
  const goal = p.goal || '';
  const pace = goalHasPace(goal) ? normalizePace(p.goalPace) : null;
  const goalDelta = goalDeltaFor(goal, pace ?? DEFAULT_PACE, weight, tdee);
  const adjustment = Number(p.calorieAdjustment);
  const delta = goalDelta + (Number.isFinite(adjustment) ? Math.round(adjustment) : 0);
  const weeklyChangeKg = Math.round(((delta * 7) / KCAL_PER_KG) * 100) / 100;

  let weeksToGoal: number | null = null;
  const target = num(p.targetWeight);
  if (target !== null && weeklyChangeKg !== 0) {
    const gap = target - weight;
    if (gap !== 0 && Math.sign(gap) === Math.sign(weeklyChangeKg)) weeksToGoal = Math.ceil(gap / weeklyChangeKg);
  }

  return { bmr: detail.bmr, formula: detail.formula, tdee, goal, pace, goalDelta, delta, target: tdee + delta, weeklyChangeKg, weeksToGoal };
}

/** Target kcal of every goal at the profile's pace (for the "by goal" table on the dashboard). */
export function goalTargets(p: BodyProfile): Record<'Giảm mỡ' | 'Tăng cơ' | 'Tăng cân' | 'Giữ dáng', number> | null {
  const of = (goal: string) => calcEnergyPlan({ ...p, goal, calorieAdjustment: 0 })?.target ?? 0;
  if (!hasCompleteProfile(p)) return null;
  return { 'Giảm mỡ': of('Giảm mỡ'), 'Tăng cơ': of('Tăng cơ'), 'Tăng cân': of('Tăng cân'), 'Giữ dáng': of('Giữ dáng') };
}

// Thin wrappers kept for callers that need a single number (0 when the profile is incomplete).
export const calcBmr = (p: BodyProfile): number => calcBmrDetail(p)?.bmr ?? 0;
export const calcTdee = (p: BodyProfile): number => calcEnergyPlan(p)?.tdee ?? 0;
export const calcTargetCalories = (p: BodyProfile): number => calcEnergyPlan(p)?.target ?? 0;
/** Signed calorie change vs TDEE (goal + adjustment), for display. */
export const calcGoalAdjustment = (p: BodyProfile): number => calcEnergyPlan(p)?.delta ?? 0;

export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Protein g/kg body weight by goal. ISSN position stand 2017: 1.4-2.0 g/kg/day; endurance at the
 * low end, intermittent sports in the middle, strength/power at the top.
 */
export const PROTEIN_G_PER_KG: Record<string, number> = {
  'Sức bền': 1.4,
  'Giữ dáng': 1.7,
  'Tăng cơ': 2.0,
  'Tăng cân': 2.0,
  'Giảm mỡ': 2.0,
};
/** Fat loss with a known % body fat: Helms et al. 2014, 2.3-3.1 g/kg lean mass (low end). */
export const CUT_PROTEIN_G_PER_KG_LEAN = 2.3;
/** AMDR (Institute of Medicine): protein 10-35 %, fat 20-35 % of energy. */
export const MAX_PROTEIN_SHARE = 0.35;
export const MIN_FAT_SHARE = 0.2;
/** 25 % of energy from fat (inside AMDR 20-35 % and Helms 15-30 %), kept within Iraki 2019's 0.5-1.5 g/kg. */
export const FAT_SHARE = 0.25;
export const FAT_G_PER_KG = { min: 0.5, max: 1.5 };

/** Grams from a 30/50/20 split: only used to estimate macros of a food logged without them. */
export function estimateMacros(calories: number): Macros {
  return {
    protein: Math.round((calories * 0.3) / 4),
    carbs: Math.round((calories * 0.5) / 4),
    fat: Math.round((calories * 0.2) / 9),
  };
}

/**
 * Target grams for a calorie target: protein by body weight and goal, fat 25 % of energy within
 * 0.5-1.5 g/kg and never below 20 %, carbs the rest. Without a usable weight the 30/50/20 estimate is used.
 */
export function macroTargets(calories: number, p?: BodyProfile | null): Macros {
  const weight = p ? num(p.weight) : null;
  if (!weight || calories <= 0) return estimateMacros(Math.max(0, calories));

  const lean = p!.goal === 'Giảm mỡ' ? calcLeanMass(weight, p!.bodyFat) : null;
  let protein = lean !== null ? lean * CUT_PROTEIN_G_PER_KG_LEAN : weight * (PROTEIN_G_PER_KG[p!.goal || ''] ?? PROTEIN_G_PER_KG['Giữ dáng']);
  protein = Math.min(protein, (calories * MAX_PROTEIN_SHARE) / 4);

  let fat = (calories * FAT_SHARE) / 9;
  fat = Math.min(FAT_G_PER_KG.max * weight, Math.max(FAT_G_PER_KG.min * weight, fat));
  fat = Math.max(fat, (calories * MIN_FAT_SHARE) / 9);

  const carbs = Math.max(0, (calories - protein * 4 - fat * 9) / 4);
  return { protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat) };
}

interface MacroItem {
  calories?: number;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

const hasValue = (v: unknown) => v !== undefined && v !== null;

/**
 * Real macro totals from logged items. Items without any macro (old entries, manual entries)
 * are estimated from their calories; `estimatedCalories` tells how many kcal that covers.
 */
export function sumMacros(items: MacroItem[]): Macros & { calories: number; estimatedCalories: number } {
  let calories = 0, protein = 0, carbs = 0, fat = 0, estimatedCalories = 0;
  for (const it of items) {
    const cal = it.calories || 0;
    calories += cal;
    if (hasValue(it.protein) || hasValue(it.carbs) || hasValue(it.fat)) {
      protein += it.protein || 0;
      carbs += it.carbs || 0;
      fat += it.fat || 0;
    } else {
      const est = estimateMacros(cal);
      protein += est.protein;
      carbs += est.carbs;
      fat += est.fat;
      estimatedCalories += cal;
    }
  }
  return { calories, protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat), estimatedCalories };
}
