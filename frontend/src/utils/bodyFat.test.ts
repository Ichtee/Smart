import { describe, expect, test } from 'vitest';
import { navyBodyFat, bodyFatCategory, bodyFatSummary } from './bodyFat';
import type { BodyMetric } from './bodyMetrics';

describe('navyBodyFat (Hodgdon & Beckett 1984)', () => {
  test('men: waist, neck and height', () => {
    // 495 / (1.0324 - 0.19077*log10(47) + 0.15456*log10(175)) - 450 = 16.9
    expect(navyBodyFat({ gender: 'Nam', height: 175, waist: 85, neck: 38 })).toBe(16.9);
  });

  test('women: waist + hip - neck and height', () => {
    // density = 1.29579 - 0.35004*log10(130) + 0.221*log10(160) = 1.04294 ; 495 / 1.04294 - 450 = 24.6
    expect(navyBodyFat({ gender: 'Nữ', height: 160, waist: 72, hip: 92, neck: 34 })).toBe(24.6);
  });

  test('strings from the form work', () => {
    expect(navyBodyFat({ gender: 'Nam', height: '175', waist: '85', neck: '38' })).toBe(16.9);
  });

  test('a missing measurement, an unknown gender or impossible numbers give null', () => {
    expect(navyBodyFat({ gender: 'Nam', height: 175, waist: 85 })).toBeNull();
    expect(navyBodyFat({ gender: 'Nữ', height: 160, waist: 72, neck: 34 })).toBeNull(); // no hip
    expect(navyBodyFat({ gender: 'Khác', height: 175, waist: 85, neck: 38 })).toBeNull();
    expect(navyBodyFat({ gender: 'Nam', height: 175, waist: 38, neck: 38 })).toBeNull(); // log10(0)
    expect(navyBodyFat({ gender: 'Nam', height: 175, waist: 40, neck: 38 })).toBeNull(); // far under 2 %
  });
});

describe('bodyFatCategory (ACE)', () => {
  test.each([
    ['Nam', 4, 'Mỡ thiết yếu'], ['Nam', 6, 'Vận động viên'], ['Nam', 14, 'Thể hình tốt'], ['Nam', 18, 'Trung bình'], ['Nam', 25, 'Béo phì'],
    ['Nữ', 12, 'Mỡ thiết yếu'], ['Nữ', 14, 'Vận động viên'], ['Nữ', 21, 'Thể hình tốt'], ['Nữ', 25, 'Trung bình'], ['Nữ', 32, 'Béo phì'],
  ])('%s %s%% is "%s"', (gender, bf, label) => {
    expect(bodyFatCategory(bf as number, gender as string)).toBe(label);
  });
});

describe('bodyFatSummary', () => {
  const m = (date: string, weight: number, bodyFat: number | null): BodyMetric => ({ date, weight, bodyFat, waist: null });

  test('null without any body fat', () => {
    expect(bodyFatSummary([])).toBeNull();
    expect(bodyFatSummary([m('2026-01-01', 70, null)])).toBeNull();
  });

  test('latest lean and fat mass, change since the first measurement that has a body fat', () => {
    const s = bodyFatSummary([m('2026-01-01', 80, 25), m('2026-01-08', 79, null), m('2026-02-01', 76, 22)]);
    expect(s).toEqual({ latest: { date: '2026-02-01', bodyFat: 22, leanMass: 59.3, fatMass: 16.7 }, change: -3 });
  });

  test('a single measurement has no change', () => {
    expect(bodyFatSummary([m('2026-01-01', 70, 20)])!.change).toBeNull();
  });
});
