import type { MealItem } from './types';

export const MEAL_CATEGORIES = ['Bữa Sáng', 'Bữa Trưa', 'Bữa Tối', 'Ăn Vặt'] as const;

/**
 * Copies every item of another day's meals into `current` ("same as yesterday"). Items get fresh ids so
 * removing one on today never touches the source, and nothing already logged today is replaced.
 * Entries that are not usable items (corrupt log data) are skipped.
 */
export function mergeCopiedMeals(
  current: Record<string, MealItem[]>,
  source: Record<string, unknown> | null | undefined,
  idSeed: number = Date.now(),
): { meals: Record<string, MealItem[]>; added: number } {
  const meals: Record<string, MealItem[]> = {};
  for (const c of MEAL_CATEGORIES) meals[c] = [...(current[c] || [])];

  let added = 0;
  for (const category of MEAL_CATEGORIES) {
    const items = source?.[category];
    if (!Array.isArray(items)) continue;
    for (const raw of items) {
      if (!raw || typeof raw !== 'object') continue;
      const it = raw as MealItem;
      if (typeof it.name !== 'string' || !it.name || !Number.isFinite(Number(it.calories))) continue;
      meals[category].push({ ...it, calories: Number(it.calories), id: `${idSeed}-${added}` });
      added++;
    }
  }
  return { meals, added };
}

/** The calendar day before a YYYY-MM-DD date, in local time (no UTC shift). */
export function previousDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const prev = new Date(y, m - 1, d - 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
}
