import { describe, expect, test } from 'vitest';
import { dayTotals, isOffTarget, planDayFor, planSummary } from './mealPlan';
import type { MealPlan } from '@/types/domain';

const item = (id: string, calories: number, protein = 10) => ({ id, name: id, calories, protein, carbs: 20, fat: 5 });
const plan = (n: number): MealPlan => ({
  id: 'p1', name: 'P', targetCalories: 2000,
  days: Array.from({ length: n }, (_, i) => ({ name: `Ngày ${i + 1}`, meals: { 'Bữa Sáng': [item(`a${i}`, 400)], 'Bữa Trưa': [item(`b${i}`, 600)] } })),
});

describe('planDayFor', () => {
  test('planDayFor cycles short plans: a 3-day plan on Sunday is day 1, on Wednesday day 3', () => {
    expect(planDayFor(plan(3), new Date(2026, 9, 25)).name).toBe('Ngày 1'); // Sunday
    expect(planDayFor(plan(3), new Date(2026, 9, 21)).name).toBe('Ngày 3'); // Wednesday
  });

  test('a 7-day plan follows the weekday, Monday first', () => {
    expect(planDayFor(plan(7), new Date(2026, 9, 19)).name).toBe('Ngày 1'); // Monday
    expect(planDayFor(plan(7), new Date(2026, 9, 25)).name).toBe('Ngày 7'); // Sunday
  });

  test('a 1-day plan is every day', () => {
    expect(planDayFor(plan(1), new Date(2026, 9, 23)).name).toBe('Ngày 1');
  });
});

describe('dayTotals / planSummary', () => {
  test('adds the foods of all meals', () => {
    expect(dayTotals(plan(1).days[0])).toMatchObject({ calories: 1000, protein: 20, carbs: 40, fat: 10 });
  });

  test('planSummary shows the number of days and the average kcal per day', () => {
    expect(planSummary(plan(3))).toBe('3 ngày · ~1000 kcal/ngày');
  });
});

describe('isOffTarget', () => {
  test('more than 15% away from the target is off', () => {
    expect(isOffTarget(2301, 2000)).toBe(true);
    expect(isOffTarget(1600, 2000)).toBe(true);
  });

  test('15% or less, or no target, is fine', () => {
    expect(isOffTarget(2300, 2000)).toBe(false); // exactly 15%
    expect(isOffTarget(2100, 2000)).toBe(false);
    expect(isOffTarget(2100, null)).toBe(false);
    expect(isOffTarget(2100, undefined)).toBe(false);
  });
});
