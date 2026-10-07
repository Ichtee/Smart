import { describe, expect, test } from 'vitest';
import { parseOffNutriments } from './openFoodFacts';

describe('parseOffNutriments (Open Food Facts)', () => {
  test('per 100 g when available: all values and the label come from the 100 g basis', () => {
    const n = {
      'energy-kcal_100g': 64.4, proteins_100g: 3.2, carbohydrates_100g: 4.8, fat_100g: 3.5,
      'energy-kcal_serving': 116, proteins_serving: 5.8, carbohydrates_serving: 8.6, fat_serving: 6.3,
    };
    expect(parseOffNutriments(n, '180 ml')).toEqual({ calories: 64, protein: 3.2, carbs: 4.8, fat: 3.5, servingSize: '100g' });
  });

  test('regression: per-100 g calories are never mixed with per-serving macros', () => {
    // the old code took kcal per 100 g but fell back to per-serving protein when protein_100g was 0
    const n = { 'energy-kcal_100g': 40, proteins_100g: 0, proteins_serving: 7, carbohydrates_100g: 10, fat_100g: 0 };
    expect(parseOffNutriments(n, '250 ml')).toMatchObject({ calories: 40, protein: 0, servingSize: '100g' });
  });

  test('only per serving: uses that basis with the product serving size as the label', () => {
    const n = { 'energy-kcal_serving': 210, proteins_serving: 4, carbohydrates_serving: 30, fat_serving: 8 };
    expect(parseOffNutriments(n, '1 gói (40g)')).toEqual({ calories: 210, protein: 4, carbs: 30, fat: 8, servingSize: '1 gói (40g)' });
    expect(parseOffNutriments(n, null)!.servingSize).toBe('1 phần');
  });

  test('a macro missing on that basis is unknown (null), not 0', () => {
    expect(parseOffNutriments({ 'energy-kcal_100g': 300, fat_100g: 12 })).toEqual({ calories: 300, protein: null, carbs: null, fat: 12, servingSize: '100g' });
  });

  test('no energy value at all, or junk values, give null', () => {
    expect(parseOffNutriments({})).toBeNull();
    expect(parseOffNutriments(null)).toBeNull();
    expect(parseOffNutriments({ proteins_100g: 3 })).toBeNull();
    expect(parseOffNutriments({ 'energy-kcal_100g': 'abc' })).toBeNull();
    expect(parseOffNutriments({ 'energy-kcal_100g': -5 })).toBeNull();
  });
});
