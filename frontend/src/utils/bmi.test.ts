import { describe, expect, test } from 'vitest';
import { calcBmi, bmiCategory } from './bmi';

describe('calcBmi', () => {
  test('kg / m^2', () => {
    expect(calcBmi(70, 175)).toBeCloseTo(22.857, 3);
    expect(calcBmi(58, 165)).toBeCloseTo(21.304, 3);
    expect(calcBmi(100, 200)).toBe(25);
  });

  test('accepts numeric strings (form state)', () => {
    expect(calcBmi('70', '175')).toBeCloseTo(22.857, 3);
  });

  test.each([
    [null, 170], [undefined, 170], ['', 170], [0, 170], [-5, 170], ['abc', 170], [NaN, 170],
    [70, null], [70, undefined], [70, ''], [70, 0], [70, -170], [70, 'x'], [70, NaN],
  ])('weight %j / height %j is not a BMI: returns 0 so the card can be hidden', (w, h) => {
    expect(calcBmi(w as number, h as number)).toBe(0);
  });

  test('never NaN or Infinity', () => {
    for (const [w, h] of [[0, 0], [70, 0], ['', ''], [NaN, NaN]]) {
      const v = calcBmi(w as number, h as number);
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe('bmiCategory (WHO bands)', () => {
  test.each([
    [10, 'Thiếu cân'], [18.49, 'Thiếu cân'],
    [18.5, 'Bình thường'], [22, 'Bình thường'], [24.9, 'Bình thường'], [24.95, 'Bình thường'], [24.999, 'Bình thường'],
    [25, 'Thừa cân'], [27, 'Thừa cân'], [29.9, 'Thừa cân'], [29.95, 'Thừa cân'], [29.999, 'Thừa cân'],
    [30, 'Béo phì'], [35, 'Béo phì'], [60, 'Béo phì'],
  ])('BMI %s is "%s"', (bmi, label) => {
    expect(bmiCategory(bmi).label).toBe(label);
  });

  test('regression: the old code called 24.9-25 and 29.9-30 "Béo phì" because of gaps between its ranges', () => {
    expect(bmiCategory(24.95).label).not.toBe('Béo phì');
    expect(bmiCategory(29.95).label).not.toBe('Béo phì');
  });

  test('there is no gap: sweeping 10..45 in 0.01 steps only ever yields the four bands, in order', () => {
    const order = ['Thiếu cân', 'Bình thường', 'Thừa cân', 'Béo phì'];
    let last = 0;
    for (let bmi = 10; bmi <= 45; bmi += 0.01) {
      const idx = order.indexOf(bmiCategory(bmi).label);
      expect(idx).toBeGreaterThanOrEqual(last); // never goes back down a band
      expect(idx).toBeGreaterThanOrEqual(0);
      last = idx;
    }
    expect(last).toBe(3);
  });

  test('each band has its own colour class', () => {
    const colors = [15, 22, 27, 35].map(b => bmiCategory(b).color);
    expect(new Set(colors).size).toBe(4);
    colors.forEach(c => expect(c).toMatch(/^text-/));
  });

  test('a real profile: 70 kg at 167.5 cm is 24.95 -> normal weight', () => {
    expect(bmiCategory(calcBmi(70, 167.5)).label).toBe('Bình thường');
  });
});
