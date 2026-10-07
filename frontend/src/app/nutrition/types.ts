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
  protein?: number;
  carbs?: number;
  fat?: number;
}
