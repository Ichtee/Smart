// Reads the nutrition facts of an Open Food Facts product. OFF gives values per 100 g (`*_100g`)
// and sometimes per serving (`*_serving`); the calories, the macros and the serving label must all
// come from the same basis, or multiplying the portion gives wrong numbers.

export interface OffNutrition {
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  servingSize: string;
}

type Nutriments = Record<string, unknown>;

const value = (n: Nutriments, key: string): number | null => {
  const v = n[key];
  if (v === undefined || v === null || v === '') return null;
  const num = Number(v);
  return Number.isFinite(num) && num >= 0 ? num : null;
};

const round1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);

/**
 * Per 100 g when OFF has the energy per 100 g, otherwise per serving (labelled with the product's
 * serving size). Null when neither basis has an energy value. A macro missing on that basis is null
 * (unknown), not 0.
 */
export function parseOffNutriments(nutriments: Nutriments | null | undefined, servingSize?: string | null): OffNutrition | null {
  const n = nutriments || {};
  for (const basis of ['100g', 'serving'] as const) {
    const kcal = value(n, `energy-kcal_${basis}`);
    if (kcal === null) continue;
    return {
      calories: Math.round(kcal),
      protein: round1(value(n, `proteins_${basis}`)),
      carbs: round1(value(n, `carbohydrates_${basis}`)),
      fat: round1(value(n, `fat_${basis}`)),
      servingSize: basis === '100g' ? '100g' : (servingSize || '1 phần'),
    };
  }
  return null;
}
