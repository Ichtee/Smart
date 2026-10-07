import { describe, expect, test } from 'vitest';
import { chartPoints, metricBody, pointsToPath, summarize, validateMetricForm, type BodyMetric } from './bodyMetrics';

const m = (date: string, weight: number): BodyMetric => ({ date, weight, bodyFat: null, waist: null });
const form = (over = {}) => ({ weight: '70', bodyFat: '', waist: '', ...over });

describe('validateMetricForm', () => {
  test('accepts a weight alone, and a full entry', () => {
    expect(validateMetricForm(form())).toBeNull();
    expect(validateMetricForm(form({ bodyFat: '18.5', waist: '82' }))).toBeNull();
  });

  test.each(['', '  ', 'abc', '9.9', '500.1', '-70', 'Infinity'])('weight %j is refused', (w) => {
    expect(validateMetricForm(form({ weight: w }))).toContain('Cân nặng');
  });

  test('the weight limits are accepted', () => {
    expect(validateMetricForm(form({ weight: '10' }))).toBeNull();
    expect(validateMetricForm(form({ weight: '500' }))).toBeNull();
  });

  test.each(['1.9', '70.1', 'x'])('body fat %j is refused', (v) => {
    expect(validateMetricForm(form({ bodyFat: v }))).toContain('mỡ');
  });
  test('body fat limits are accepted', () => {
    expect(validateMetricForm(form({ bodyFat: '2' }))).toBeNull();
    expect(validateMetricForm(form({ bodyFat: '70' }))).toBeNull();
  });

  test.each(['29', '251', 'x'])('waist %j is refused', (v) => {
    expect(validateMetricForm(form({ waist: v }))).toContain('eo');
  });
  test('waist limits are accepted', () => {
    expect(validateMetricForm(form({ waist: '30' }))).toBeNull();
    expect(validateMetricForm(form({ waist: '250' }))).toBeNull();
  });
});

describe('metricBody', () => {
  test('sends numbers and leaves out blank optional fields', () => {
    expect(metricBody('2026-05-01', form({ weight: '70.5' }))).toEqual({ date: '2026-05-01', weight: 70.5 });
    expect(metricBody('2026-05-01', form({ bodyFat: '18', waist: '80' }))).toEqual({ date: '2026-05-01', weight: 70, bodyFat: 18, waist: 80 });
  });
});

describe('summarize', () => {
  test('nothing -> null', () => expect(summarize([])).toBeNull());

  test('one measurement: no change yet', () => {
    const s = summarize([m('2026-05-01', 70)])!;
    expect(s.change).toBeNull();
    expect(s.latest.weight).toBe(70);
    expect(s.min).toBe(70);
    expect(s.max).toBe(70);
  });

  test('change is latest minus first, rounded to 0.1', () => {
    const s = summarize([m('2026-05-01', 72.3), m('2026-05-08', 75), m('2026-05-15', 70.1)])!;
    expect(s.change).toBe(-2.2);
    expect(s.first.date).toBe('2026-05-01');
    expect(s.latest.date).toBe('2026-05-15');
    expect(s.min).toBe(70.1);
    expect(s.max).toBe(75);
  });

  test('a gain is positive and floating point noise is rounded away', () => {
    expect(summarize([m('2026-05-01', 70.1), m('2026-05-02', 70.4)])!.change).toBe(0.3);
  });
});

describe('chartPoints', () => {
  test('no data -> no points', () => expect(chartPoints([], 100, 50)).toEqual([]));

  test('a single point is centred', () => {
    expect(chartPoints([m('2026-05-01', 70)], 100, 50)).toEqual([{ date: '2026-05-01', weight: 70, x: 50, y: 25 }]);
  });

  test('x is proportional to the real date gap, spanning the padded width', () => {
    const p = chartPoints([m('2026-05-01', 70), m('2026-05-02', 71), m('2026-05-11', 72)], 120, 60, 10);
    expect(p[0].x).toBe(10);
    expect(p[2].x).toBe(110);
    expect(p[1].x).toBeCloseTo(10 + (1 / 10) * 100, 5);
  });

  test('a heavier weight is higher on screen (smaller y)', () => {
    const p = chartPoints([m('2026-05-01', 70), m('2026-05-02', 80)], 100, 60, 10);
    expect(p[0].y).toBe(50); // the lightest sits at the bottom edge of the padded area
    expect(p[1].y).toBe(10);
  });

  test('a flat history draws a line through the middle', () => {
    const p = chartPoints([m('2026-05-01', 70), m('2026-05-02', 70)], 100, 60);
    expect(p.map(q => q.y)).toEqual([30, 30]);
  });

  test('month boundaries and leap days do not distort the spacing', () => {
    const p = chartPoints([m('2024-02-28', 70), m('2024-03-01', 71), m('2024-03-03', 72)], 100, 50, 0);
    expect(p[1].x).toBe(50); // 2 of 4 days
  });
});

describe('pointsToPath', () => {
  test('moves to the first point and lines to the rest', () => {
    const path = pointsToPath([{ x: 1, y: 2, date: 'a', weight: 1 }, { x: 3.456, y: 4, date: 'b', weight: 2 }]);
    expect(path).toBe('M1.0 2.0 L3.5 4.0');
  });
  test('empty -> empty', () => expect(pointsToPath([])).toBe(''));
});
