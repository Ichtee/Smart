// Validation for a meal plan (thực đơn) before it is saved. Foods go through the same sanitizer as the
// nutrition log, so a plan can never hold negative calories, huge lists or unknown meal keys.
const { sanitizeMeals } = require('./nutrition');

const MAX_MEAL_PLANS_PER_USER = 10;
const MAX_PLAN_DAYS = 7;
const MIN_TARGET_CALORIES = 800;
const MAX_TARGET_CALORIES = 6000;

const text = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');

// -> { plan: { name, description, targetCalories, days } } or { error }
const cleanMealPlan = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'Thực đơn không hợp lệ.' };

  const name = text(raw.name);
  if (name.length < 1 || name.length > 100) return { error: 'Tên thực đơn cần từ 1 đến 100 ký tự.' };

  const description = text(raw.description);
  if (description.length > 300) return { error: 'Mô tả tối đa 300 ký tự.' };

  let targetCalories = null;
  if (raw.targetCalories !== undefined && raw.targetCalories !== null) {
    const t = raw.targetCalories;
    if (!Number.isInteger(t) || t < MIN_TARGET_CALORIES || t > MAX_TARGET_CALORIES) {
      return { error: `Calo mục tiêu phải là số nguyên từ ${MIN_TARGET_CALORIES} đến ${MAX_TARGET_CALORIES}.` };
    }
    targetCalories = t;
  }

  if (!Array.isArray(raw.days) || raw.days.length < 1 || raw.days.length > MAX_PLAN_DAYS) {
    return { error: `Thực đơn cần từ 1 đến ${MAX_PLAN_DAYS} ngày.` };
  }

  let items = 0;
  const days = [];
  for (let i = 0; i < raw.days.length; i++) {
    const d = raw.days[i];
    if (!d || typeof d !== 'object' || Array.isArray(d)) return { error: `Ngày ${i + 1} không hợp lệ.` };
    const { meals, error } = sanitizeMeals(d.meals);
    if (error) return { error };
    items += Object.values(meals).reduce((n, list) => n + list.length, 0);
    days.push({ name: text(d.name).slice(0, 30) || `Ngày ${i + 1}`, meals });
  }
  if (items === 0) return { error: 'Thực đơn cần ít nhất một món.' };

  return { plan: { name, description, targetCalories, days } };
};

module.exports = { cleanMealPlan, MAX_MEAL_PLANS_PER_USER, MAX_PLAN_DAYS };
