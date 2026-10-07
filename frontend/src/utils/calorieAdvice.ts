// Weight-trend advice: compares how fast the weight really moves with what the goal asks for and
// suggests a small change of the daily calorie target. Pure functions, no I/O.
import type { BodyMetric } from './bodyMetrics';

export const KCAL_PER_KG = 7700;
export const WINDOW_DAYS = 28;
export const MIN_ENTRIES = 4;
export const MIN_SPAN_DAYS = 14;
export const MAX_STEP = 250; // largest change per suggestion
export const MAX_ADJUSTMENT = 500; // same limit as the backend

const DAY_MS = 86400000;
const dayNumber = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
};

export interface WeightTrend {
  /** kg per week (negative = losing), rounded to 0.01 */
  perWeek: number;
  entries: number;
  spanDays: number;
}

/**
 * Least-squares slope of the weights in the last WINDOW_DAYS before the latest entry.
 * `metrics` are sorted oldest first. Returns null when there is too little data to say anything.
 */
export function weightTrend(metrics: BodyMetric[]): WeightTrend | null {
  if (metrics.length === 0) return null;
  const last = dayNumber(metrics[metrics.length - 1].date);
  const recent = metrics.filter(m => last - dayNumber(m.date) < WINDOW_DAYS);
  if (recent.length < MIN_ENTRIES) return null;
  const xs = recent.map(m => dayNumber(m.date));
  const spanDays = xs[xs.length - 1] - xs[0];
  if (spanDays < MIN_SPAN_DAYS) return null;
  const n = recent.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = recent.reduce((a, m) => a + m.weight, 0) / n;
  let num = 0, den = 0;
  recent.forEach((m, i) => { num += (xs[i] - mx) * (m.weight - my); den += (xs[i] - mx) ** 2; });
  return { perWeek: Math.round((num / den) * 7 * 100) / 100, entries: n, spanDays };
}

/** Healthy weekly change (kg/week) the goal is aiming for: the acceptable band and the middle to aim at. */
export function goalRate(goal?: string | null): { min: number; max: number; aim: number } {
  if (goal === 'Giảm mỡ') return { min: -0.75, max: -0.25, aim: -0.5 };
  if (goal === 'Tăng cơ' || goal === 'Tăng cân') return { min: 0.1, max: 0.5, aim: 0.25 };
  return { min: -0.25, max: 0.25, aim: 0 };
}

export type AdviceStatus = 'insufficient' | 'on-track' | 'adjust' | 'limit';

export interface CalorieAdvice {
  status: AdviceStatus;
  trend: WeightTrend | null;
  /** kcal/day to add to the current adjustment (0 unless status is "adjust") */
  delta: number;
  /** the adjustment to save when the advice is applied */
  newAdjustment: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Whether the real trend fits the goal and, if not, the next calorie adjustment (in steps of 50 kcal,
 * at most MAX_STEP at a time, never beyond +-MAX_ADJUSTMENT in total).
 * "limit" means the trend is off but the adjustment is already at its limit.
 */
export function calorieAdvice(metrics: BodyMetric[], goal: string | null | undefined, currentAdjustment = 0): CalorieAdvice {
  const current = clamp(Math.round(Number(currentAdjustment) || 0), -MAX_ADJUSTMENT, MAX_ADJUSTMENT);
  const trend = weightTrend(metrics);
  if (!trend) return { status: 'insufficient', trend: null, delta: 0, newAdjustment: current };

  const { min, max, aim } = goalRate(goal);
  if (trend.perWeek >= min && trend.perWeek <= max) return { status: 'on-track', trend, delta: 0, newAdjustment: current };

  const wanted = Math.round(((aim - trend.perWeek) * KCAL_PER_KG) / 7 / 50) * 50;
  const next = clamp(current + clamp(wanted, -MAX_STEP, MAX_STEP), -MAX_ADJUSTMENT, MAX_ADJUSTMENT);
  const delta = next - current;
  if (delta === 0) return { status: 'limit', trend, delta: 0, newAdjustment: current };
  return { status: 'adjust', trend, delta, newAdjustment: next };
}
