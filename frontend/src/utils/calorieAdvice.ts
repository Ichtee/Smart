// Weight-trend advice: compares how fast the weight really moves with what the goal and pace ask
// for and suggests a small change of the daily calorie target. The static 7700 kcal/kg start value
// overestimates long-term change (Hall 2008/2011), so this feedback loop corrects it. Pure functions, no I/O.
import type { BodyMetric } from './bodyMetrics';
import {
  KCAL_PER_KG, FAT_LOSS_RATE, MAX_LOSS_KG_PER_WEEK, MUSCLE_GAIN_RATE, MUSCLE_GAIN_AIM,
  WEIGHT_GAIN_RATE_KG, WEIGHT_GAIN_SURPLUS, MAINTENANCE_RATE_KG, normalizePace,
} from './nutritionCalc';

export { KCAL_PER_KG };
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

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Healthy weekly change (kg/week) for the goal and pace: the acceptable band and the rate to aim at.
 * Same sources and constants as the calorie target (see nutritionCalc): fat loss 0.5-1 % of body
 * weight/week but at most 1 kg; muscle gain 0.25-0.5 %/week; weight gain 0.25-1 kg/week; otherwise stable.
 * `weight` is the current weight in kg (the band of a %-based goal scales with it).
 */
export function goalRate(goal?: string | null, pace?: string | null, weight = 70): { min: number; max: number; aim: number } {
  const p = normalizePace(pace);
  const w = Number(weight) > 0 ? Number(weight) : 70;
  if (goal === 'Giảm mỡ') {
    const min = Math.max(-FAT_LOSS_RATE['Nhanh'] * w, -MAX_LOSS_KG_PER_WEEK);
    const max = -FAT_LOSS_RATE['Chậm'] * w;
    return { min: r2(min), max: r2(max), aim: r2(Math.min(max, Math.max(min, -FAT_LOSS_RATE[p] * w))) };
  }
  if (goal === 'Tăng cơ') return { min: r2(MUSCLE_GAIN_RATE.min * w), max: r2(MUSCLE_GAIN_RATE.max * w), aim: r2(MUSCLE_GAIN_AIM[p] * w) };
  if (goal === 'Tăng cân') return { ...WEIGHT_GAIN_RATE_KG, aim: r2((WEIGHT_GAIN_SURPLUS[p] * 7) / KCAL_PER_KG) };
  return { ...MAINTENANCE_RATE_KG, aim: 0 };
}

export type AdviceStatus = 'insufficient' | 'on-track' | 'adjust' | 'limit' | 'reached';

export interface CalorieAdvice {
  status: AdviceStatus;
  trend: WeightTrend | null;
  /** kcal/day to add to the current adjustment (0 unless status is "adjust") */
  delta: number;
  /** the adjustment to save when the advice is applied */
  newAdjustment: number;
}

export interface AdviceOptions {
  pace?: string | null;
  targetWeight?: number | string | null;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Whether the latest weight has reached the target weight in the direction of the goal. */
export function targetReached(latestWeight: number, goal: string | null | undefined, targetWeight: unknown): boolean {
  if (targetWeight === null || targetWeight === undefined || targetWeight === '') return false;
  const t = Number(targetWeight);
  if (!Number.isFinite(t) || t <= 0) return false;
  if (goal === 'Giảm mỡ') return latestWeight <= t;
  if (goal === 'Tăng cơ' || goal === 'Tăng cân') return latestWeight >= t;
  return false;
}

/**
 * Whether the real trend fits the goal and pace and, if not, the next calorie adjustment (in steps
 * of 50 kcal, at most MAX_STEP at a time, never beyond +-MAX_ADJUSTMENT in total).
 * "limit": the trend is off but the adjustment is already at its limit.
 * "reached": the latest weight has reached the target weight (time to switch to maintenance).
 */
export function calorieAdvice(metrics: BodyMetric[], goal: string | null | undefined, currentAdjustment = 0, options: AdviceOptions = {}): CalorieAdvice {
  const current = clamp(Math.round(Number(currentAdjustment) || 0), -MAX_ADJUSTMENT, MAX_ADJUSTMENT);
  const latest = metrics.length ? metrics[metrics.length - 1].weight : null;
  const trend = weightTrend(metrics);
  if (latest !== null && targetReached(latest, goal, options.targetWeight)) return { status: 'reached', trend, delta: 0, newAdjustment: current };
  if (!trend) return { status: 'insufficient', trend: null, delta: 0, newAdjustment: current };

  const { min, max, aim } = goalRate(goal, options.pace, latest ?? undefined);
  if (trend.perWeek >= min && trend.perWeek <= max) return { status: 'on-track', trend, delta: 0, newAdjustment: current };

  const wanted = Math.round(((aim - trend.perWeek) * KCAL_PER_KG) / 7 / 50) * 50;
  const next = clamp(current + clamp(wanted, -MAX_STEP, MAX_STEP), -MAX_ADJUSTMENT, MAX_ADJUSTMENT);
  const delta = next - current;
  if (delta === 0) return { status: 'limit', trend, delta: 0, newAdjustment: current };
  return { status: 'adjust', trend, delta, newAdjustment: next };
}
