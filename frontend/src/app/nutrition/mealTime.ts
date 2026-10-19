import type { MEAL_CATEGORIES } from './copyMeals';

export type MealCategory = (typeof MEAL_CATEGORIES)[number];

/** The meal the user is most likely logging at this hour (the add-food form opens on it; they can switch). */
export const mealForHour = (hour: number): MealCategory =>
  hour < 10 ? 'Bữa Sáng' : hour < 14 ? 'Bữa Trưa' : hour < 17 ? 'Ăn Vặt' : hour < 22 ? 'Bữa Tối' : 'Ăn Vặt';
