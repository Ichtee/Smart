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

describe('bmiCategory (IDI & WPRO bands for Asian adults)', () => {
  test.each([
    [10, 'Thiếu cân'], [18.49, 'Thiếu cân'],
    [18.5, 'Bình thường'], [22, 'Bình thường'], [22.9, 'Bình thường'], [22.999, 'Bình thường'],
    [23, 'Thừa cân'], [24, 'Thừa cân'], [24.999, 'Thừa cân'],
    [25, 'Béo phì độ I'], [27, 'Béo phì độ I'], [29.999, 'Béo phì độ I'],
    [30, 'Béo phì độ II'], [35, 'Béo phì độ II'], [60, 'Béo phì độ II'],
  ])('BMI %s is "%s"', (bmi, label) => {
    expect(bmiCategory(bmi).label).toBe(label);
  });

  test('there is no gap: sweeping 10..45 in 0.01 steps only ever yields the five bands, in order', () => {
    const order = ['Thiếu cân', 'Bình thường', 'Thừa cân', 'Béo phì độ I', 'Béo phì độ II'];
    let last = 0;
    for (let bmi = 10; bmi <= 45; bmi += 0.01) {
      const idx = order.indexOf(bmiCategory(bmi).label);
      expect(idx).toBeGreaterThanOrEqual(last); // never goes back down a band
      last = idx;
    }
    expect(last).toBe(4);
  });

  test('each band has its own colour class', () => {
    const colors = [15, 21, 24, 27, 35].map(b => bmiCategory(b).color);
    expect(new Set(colors).size).toBe(5);
    colors.forEach(c => expect(c).toMatch(/^text-/));
  });

  test('a real profile: 70 kg at 175 cm is 22.9 -> normal; 70 kg at 167.5 cm is 24.95 -> overweight for Asian adults', () => {
    expect(bmiCategory(calcBmi(70, 175)).label).toBe('Bình thường');
    expect(bmiCategory(calcBmi(70, 167.5)).label).toBe('Thừa cân');
  });
});
