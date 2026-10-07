import { describe, expect, test } from 'vitest';
import { waterGoalMl, waterGoalGlasses, DEFAULT_WATER_GOAL_ML, MIN_WATER_GOAL_ML, MAX_WATER_GOAL_ML } from './waterGoal';

describe('waterGoalMl', () => {
  test.each([
    [70, 2450],   // 70 * 35 = 2450
    [60, 2100],
    [65, 2300],   // 2275 rounds to the nearest 50 -> 2300
    [58, 2050],   // 2030 -> 2050
  ])('%s kg -> %s ml', (kg, ml) => expect(waterGoalMl(kg)).toBe(ml));

  test('rounds to 50 ml', () => {
    expect(waterGoalMl(71) % 50).toBe(0);
    expect(waterGoalMl(73.3) % 50).toBe(0);
  });

  test('is kept between 1.5 and 4 litres', () => {
    expect(waterGoalMl(30)).toBe(MIN_WATER_GOAL_ML);
    expect(waterGoalMl(43)).toBe(MIN_WATER_GOAL_ML); // 1505 -> 1500
    expect(waterGoalMl(150)).toBe(MAX_WATER_GOAL_ML);
    expect(waterGoalMl(500)).toBe(MAX_WATER_GOAL_ML);
  });

  test('accepts the weight as a string (the profile stores what the form sent)', () => {
    expect(waterGoalMl('70')).toBe(2450);
  });

  test.each([undefined, null, '', 0, -5, 'abc', NaN])('unusable weight %j -> the 2 litre default', (w) => {
    expect(waterGoalMl(w)).toBe(DEFAULT_WATER_GOAL_ML);
  });
});

describe('waterGoalGlasses', () => {
  test('rounds up to whole glasses', () => {
    expect(waterGoalGlasses(2450, 250)).toBe(10);
    expect(waterGoalGlasses(2000, 300)).toBe(7);
  });
  test('an unusable glass size falls back to 250 ml', () => {
    expect(waterGoalGlasses(2000, 0)).toBe(8);
    expect(waterGoalGlasses(2000, NaN)).toBe(8);
  });
});
