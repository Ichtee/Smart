import { describe, expect, test } from 'vitest';
import { calorieAdvice, goalRate, weightTrend, MAX_ADJUSTMENT } from './calorieAdvice';
import type { BodyMetric } from './bodyMetrics';

const day = (offset: number) => new Date(Date.UTC(2026, 5, 1 + offset)).toISOString().slice(0, 10);
const m = (offset: number, weight: number): BodyMetric => ({ date: day(offset), weight, bodyFat: null, waist: null });
/** A weigh-in every 3 days for `days` days, moving `perWeek` kg per week. */
const series = (perWeek: number, days = 21, start = 70): BodyMetric[] => {
  const out: BodyMetric[] = [];
  for (let d = 0; d <= days; d += 3) out.push(m(d, start + (perWeek / 7) * d));
  return out;
};

describe('weightTrend', () => {
  test('no data, too few entries or too short a span give null', () => {
    expect(weightTrend([])).toBeNull();
    expect(weightTrend([m(0, 70), m(7, 70), m(14, 70)])).toBeNull(); // 3 entries
    expect(weightTrend([m(0, 70), m(3, 70), m(6, 70), m(13, 70)])).toBeNull(); // 13 days
  });

  test('exactly 4 entries over exactly 14 days is enough', () => {
    expect(weightTrend([m(0, 70), m(5, 70), m(9, 70), m(14, 70)])).toMatchObject({ entries: 4, spanDays: 14, perWeek: 0 });
  });

  test('measures a steady loss and a steady gain in kg per week', () => {
    expect(weightTrend(series(-0.5))?.perWeek).toBe(-0.5);
    expect(weightTrend(series(0.3))?.perWeek).toBe(0.3);
  });

  test('uses a fitted line, so one noisy weigh-in does not dominate', () => {
    const noisy = series(0, 27).map((p, i) => (i === 4 ? { ...p, weight: p.weight + 1 } : p));
    expect(Math.abs(weightTrend(noisy)!.perWeek)).toBeLessThan(0.3);
  });

  test('only the last 28 days count: an old 27-day-old point is in, a 28-day-old one is out', () => {
    const base = [m(0, 90), m(1, 70), m(10, 70), m(20, 70), m(28, 70)];
    // m(0) is 28 days before the latest -> excluded; the rest are flat
    expect(weightTrend(base)).toMatchObject({ entries: 4, perWeek: 0 });
    const inside = [m(1, 90), m(2, 70), m(10, 70), m(20, 70), m(28, 70)]; // 27 days -> included
    expect(weightTrend(inside)!.entries).toBe(5);
  });

  test('x follows real dates: unevenly spaced entries give the true slope', () => {
    // 1 kg lost over 14 days = -0.5 / week, with entries bunched at both ends
    expect(weightTrend([0, 1, 2, 12, 13, 14].map(d => m(d, 70 - d / 14)))?.perWeek).toBe(-0.5);
  });

  test('works on the day the weights are all equal (no division by zero)', () => {
    expect(weightTrend(series(0))!.perWeek).toBe(0);
  });
});

describe('goalRate', () => {
  test('cutting wants a loss, building a gain, anything else stable', () => {
    expect(goalRate('Giảm mỡ')).toEqual({ min: -0.75, max: -0.25, aim: -0.5 });
    expect(goalRate('Tăng cơ')).toEqual({ min: 0.1, max: 0.5, aim: 0.25 });
    expect(goalRate('Tăng cân')).toEqual(goalRate('Tăng cơ'));
    for (const g of ['Giữ dáng', 'Sức bền', '', null, undefined, 'xyz']) expect(goalRate(g)).toEqual({ min: -0.25, max: 0.25, aim: 0 });
  });
});

describe('calorieAdvice', () => {
  test('too little data: insufficient and the adjustment is unchanged', () => {
    expect(calorieAdvice([m(0, 70)], 'Giảm mỡ', 100)).toEqual({ status: 'insufficient', trend: null, delta: 0, newAdjustment: 100 });
  });

  test('inside the goal band: on track, nothing to change', () => {
    const a = calorieAdvice(series(-0.5), 'Giảm mỡ', 0);
    expect(a).toMatchObject({ status: 'on-track', delta: 0, newAdjustment: 0 });
    expect(calorieAdvice(series(-0.25), 'Giảm mỡ').status).toBe('on-track'); // band edges count as on track
    expect(calorieAdvice(series(-0.75), 'Giảm mỡ').status).toBe('on-track');
    expect(calorieAdvice(series(0.1), 'Tăng cơ').status).toBe('on-track');
    expect(calorieAdvice(series(0.5), 'Tăng cơ').status).toBe('on-track');
    expect(calorieAdvice(series(0.2), 'Giữ dáng').status).toBe('on-track');
  });

  test('cutting but not losing: eat less, in steps of 50 kcal', () => {
    const a = calorieAdvice(series(0), 'Giảm mỡ', 0);
    expect(a.status).toBe('adjust');
    expect(a.delta).toBe(-250); // 0.5 kg/week * 1100 = 550 -> capped at one step of 250
    expect(a.newAdjustment).toBe(-250);
    const small = calorieAdvice(series(-0.1), 'Giảm mỡ', 0); // 0.4 * 1100 = 440 -> still capped
    expect(small.delta).toBe(-250);
  });

  test('losing too fast on a cut: eat more', () => {
    const a = calorieAdvice(series(-1.0), 'Giảm mỡ', -200);
    expect(a.status).toBe('adjust');
    expect(a.delta).toBe(+250);
    expect(a.newAdjustment).toBe(50);
  });

  test('gaining too slowly when building: eat more; gaining too fast: eat less', () => {
    expect(calorieAdvice(series(0), 'Tăng cơ')).toMatchObject({ status: 'adjust', delta: 250, newAdjustment: 250 });
    const fast = calorieAdvice(series(0.6), 'Tăng cơ', 100);
    expect(fast.status).toBe('adjust');
    expect(fast.delta).toBeLessThan(0);
    expect(Math.abs(fast.delta) % 50).toBe(0);
  });

  test('maintaining but drifting: pulls back toward zero change', () => {
    expect(calorieAdvice(series(0.5), 'Giữ dáng')).toMatchObject({ status: 'adjust', delta: -250 });
    expect(calorieAdvice(series(-0.5), '')).toMatchObject({ status: 'adjust', delta: 250 });
  });

  test('the delta is a multiple of 50 and never larger than 250', () => {
    for (const rate of [-1.2, -0.9, -0.1, 0.05, 0.3, 0.7, 1.5]) {
      for (const goal of ['Giảm mỡ', 'Tăng cơ', 'Giữ dáng']) {
        const { delta } = calorieAdvice(series(rate), goal);
        expect(Math.abs(delta)).toBeLessThanOrEqual(250);
        expect(Math.abs(delta) % 50).toBe(0);
      }
    }
  });

  test('a small gap gives a small step (not always the maximum)', () => {
    // maintain, trend +0.3 kg/week: aim 0 -> 0.3 * 1100 = 330 -> 300 -> capped 250 ; use a goal with a nearer miss
    // build, trend +0.06: aim 0.25 -> 0.19 * 1100 = 209 -> rounds to 200
    expect(calorieAdvice(series(0.06), 'Tăng cơ').delta).toBe(200);
    // build, trend +0.08: gap 0.17 kg/week * 1100 kcal = 187 -> 200 (a 7000 kcal/kg constant would give 150)
    expect(calorieAdvice(series(0.08), 'Tăng cơ').delta).toBe(200);
  });

  test('never goes beyond the +-500 limit; at the limit the status is "limit"', () => {
    const near = calorieAdvice(series(0), 'Giảm mỡ', -400);
    expect(near).toMatchObject({ status: 'adjust', delta: -100, newAdjustment: -500 });
    const atLimit = calorieAdvice(series(0), 'Giảm mỡ', -500);
    expect(atLimit).toMatchObject({ status: 'limit', delta: 0, newAdjustment: -500 });
    expect(calorieAdvice(series(0), 'Tăng cơ', 500)).toMatchObject({ status: 'limit', newAdjustment: 500 });
    expect(MAX_ADJUSTMENT).toBe(500);
  });

  test('a junk or out-of-range current adjustment is sanitised', () => {
    expect(calorieAdvice(series(-0.5), 'Giảm mỡ', NaN).newAdjustment).toBe(0);
    expect(calorieAdvice(series(-0.5), 'Giảm mỡ', 9999).newAdjustment).toBe(500);
    expect(calorieAdvice(series(-0.5), 'Giảm mỡ', -9999).newAdjustment).toBe(-500);
    expect(calorieAdvice(series(-0.5), 'Giảm mỡ', 12.4).newAdjustment).toBe(12);
  });

  test('exposes the trend so the UI can show it', () => {
    expect(calorieAdvice(series(-0.5), 'Giảm mỡ').trend).toMatchObject({ perWeek: -0.5, entries: 8, spanDays: 21 });
  });
});
