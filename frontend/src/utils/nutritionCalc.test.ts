import { describe, expect, test } from 'vitest';
import {
  calcBmr,
  calcBmrDetail,
  calcTdee,
  calcTargetCalories,
  calcGoalAdjustment,
  calcEnergyPlan,
  calcLeanMass,
  goalTargets,
  hasCompleteProfile,
  macroTargets,
  estimateMacros,
  sumMacros,
  normalizePace,
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

  test('no made-up defaults: a missing or invalid measurement means no BMR (0 / null)', () => {
    expect(calcBmr({})).toBe(0);
    expect(calcBmrDetail({})).toBeNull();
    for (const bad of [null, undefined, '', 'abc', 0, -5, NaN]) {
      expect(calcBmrDetail({ ...man, weight: bad })).toBeNull();
      expect(calcBmrDetail({ ...man, height: bad })).toBeNull();
      expect(calcBmrDetail({ ...man, age: bad })).toBeNull();
    }
    expect(hasCompleteProfile(man)).toBe(true);
    expect(hasCompleteProfile({ ...man, age: '' })).toBe(false);
  });

  test('never NaN, even for an empty profile', () => {
    expect(Number.isNaN(calcBmr({}))).toBe(false);
    expect(Number.isNaN(calcTargetCalories({}))).toBe(false);
  });
});

describe('Katch-McArdle when a body fat % is known', () => {
  test('370 + 21.6 x lean mass', () => {
    // 70 kg at 20 % -> 56 kg lean -> 370 + 1209.6 = 1579.6
    expect(calcBmrDetail({ ...man, bodyFat: 20 })).toEqual({ bmr: 1580, formula: 'katch' });
    expect(calcBmrDetail(man)).toEqual({ bmr: 1649, formula: 'mifflin' });
  });

  test('the same for every gender (lean mass already reflects it)', () => {
    expect(calcBmr({ ...woman, bodyFat: 20 })).toBe(1580);
  });

  test('an unusable body fat falls back to Mifflin', () => {
    for (const bodyFat of [null, undefined, '', 0, 1, 71, 'abc']) {
      expect(calcBmrDetail({ ...man, bodyFat })!.formula).toBe('mifflin');
    }
  });

  test('calcLeanMass', () => {
    expect(calcLeanMass(70, 20)).toBe(56);
    expect(calcLeanMass(80, 25.5)).toBe(59.6);
    expect(calcLeanMass(70, null)).toBeNull();
    expect(calcLeanMass(null, 20)).toBeNull();
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

describe('calcEnergyPlan: goal x pace', () => {
  const base = { ...man, activityLevel: 'Vận động vừa' };
  const tdee = 2556; // round(1649 * 1.55)

  test('fat loss: 0.5 / 0.7 / 1 % of body weight per week at 7700 kcal/kg, deficit kept within 500-1000 kcal', () => {
    // slow: 70 * 0.005 * 1100 = 385 -> raised to 500 ; medium: 539 ; fast: 770
    expect(calcEnergyPlan({ ...base, goal: 'Giảm mỡ', goalPace: 'Chậm' })!.target).toBe(tdee - 500);
    expect(calcEnergyPlan({ ...base, goal: 'Giảm mỡ', goalPace: 'Vừa' })!.target).toBe(tdee - 539);
    expect(calcEnergyPlan({ ...base, goal: 'Giảm mỡ', goalPace: 'Nhanh' })!.target).toBe(tdee - 770);
  });

  test('fat loss never asks for more than 1000 kcal/day (about 1 kg/week)', () => {
    const big = { ...base, weight: 150, goal: 'Giảm mỡ', goalPace: 'Nhanh' }; // 150 * 0.01 * 1100 = 1650
    const plan = calcEnergyPlan(big)!;
    expect(plan.goalDelta).toBe(-1000);
    expect(plan.weeklyChangeKg).toBeGreaterThanOrEqual(-1);
  });

  test('muscle gain: +10 / 15 / 20 % of TDEE', () => {
    expect(calcEnergyPlan({ ...base, goal: 'Tăng cơ', goalPace: 'Chậm' })!.goalDelta).toBe(256);
    expect(calcEnergyPlan({ ...base, goal: 'Tăng cơ', goalPace: 'Vừa' })!.goalDelta).toBe(383);
    expect(calcEnergyPlan({ ...base, goal: 'Tăng cơ', goalPace: 'Nhanh' })!.goalDelta).toBe(511);
  });

  test('weight gain: +300 / 400 / 500 kcal', () => {
    expect(['Chậm', 'Vừa', 'Nhanh'].map(goalPace => calcEnergyPlan({ ...base, goal: 'Tăng cân', goalPace })!.goalDelta)).toEqual([300, 400, 500]);
  });

  test.each(['Giữ dáng', 'Sức bền', '', null, undefined, 'goal-from-the-future'])('%j: maintenance = TDEE, no pace', (goal) => {
    const plan = calcEnergyPlan({ ...base, goal, goalPace: 'Nhanh' })!;
    expect(plan.target).toBe(tdee);
    expect(plan.pace).toBeNull();
    expect(plan.weeklyChangeKg).toBe(0);
  });

  test('a missing or unknown pace is "Vừa"', () => {
    expect(normalizePace(undefined)).toBe('Vừa');
    expect(normalizePace('Turbo')).toBe('Vừa');
    expect(calcEnergyPlan({ ...base, goal: 'Giảm mỡ' })!.target).toBe(calcEnergyPlan({ ...base, goal: 'Giảm mỡ', goalPace: 'Vừa' })!.target);
  });

  test('there is no calorie floor: a small person on a fast cut gets the plain result', () => {
    // woman 50 kg, 155 cm, 30 y, sedentary: BMR 1158, TDEE 1390, deficit 550 -> 840
    const small = { weight: 50, height: 155, age: 30, gender: 'Nữ', activityLevel: 'Ít vận động', goal: 'Giảm mỡ', goalPace: 'Nhanh' };
    expect(calcEnergyPlan(small)).toMatchObject({ bmr: 1158, tdee: 1390, target: 840 });
  });

  test('weekly change and weeks to the target weight', () => {
    const plan = calcEnergyPlan({ ...base, goal: 'Giảm mỡ', goalPace: 'Vừa', targetWeight: 65 })!;
    expect(plan.weeklyChangeKg).toBe(-0.49); // -539 * 7 / 7700
    expect(plan.weeksToGoal).toBe(11); // 5 / 0.49 = 10.2 -> 11
  });

  test('no weeks to goal without a target, at maintenance, or when the target is the other way', () => {
    expect(calcEnergyPlan({ ...base, goal: 'Giảm mỡ' })!.weeksToGoal).toBeNull();
    expect(calcEnergyPlan({ ...base, goal: 'Giữ dáng', targetWeight: 65 })!.weeksToGoal).toBeNull();
    expect(calcEnergyPlan({ ...base, goal: 'Giảm mỡ', targetWeight: 80 })!.weeksToGoal).toBeNull();
    expect(calcEnergyPlan({ ...base, goal: 'Tăng cơ', targetWeight: 75 })!.weeksToGoal).toBeGreaterThan(0);
  });

  test('null when the profile is incomplete', () => {
    expect(calcEnergyPlan({ ...base, height: null })).toBeNull();
  });

  test('wrappers agree with the plan, and calcGoalAdjustment is target - TDEE', () => {
    const p = { ...base, goal: 'Giảm mỡ', goalPace: 'Nhanh', calorieAdjustment: 100 };
    const plan = calcEnergyPlan(p)!;
    expect(calcTargetCalories(p)).toBe(plan.target);
    expect(calcTdee(p)).toBe(plan.tdee);
    expect(calcGoalAdjustment(p)).toBe(plan.target - plan.tdee);
  });

  test('goalTargets lists every goal at the profile pace without the advice adjustment', () => {
    const p = { ...base, goal: 'Giảm mỡ', goalPace: 'Vừa', calorieAdjustment: 200 };
    expect(goalTargets(p)).toEqual({ 'Giảm mỡ': tdee - 539, 'Tăng cơ': tdee + 383, 'Tăng cân': tdee + 400, 'Giữ dáng': tdee });
    expect(goalTargets({})).toBeNull();
  });

  test('all pages agree: same profile -> same number, whether numbers are strings or not', () => {
    const profile = { weight: '82', height: '180', age: '41', gender: 'Nam', activityLevel: 'Vận động nhiều', goal: 'Giảm mỡ' };
    expect(calcTargetCalories(profile)).toBe(calcTargetCalories({ ...profile, weight: 82, height: 180, age: 41 }));
  });
});

describe('calorieAdjustment (from the weight-trend advice)', () => {
  const base = { ...man, activityLevel: 'Vận động vừa' };

  test('is added on top of the goal target for every goal', () => {
    for (const goal of ['Giảm mỡ', 'Tăng cơ', 'Giữ dáng', '']) {
      const plain = calcTargetCalories({ ...base, goal });
      expect(calcTargetCalories({ ...base, goal, calorieAdjustment: 150 })).toBe(plain + 150);
      expect(calcTargetCalories({ ...base, goal, calorieAdjustment: -100 })).toBe(plain - 100);
    }
  });

  test('0, null, undefined and junk change nothing', () => {
    const plain = calcTargetCalories({ ...base, goal: 'Giảm mỡ' });
    for (const v of [0, null, undefined, NaN, 'abc' as unknown as number]) {
      expect(calcTargetCalories({ ...base, goal: 'Giảm mỡ', calorieAdjustment: v })).toBe(plain);
    }
  });
});

describe('macroTargets (protein by g/kg and goal, fat 25 %, carbs the rest)', () => {
  const kcal = (m: { protein: number; carbs: number; fat: number }) => m.protein * 4 + m.carbs * 4 + m.fat * 9;

  test('maintenance, 70 kg, 2556 kcal: 1.7 g/kg protein, 25 % fat, the rest carbs', () => {
    expect(macroTargets(2556, { ...man, goal: 'Giữ dáng' })).toEqual({ protein: 119, carbs: 360, fat: 71 });
  });

  test.each([
    ['Sức bền', 98], ['Giữ dáng', 119], ['Tăng cơ', 140], ['Tăng cân', 140], ['Giảm mỡ', 140], ['', 119],
  ])('%j: protein %s g for 70 kg (ISSN 1.4-2.0 g/kg)', (goal, protein) => {
    expect(macroTargets(2500, { ...man, goal }).protein).toBe(protein);
  });

  test('fat loss with a known body fat: 2.3 g per kg of lean mass', () => {
    expect(macroTargets(2000, { ...man, goal: 'Giảm mỡ', bodyFat: 20 }).protein).toBe(129); // 56 * 2.3 = 128.8
  });

  test('protein is capped at 35 % of the calories (AMDR)', () => {
    const m = macroTargets(1000, { ...man, goal: 'Giảm mỡ' }); // 140 g would be 56 %
    expect(m.protein).toBe(88); // 1000 * 0.35 / 4 = 87.5
  });

  test('fat stays within 0.5-1.5 g/kg but never under 20 % of the calories', () => {
    expect(macroTargets(1000, { ...man }).fat).toBe(35); // 27.8 g -> raised to 0.5 g/kg
    expect(macroTargets(3000, { ...man }).fat).toBe(83); // 25 % = 83 g, inside 35-105 g
    // 6000 kcal: 25 % = 167 g -> capped at 1.5 g/kg = 105 g -> but 20 % of the energy (133 g) is the AMDR minimum
    expect(macroTargets(6000, { ...man }).fat).toBe(133);
  });

  test('carbs are never negative and the grams add back up to the calories', () => {
    for (const cal of [800, 1500, 2000, 2556, 3500]) {
      for (const goal of ['Giảm mỡ', 'Tăng cơ', 'Sức bền']) {
        const m = macroTargets(cal, { ...man, goal });
        expect(m.carbs).toBeGreaterThanOrEqual(0);
        if (m.carbs > 0) expect(Math.abs(kcal(m) - cal)).toBeLessThanOrEqual(10);
      }
    }
  });

  test('without a usable weight it falls back to the 30/50/20 estimate', () => {
    expect(macroTargets(2000)).toEqual(estimateMacros(2000));
    expect(macroTargets(2000, { weight: null })).toEqual({ protein: 150, carbs: 250, fat: 44 });
    expect(macroTargets(0, man)).toEqual({ protein: 0, carbs: 0, fat: 0 });
  });
});

describe('sumMacros', () => {
  test('empty list -> zeros', () => {
    expect(sumMacros([])).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0, estimatedCalories: 0 });
  });

  test('uses the real macros of items that have them', () => {
    const items = [
      { calories: 450, protein: 22, carbs: 55, fat: 12 },
      { calories: 220, protein: 46, carbs: 0, fat: 3.6 },
    ];
    expect(sumMacros(items)).toEqual({ calories: 670, protein: 68, carbs: 55, fat: 16, estimatedCalories: 0 }); // 15.6 -> 16
  });

  test('items without macros are estimated from their calories and counted in estimatedCalories', () => {
    expect(sumMacros([{ calories: 400 }])).toEqual({ calories: 400, protein: 30, carbs: 50, fat: 9, estimatedCalories: 400 });
    expect(sumMacros([{ calories: 400, protein: null, carbs: null, fat: null }]).estimatedCalories).toBe(400);
  });

  test('mixes real and estimated items', () => {
    const r = sumMacros([{ calories: 450, protein: 22, carbs: 55, fat: 12 }, { calories: 400 }]);
    expect(r).toEqual({ calories: 850, protein: 52, carbs: 105, fat: 21, estimatedCalories: 400 });
  });

  test('explicit zeros are real data (black coffee), not a reason to estimate', () => {
    expect(sumMacros([{ calories: 5, protein: 0, carbs: 0, fat: 0 }])).toEqual({ calories: 5, protein: 0, carbs: 0, fat: 0, estimatedCalories: 0 });
  });

  test('an item with only some macros counts the missing ones as 0', () => {
    expect(sumMacros([{ calories: 100, protein: 10 }])).toMatchObject({ calories: 100, protein: 10, carbs: 0, fat: 0 });
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
