import { describe, expect, test } from 'vitest';
import { toDateStr, todayStr, monthRange, monthKey, weekDatesMonToSun, monthAndWeekRange } from './dateUtils';

// Dates are built with the local-time constructor on purpose: these helpers must never go through UTC.
const d = (y: number, m: number, day: number, h = 0, min = 0, s = 0) => new Date(y, m - 1, day, h, min, s);

describe('toDateStr', () => {
  test('pads month and day', () => {
    expect(toDateStr(d(2026, 1, 5))).toBe('2026-01-05');
    expect(toDateStr(d(2026, 12, 31))).toBe('2026-12-31');
  });

  test('uses the local calendar day even just before / after midnight (no UTC shift)', () => {
    expect(toDateStr(d(2026, 10, 7, 0, 0, 1))).toBe('2026-10-07');
    expect(toDateStr(d(2026, 10, 7, 23, 59, 59))).toBe('2026-10-07');
  });

  test('todayStr matches toDateStr(new Date())', () => {
    expect(todayStr()).toBe(toDateStr(new Date()));
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('monthRange / monthKey', () => {
  test('first and last day of the month', () => {
    expect(monthRange(d(2026, 10, 17))).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(monthRange(d(2026, 4, 30))).toEqual({ from: '2026-04-01', to: '2026-04-30' });
    expect(monthRange(d(2026, 12, 1))).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });

  test('February in a leap and a non-leap year', () => {
    expect(monthRange(d(2028, 2, 10)).to).toBe('2028-02-29');
    expect(monthRange(d(2026, 2, 10)).to).toBe('2026-02-28');
  });

  test('monthKey is YYYY-MM', () => {
    expect(monthKey(d(2026, 3, 9))).toBe('2026-03');
    expect(monthKey(d(2026, 11, 30))).toBe('2026-11');
  });
});

describe('weekDatesMonToSun', () => {
  test('a Wednesday gives Monday..Sunday of that week', () => {
    expect(weekDatesMonToSun(d(2026, 10, 7))).toEqual([
      '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11',
    ]);
  });

  test('Monday is the first day and Sunday is the last (not the start of the next week)', () => {
    const week = weekDatesMonToSun(d(2026, 10, 5)); // Monday
    expect(week[0]).toBe('2026-10-05');
    expect(week[6]).toBe('2026-10-11');
    expect(weekDatesMonToSun(d(2026, 10, 11))).toEqual(week); // Sunday belongs to the same week
  });

  test('always seven consecutive days', () => {
    const week = weekDatesMonToSun(d(2026, 2, 27));
    expect(week).toHaveLength(7);
    expect(week[0]).toBe('2026-02-23');
    expect(week[6]).toBe('2026-03-01'); // crosses February -> March
  });

  test('crosses a month boundary', () => {
    const week = weekDatesMonToSun(d(2026, 9, 30));
    expect(week[0]).toBe('2026-09-28');
    expect(week[6]).toBe('2026-10-04');
  });

  test('crosses a year boundary', () => {
    const week = weekDatesMonToSun(d(2027, 1, 1));
    expect(week[0]).toBe('2026-12-28');
    expect(week[6]).toBe('2027-01-03');
  });

  test('does not mutate the date it is given', () => {
    const ref = d(2026, 10, 7);
    weekDatesMonToSun(ref);
    expect(toDateStr(ref)).toBe('2026-10-07');
  });

  test('defaults to the current week', () => {
    expect(weekDatesMonToSun()).toContain(todayStr());
  });
});

describe('monthAndWeekRange', () => {
  test('a mid-month day: the month already covers the whole week', () => {
    expect(monthAndWeekRange(d(2026, 10, 14))).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });

  test('week that starts in the previous month extends the start', () => {
    // Thu 1 Oct 2026: week is Mon 28 Sep .. Sun 4 Oct
    expect(monthAndWeekRange(d(2026, 10, 1))).toEqual({ from: '2026-09-28', to: '2026-10-31' });
  });

  test('week that ends in the next month extends the end', () => {
    // Wed 30 Sep 2026: week is Mon 28 Sep .. Sun 4 Oct
    expect(monthAndWeekRange(d(2026, 9, 30))).toEqual({ from: '2026-09-01', to: '2026-10-04' });
  });

  test('across a year boundary', () => {
    expect(monthAndWeekRange(d(2027, 1, 1))).toEqual({ from: '2026-12-28', to: '2027-01-31' });
  });
});
