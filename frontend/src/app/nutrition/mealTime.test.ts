import { describe, expect, test } from 'vitest';
import { mealForHour } from './mealTime';

describe('mealForHour', () => {
  test.each([
    [0, 'Bữa Sáng'], [7, 'Bữa Sáng'], [9, 'Bữa Sáng'], [10, 'Bữa Trưa'], [12, 'Bữa Trưa'],
    [14, 'Ăn Vặt'], [16, 'Ăn Vặt'], [17, 'Bữa Tối'], [19, 'Bữa Tối'], [21, 'Bữa Tối'], [22, 'Ăn Vặt'], [23, 'Ăn Vặt'],
  ])('at %i o\'clock the meal is %s', (hour, meal) => {
    expect(mealForHour(hour)).toBe(meal);
  });
});
