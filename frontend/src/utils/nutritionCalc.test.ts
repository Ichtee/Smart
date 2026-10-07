import { describe, expect, test } from 'vitest';
import {
  calcBmr,
  calcTdee,
  calcTargetCalories,
  calcGoalAdjustment,
  macroTargets,
  sumMacros,
  ACTIVITY_MULTIPLIERS,
} from './nutritionCalc';

// 70 kg, 175 cm, 30 y: base = 10*70 + 6.25*175 - 5*30 = 1643.75
const man = { weight: 70, height: 175, age: 30, gender: 'Nam' };
const woman = { ...man, gender: 'Nữ' };

describe('calcBmr (Mifflin-St Jeor)', () => {
  test('male adds 5, female subtracts 161', () => {
    expect(calcBmr(man)).toBe(1649); // 1643.75 + 5 = 1648.75
    expect(calcBmr(woman)).toBe(1483); // 1643.75 - 161 = 1482.75
  });

  test('only "Nữ" gets the female constant: unknown / empty / other gender is treated like male, everywhere', () => {
    for (const gender of ['', 'Khác', null, undefined]) {
      expect(calcBmr({ ...man, gender })).toBe(1649);
    }
  });

  test('numbers may arrive as strings (form state, JSON)', () => {
    expect(calcBmr({ weight: '70', height: '175', age: '30', gender: 'Nam' })).toBe(1649);
  });

  test('missing or invalid measurements fall back to the same defaults on every page (65 kg, 170 cm, 25 y)', () => {
    const expected = calcBmr({ weight: 65, height: 170, age: 25, gender: 'Nam' });
    expect(calcBmr({})).toBe(expected);
    for (const bad of [null, undefined, '', 'abc', 0, -5, NaN]) {
      expect(calcBmr({ weight: bad, height: bad, age: bad, gender: 'Nam' })).toBe(expected);
    }
  });

  test('one bad value only replaces that value', () => {
    expect(calcBmr({ ...man, age: 0 })).toBe(calcBmr({ ...man, age: 25 }));
    expect(calcBmr({ ...man, weight: null })).toBe(calcBmr({ ...man, weight: 65 }));
  });

  test('never NaN, even for an empty profile', () => {
    expect(Number.isNaN(calcBmr({}))).toBe(false);
  });
});

describe('calcTdee', () => {
  test.each([
    ['Ít vận động', 1.2],
    ['Vận động nhẹ', 1.375],
    ['Vận động vừa', 1.55],
    ['Vận động nhiều', 1.725],
    ['Vận động cực nhiều', 1.9],
  ])('%s multiplies BMR by %s', (activityLevel, mult) => {
    expect(calcTdee({ ...man, activityLevel })).toBe(Math.round(1649 * mult));
  });

  test('unknown, empty or missing activity level means sedentary (1.2)', () => {
    const sedentary = Math.round(1649 * 1.2);
    for (const activityLevel of ['', 'Siêu nhân', null, undefined]) {
      expect(calcTdee({ ...man, activityLevel })).toBe(sedentary);
    }
  });

  test('the multiplier table covers exactly the five levels the forms offer', () => {
    expect(Object.keys(ACTIVITY_MULTIPLIERS)).toEqual([
      'Ít vận động', 'Vận động nhẹ', 'Vận động vừa', 'Vận động nhiều', 'Vận động cực nhiều',
    ]);
  });
});

describe('calcTargetCalories / calcGoalAdjustment', () => {
  const base = { ...man, activityLevel: 'Vận động vừa' };
  const tdee = calcTdee(base);

  test('fat loss: 500 kcal below TDEE', () => {
    expect(calcTargetCalories({ ...base, goal: 'Giảm mỡ' })).toBe(tdee - 500);
    expect(calcGoalAdjustment({ ...base, goal: 'Giảm mỡ' })).toBe(-500);
  });

  test.each(['Tăng cơ', 'Tăng cân'])('%s: 300 kcal above TDEE', (goal) => {
    expect(calcTargetCalories({ ...base, goal })).toBe(tdee + 300);
    expect(calcGoalAdjustment({ ...base, goal })).toBe(300);
  });

  test.each(['Giữ dáng', '', null, undefined, 'goal-from-the-future'])('%j: maintenance = TDEE', (goal) => {
    expect(calcTargetCalories({ ...base, goal })).toBe(tdee);
    expect(calcGoalAdjustment({ ...base, goal })).toBe(0);
  });

  test('a deficit never goes below 1200 kcal', () => {
    const small = { weight: 40, height: 140, age: 60, gender: 'Nữ', activityLevel: 'Ít vận động', goal: 'Giảm mỡ' };
    expect(calcTdee(small)).toBeLessThan(1700); // sanity: TDEE - 500 would be well under the floor
    expect(calcTargetCalories(small)).toBe(1200);
    // the adjustment is simply target - TDEE, so with the floor it is smaller than -500
    expect(calcGoalAdjustment(small)).toBe(1200 - calcTdee(small));
  });

  test('the floor does not apply to maintenance or surplus goals', () => {
    const small = { weight: 40, height: 140, age: 60, gender: 'Nữ', activityLevel: 'Ít vận động' };
    expect(calcTargetCalories({ ...small, goal: 'Giữ dáng' })).toBe(calcTdee(small));
    expect(calcTargetCalories({ ...small, goal: 'Tăng cơ' })).toBe(calcTdee(small) + 300);
  });

  test('all pages agree: same profile -> same number (the original bug had three different formulas)', () => {
    const profile = { weight: '82', height: '180', age: '41', gender: 'Nam', activityLevel: 'Vận động nhiều', goal: 'Giảm mỡ' };
    expect(calcTargetCalories(profile)).toBe(calcTargetCalories({ ...profile, weight: 82, height: 180, age: 41 }));
  });
});

describe('macroTargets', () => {
  test('30% protein, 50% carbs, 20% fat of the calories (4/4/9 kcal per gram)', () => {
    expect(macroTargets(2000)).toEqual({ protein: 150, carbs: 250, fat: 44 });
    expect(macroTargets(0)).toEqual({ protein: 0, carbs: 0, fat: 0 });
  });

  test('the grams add back up to about the calories', () => {
    const m = macroTargets(2400);
    expect(m.protein * 4 + m.carbs * 4 + m.fat * 9).toBeGreaterThan(2390);
    expect(m.protein * 4 + m.carbs * 4 + m.fat * 9).toBeLessThan(2410);
  });
});

describe('sumMacros', () => {
  test('empty list -> zeros', () => {
    expect(sumMacros([])).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  test('uses the real macros of items that have them', () => {
    const items = [
      { calories: 450, protein: 22, carbs: 55, fat: 12 },
      { calories: 220, protein: 46, carbs: 0, fat: 3.6 },
    ];
    expect(sumMacros(items)).toEqual({ calories: 670, protein: 68, carbs: 55, fat: 16 }); // 15.6 -> 16
  });

  test('items logged before macros existed fall back to the 30/50/20 split of their calories', () => {
    expect(sumMacros([{ calories: 400 }])).toEqual({ calories: 400, protein: 30, carbs: 50, fat: 9 });
  });

  test('mixes real and estimated items', () => {
    const r = sumMacros([{ calories: 450, protein: 22, carbs: 55, fat: 12 }, { calories: 400 }]);
    expect(r).toEqual({ calories: 850, protein: 52, carbs: 105, fat: 21 });
  });

  test('explicit zeros are real data (black coffee), not a reason to estimate', () => {
    expect(sumMacros([{ calories: 5, protein: 0, carbs: 0, fat: 0 }])).toEqual({ calories: 5, protein: 0, carbs: 0, fat: 0 });
  });

  test('an item with only some macros counts the missing ones as 0', () => {
    expect(sumMacros([{ calories: 100, protein: 10 }])).toEqual({ calories: 100, protein: 10, carbs: 0, fat: 0 });
  });

  test('missing calories count as 0 and never produce NaN', () => {
    const r = sumMacros([{}, { calories: 100, protein: 5, carbs: 5, fat: 5 }]);
    expect(r.calories).toBe(100);
    expect(Object.values(r).some(Number.isNaN)).toBe(false);
  });

  test('rounds once at the end, so small items still add up', () => {
    const items = Array.from({ length: 10 }, () => ({ calories: 10, protein: 0.4, carbs: 0.4, fat: 0.4 }));
    expect(sumMacros(items)).toMatchObject({ protein: 4, carbs: 4, fat: 4 });
  });
});

describe('calorieAdjustment (from the weight-trend advice)', () => {
  const base = { ...man, activityLevel: 'Vận động vừa' };
  const tdee = calcTdee(base);

  test('is added on top of the goal target for every goal', () => {
    expect(calcTargetCalories({ ...base, goal: 'Giảm mỡ', calorieAdjustment: 150 })).toBe(tdee - 500 + 150);
    expect(calcTargetCalories({ ...base, goal: 'Tăng cơ', calorieAdjustment: -100 })).toBe(tdee + 300 - 100);
    expect(calcTargetCalories({ ...base, goal: 'Giữ dáng', calorieAdjustment: 50 })).toBe(tdee + 50);
    expect(calcTargetCalories({ ...base, calorieAdjustment: -50 })).toBe(tdee - 50);
  });

  test('0, null, undefined and junk change nothing', () => {
    const plain = calcTargetCalories({ ...base, goal: 'Giảm mỡ' });
    for (const v of [0, null, undefined, NaN, 'abc' as unknown as number]) {
      expect(calcTargetCalories({ ...base, goal: 'Giảm mỡ', calorieAdjustment: v })).toBe(plain);
    }
  });

  test('never drops below 1200 kcal, and the displayed goal adjustment includes it', () => {
    const small = { weight: 40, height: 150, age: 60, gender: 'Nữ', activityLevel: 'Ít vận động', goal: 'Giảm mỡ', calorieAdjustment: -300 };
    expect(calcTargetCalories(small)).toBe(1200);
    expect(calcGoalAdjustment({ ...base, goal: 'Giữ dáng', calorieAdjustment: 100 })).toBe(100);
  });
});
