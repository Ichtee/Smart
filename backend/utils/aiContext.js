const NutritionLog = require('../models/NutritionLog');
const WorkoutLog = require('../models/WorkoutLog');

const DAYS_BACK = 7;

const PROFILE_FIELDS = [
  ['name', 'Tên'], ['age', 'Tuổi'], ['gender', 'Giới tính'], ['height', 'Chiều cao (cm)'],
  ['weight', 'Cân nặng (kg)'], ['bodyFat', 'Mỡ cơ thể (%)'], ['goal', 'Mục tiêu'],
  ['goalPace', 'Tốc độ'], ['targetWeight', 'Cân nặng mục tiêu (kg)'], ['activityLevel', 'Mức vận động'],
];

const isSet = (v) => v !== null && v !== undefined && v !== '';
const round = (n) => Math.round(n * 10) / 10;

// -> plain text describing the user's profile and last 7 days of meals/workouts (days without data are left out)
const buildUserContext = async (user) => {
  const lines = PROFILE_FIELDS.filter(([key]) => isSet(user[key])).map(([key, label]) => `${label}: ${user[key]}`);

  // ponytail: UTC day boundary; off by one day near midnight for users far from UTC
  const since = new Date(Date.now() - DAYS_BACK * 86400000).toISOString().slice(0, 10);
  const [nutrition, workouts] = await Promise.all([
    NutritionLog.find({ user: user._id, date: { $gte: since } }).sort({ date: 1 }).lean(),
    WorkoutLog.find({ user: user._id, date: { $gte: since } }).sort({ date: 1 }).lean(),
  ]);

  const byDate = new Map();
  const dayLine = (date) => {
    if (!byDate.has(date)) byDate.set(date, []);
    return byDate.get(date);
  };

  for (const log of nutrition) {
    const items = Object.values(log.meals || {}).flat();
    if (items.length === 0) continue;
    const kcal = items.reduce((sum, i) => sum + (i.calories || 0), 0);
    const protein = items.reduce((sum, i) => sum + (i.protein || 0), 0);
    dayLine(log.date).push(`ăn ${Math.round(kcal)} kcal, ${round(protein)} g protein`);
  }
  for (const log of workouts) {
    const total = (log.selectedIds || []).length;
    const done = (log.completedIds || []).length;
    if (total === 0 && done === 0) continue;
    dayLine(log.date).push(`tập ${[log.routineName, log.dayName].filter(Boolean).join(' / ')} (${done}/${total} bài)`);
  }

  const days = [...byDate.keys()].sort().map(date => `${date}: ${byDate.get(date).join('; ')}`);
  if (days.length) lines.push('', `${DAYS_BACK} ngày gần đây:`, ...days);
  return lines.join('\n');
};

module.exports = { buildUserContext };
