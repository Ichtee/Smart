// Shared types for the nutrition page and its components.

export interface MealItem {
  id: string;
  name: string;
  calories: number;
  quantity?: string;
  image?: string;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface DbFood {
  _id: string;
  name: string;
  servingSize: string;
  calories: number;
  category?: string;
  image?: string;
  isCustom?: boolean;
  /** null when unknown (the food was saved without macros) */
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

type Macro = number | null | undefined;

/** Macros of one serving, or null when the food has none (it is then estimated from its calories). */
export const foodMacros = (f: { protein?: Macro; carbs?: Macro; fat?: Macro }) =>
  f.protein == null && f.carbs == null && f.fat == null
    ? null
    : { protein: f.protein ?? 0, carbs: f.carbs ?? 0, fat: f.fat ?? 0 };
