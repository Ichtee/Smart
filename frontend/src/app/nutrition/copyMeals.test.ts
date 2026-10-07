import { describe, expect, test } from 'vitest';
import { mergeCopiedMeals, previousDay } from './copyMeals';

const item = (id: string, name: string, calories: number, extra = {}) => ({ id, name, calories, ...extra });

describe('mergeCopiedMeals', () => {
  test('copies items into the same meal with fresh ids', () => {
    const source = { 'Bữa Sáng': [item('a', 'Phở bò', 450, { quantity: '1 tô', protein: 20 })], 'Bữa Tối': [item('b', 'Cơm', 300)] };
    const { meals, added } = mergeCopiedMeals({}, source, 1000);
    expect(added).toBe(2);
    expect(meals['Bữa Sáng']).toEqual([{ id: '1000-0', name: 'Phở bò', calories: 450, quantity: '1 tô', protein: 20 }]);
    expect(meals['Bữa Tối'][0]).toMatchObject({ id: '1000-1', name: 'Cơm' });
    expect(meals['Bữa Trưa']).toEqual([]);
    expect(meals['Ăn Vặt']).toEqual([]);
  });

  test('keeps what is already logged and adds after it', () => {
    const today = { 'Bữa Sáng': [item('x', 'Trứng', 150)] };
    const { meals } = mergeCopiedMeals(today, { 'Bữa Sáng': [item('a', 'Bánh mì', 250)] }, 5);
    expect(meals['Bữa Sáng'].map(i => i.name)).toEqual(['Trứng', 'Bánh mì']);
    expect(meals['Bữa Sáng'][0].id).toBe('x');
  });

  test('ids are unique even for many items copied in the same millisecond', () => {
    const source = { 'Bữa Sáng': [item('1', 'A', 1), item('2', 'B', 2)], 'Bữa Trưa': [item('3', 'C', 3)] };
    const ids = Object.values(mergeCopiedMeals({}, source, 7).meals).flat().map(i => i.id);
    expect(new Set(ids).size).toBe(3);
  });

  test('does not change its inputs', () => {
    const today = { 'Bữa Sáng': [item('x', 'Trứng', 150)] };
    const source = { 'Bữa Sáng': [item('a', 'Bánh mì', 250)] };
    const snapshot = JSON.stringify([today, source]);
    mergeCopiedMeals(today, source, 1);
    expect(JSON.stringify([today, source])).toBe(snapshot);
  });

  test('an empty or missing source adds nothing', () => {
    for (const source of [null, undefined, {}, { 'Bữa Sáng': [] }]) {
      expect(mergeCopiedMeals({}, source, 1).added).toBe(0);
    }
  });

  test('skips corrupt entries and unknown meal names', () => {
    const source = {
      'Bữa Sáng': [null, 'x', { name: '', calories: 10 }, { name: 'No kcal' }, { name: 'Bad', calories: 'abc' }, item('ok', 'Good', '120' as unknown as number)],
      'Bữa Phụ': [item('z', 'Ignored', 10)],
      'Ăn Vặt': 'not-a-list',
    };
    const { meals, added } = mergeCopiedMeals({}, source, 1);
    expect(added).toBe(1);
    expect(meals['Bữa Sáng']).toEqual([{ id: '1-0', name: 'Good', calories: 120 }]);
    expect(Object.keys(meals)).toEqual(['Bữa Sáng', 'Bữa Trưa', 'Bữa Tối', 'Ăn Vặt']);
  });
});

describe('previousDay', () => {
  test.each([
    ['2026-03-15', '2026-03-14'],
    ['2026-03-01', '2026-02-28'],
    ['2024-03-01', '2024-02-29'],
    ['2026-01-01', '2025-12-31'],
  ])('%s -> %s', (d, p) => expect(previousDay(d)).toBe(p));
});
