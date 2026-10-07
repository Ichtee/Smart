// Validation for what the nutrition page saves. Meals are stored as a Mixed field, so nothing else
// stops a client from saving negative or text calories, huge lists or arbitrary keys.

const MEAL_KEYS = ['Bữa Sáng', 'Bữa Trưa', 'Bữa Tối', 'Ăn Vặt'];
const MAX_ITEMS_PER_MEAL = 100;
const MAX_CALORIES = 20000;
const MAX_MACRO = 5000;
const MAX_WATER_GLASSES = 100;
const MIN_ML_PER_GLASS = 50;
const MAX_ML_PER_GLASS = 2000;

const emptyMeals = () => Object.fromEntries(MEAL_KEYS.map(k => [k, []]));

// A finite number, or a numeric string such as "450"; anything else is null.
const toNumber = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const sanitizeItem = (raw, meal) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: `Món ăn trong "${meal}" không hợp lệ.` };
  const name = text(raw.name, 200);
  if (!name) return { error: `Mỗi món ăn trong "${meal}" cần có tên.` };

  const item = { id: text(String(raw.id ?? ''), 100) || String(Date.now()), name };

  // a missing calories field counts as 0 (older entries); a present one must be a sane number
  const calories = raw.calories === undefined || raw.calories === null ? 0 : toNumber(raw.calories);
  if (calories === null || calories < 0 || calories > MAX_CALORIES) {
    return { error: `Calo của "${name}" phải là số từ 0 đến ${MAX_CALORIES}.` };
  }
  item.calories = calories;

  for (const key of ['protein', 'carbs', 'fat']) {
    if (raw[key] === undefined || raw[key] === null) continue;
    const n = toNumber(raw[key]);
    if (n === null || n < 0 || n > MAX_MACRO) return { error: `Giá trị ${key} của "${name}" phải là số từ 0 đến ${MAX_MACRO}.` };
    item[key] = n;
  }

  const quantity = text(raw.quantity, 100);
  if (quantity) item.quantity = quantity;
  const image = text(raw.image, 1000);
  if (image) item.image = image;
  return { item };
};

// -> { meals } with only the four known meals and clean items, or { error }
const sanitizeMeals = (meals) => {
  if (meals === undefined || meals === null) return { meals: emptyMeals() };
  if (typeof meals !== 'object' || Array.isArray(meals)) return { error: 'Dữ liệu bữa ăn không hợp lệ.' };

  const clean = emptyMeals();
  for (const meal of MEAL_KEYS) {
    const list = meals[meal];
    if (list === undefined || list === null) continue;
    if (!Array.isArray(list)) return { error: `Danh sách "${meal}" không hợp lệ.` };
    if (list.length > MAX_ITEMS_PER_MEAL) return { error: `Mỗi bữa tối đa ${MAX_ITEMS_PER_MEAL} món.` };
    for (const raw of list) {
      const { item, error } = sanitizeItem(raw, meal);
      if (error) return { error };
      clean[meal].push(item);
    }
  }
  return { meals: clean };
};

// -> { waterGlasses, mlPerGlass } with the defaults filled in, or { error }
const sanitizeWater = (waterGlasses, mlPerGlass) => {
  const glasses = waterGlasses === undefined || waterGlasses === null ? 0 : toNumber(waterGlasses);
  if (glasses === null || glasses < 0 || glasses > MAX_WATER_GLASSES) {
    return { error: `Số ly nước phải từ 0 đến ${MAX_WATER_GLASSES}.` };
  }
  const ml = !mlPerGlass ? 250 : toNumber(mlPerGlass);
  if (ml === null || ml < MIN_ML_PER_GLASS || ml > MAX_ML_PER_GLASS) {
    return { error: `Dung tích mỗi ly phải từ ${MIN_ML_PER_GLASS} đến ${MAX_ML_PER_GLASS} ml.` };
  }
  return { waterGlasses: glasses, mlPerGlass: ml };
};

module.exports = { sanitizeMeals, sanitizeWater, MEAL_KEYS };
