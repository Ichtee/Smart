// Lifting weights per set and personal records (PRs).
//
// The weight of each set lives next to the per-set progress inside a day's `detailsMap`:
//   detailsMap[exerciseId] = { sets, reps, completedSets: [0, 1], setWeights: { "0": 60, "1": 62.5 } }
// (setWeights is keyed by the set's index). Only weights of sets that were completed count towards records.

const MAX_SET_WEIGHT = 1000; // kg
const MAX_SETS = 50;
const MAX_SESSIONS_RETURNED = 60;

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** A usable set weight: a number (or numeric string) above 0 and at most 1000 kg, rounded to 0.01. */
const parseSetWeight = (v) => {
  if (typeof v !== 'number' && typeof v !== 'string') return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_SET_WEIGHT) return null;
  return Math.round(n * 100) / 100;
};

/**
 * Cleans `setWeights` inside every exercise of a detailsMap before it is stored: keeps only valid
 * (index -> weight) pairs. Everything else in the map is passed through untouched.
 */
const sanitizeDetailsMap = (detailsMap) => {
  if (!isPlainObject(detailsMap)) return detailsMap;
  const out = {};
  for (const [id, detail] of Object.entries(detailsMap)) {
    if (!isPlainObject(detail) || detail.setWeights === undefined) {
      out[id] = detail;
      continue;
    }
    const weights = {};
    if (isPlainObject(detail.setWeights)) {
      for (const [idx, raw] of Object.entries(detail.setWeights)) {
        const i = Number(idx);
        const w = parseSetWeight(raw);
        if (Number.isInteger(i) && i >= 0 && i < MAX_SETS && w !== null) weights[String(i)] = w;
      }
    }
    out[id] = { ...detail, setWeights: weights };
  }
  return out;
};

/** The heaviest completed, weighted set of one exercise in one log (null when there is none). */
const heaviestSet = (detail) => {
  if (!isPlainObject(detail) || !isPlainObject(detail.setWeights) || !Array.isArray(detail.completedSets)) return null;
  let best = null;
  for (const idx of detail.completedSets) {
    const w = parseSetWeight(detail.setWeights[String(idx)]);
    if (w !== null && (best === null || w > best)) best = w;
  }
  return best;
};

/**
 * Records per exercise (matched by name, ignoring case and extra spaces) from workout logs of one user.
 * Each result: { name, best: { weight, date }, last: { weight, date }, sessions: [{ date, maxWeight, pr }] }
 * `sessions` is oldest first (the most recent MAX_SESSIONS_RETURNED); `pr` marks a session that beat every
 * earlier one. On equal weights the earlier date keeps the record.
 */
const computeRecords = (logs) => {
  const byExercise = new Map();

  for (const log of logs) {
    if (!log || !Array.isArray(log.exercises) || !isPlainObject(log.detailsMap)) continue;
    for (const ex of log.exercises) {
      if (!ex || typeof ex.name !== 'string' || !ex.name.trim()) continue;
      const maxWeight = heaviestSet(log.detailsMap[ex.id]);
      if (maxWeight === null) continue;
      const key = ex.name.trim().replace(/\s+/g, ' ').toLowerCase();
      if (!byExercise.has(key)) byExercise.set(key, { name: ex.name.trim().replace(/\s+/g, ' '), days: new Map() });
      const days = byExercise.get(key).days;
      // the same exercise twice in one day (rare): keep the heavier
      days.set(log.date, Math.max(days.get(log.date) ?? 0, maxWeight));
    }
  }

  const results = [];
  for (const { name, days } of byExercise.values()) {
    const ordered = [...days.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
    let record = 0;
    let best = null;
    const sessions = ordered.map(([date, maxWeight]) => {
      const pr = maxWeight > record;
      if (pr) { record = maxWeight; best = { weight: maxWeight, date }; }
      return { date, maxWeight, pr };
    });
    const lastSession = sessions[sessions.length - 1];
    results.push({
      name,
      best,
      last: { weight: lastSession.maxWeight, date: lastSession.date },
      sessions: sessions.slice(-MAX_SESSIONS_RETURNED),
    });
  }
  return results.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
};

module.exports = { parseSetWeight, sanitizeDetailsMap, heaviestSet, computeRecords, MAX_SET_WEIGHT };
