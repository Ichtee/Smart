// Weekly training volume per muscle group: how many sets were done for each muscle in each week.
// Counting sets (not kg x reps) because the app records which sets were done and their weight, but not
// the reps actually lifted in each set; hard sets per muscle per week is also the usual volume measure.

const { toDay, fromDay } = require('./dateRange');

const MAX_SETS = 50;

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Monday (YYYY-MM-DD) of the week that contains the date; weeks run Monday to Sunday. */
const weekStart = (dateStr) => {
  const day = toDay(dateStr);
  const sinceMonday = (day + 3) % 7; // 1970-01-01 was a Thursday
  return fromDay(day - sinceMonday);
};

/** Sets done for one exercise in one log. */
const setsDone = (ex, detail, completedIds) => {
  if (isPlainObject(detail) && Array.isArray(detail.completedSets)) {
    const done = new Set(detail.completedSets.filter(i => Number.isInteger(i) && i >= 0 && i < MAX_SETS));
    if (done.size > 0) return done.size;
  }
  // ticked as a whole without per-set progress (older logs): count the planned sets
  if (completedIds.has(String(ex.id))) {
    const planned = Number(isPlainObject(detail) && detail.sets !== undefined ? detail.sets : ex.sets);
    if (Number.isInteger(planned) && planned > 0) return Math.min(planned, MAX_SETS);
  }
  return 0;
};

/**
 * `logs`: workout logs with date, exercises, completedIds, detailsMap (already limited to from..to).
 * Returns { weeks: [Monday...], muscles: [{ muscle, total, weekly: [sets per week] }] }, busiest muscle first.
 */
const computeWeeklyVolume = (logs, from, to) => {
  const weeks = [];
  for (let d = toDay(weekStart(from)); d <= toDay(to); d += 7) weeks.push(fromDay(d));
  const index = new Map(weeks.map((w, i) => [w, i]));

  const byMuscle = new Map();
  for (const log of logs) {
    if (!log || !Array.isArray(log.exercises)) continue;
    const week = index.get(weekStart(log.date));
    if (week === undefined) continue;
    const completedIds = new Set((Array.isArray(log.completedIds) ? log.completedIds : []).map(String));
    const details = isPlainObject(log.detailsMap) ? log.detailsMap : {};
    for (const ex of log.exercises) {
      if (!ex) continue;
      const muscle = String(ex.normMuscle || ex.muscle || '').trim().toLowerCase();
      if (!muscle) continue;
      const sets = setsDone(ex, details[ex.id], completedIds);
      if (sets === 0) continue;
      if (!byMuscle.has(muscle)) byMuscle.set(muscle, new Array(weeks.length).fill(0));
      byMuscle.get(muscle)[week] += sets;
    }
  }

  const muscles = [...byMuscle.entries()]
    .map(([muscle, weekly]) => ({ muscle, total: weekly.reduce((a, b) => a + b, 0), weekly }))
    .sort((a, b) => b.total - a.total || a.muscle.localeCompare(b.muscle));
  return { weeks, muscles };
};

module.exports = { weekStart, computeWeeklyVolume };
