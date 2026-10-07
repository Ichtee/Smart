const BodyMetric = require('../models/BodyMetric');
const User = require('../models/User');
const { isValidDate } = require('./dateRange');

const utcToday = () => new Date().toISOString().slice(0, 10);

/** A measurement may not be dated more than a day ahead of UTC (clients in UTC+14 are still "today"). */
const isTooFarAhead = (date) => date > new Date(Date.now() + 86400000).toISOString().slice(0, 10);

/**
 * The profile weight is always the weight of the most recent measurement, and the profile body fat the
 * body fat of the most recent measurement that has one, so TDEE and calorie targets follow the latest
 * weigh-in, while correcting an old entry never changes the current values.
 */
const syncProfileFromMetrics = async (userId) => {
  const latest = await BodyMetric.findOne({ user: userId }).sort({ date: -1 });
  const latestFat = await BodyMetric.findOne({ user: userId, bodyFat: { $ne: null } }).sort({ date: -1 });
  const update = { bodyFat: latestFat ? latestFat.bodyFat : null };
  if (latest) update.weight = latest.weight;
  await User.updateOne({ _id: userId }, update);
  return latest ? latest.weight : null;
};

/**
 * Upsert the weight (and, when given, the body fat) of one day: used when the profile/onboarding form
 * changes them.
 */
const recordWeight = async (userId, weight, date, bodyFat) => {
  const day = isValidDate(date) && !isTooFarAhead(date) ? date : utcToday();
  const set = { user: userId, date: day, weight };
  if (bodyFat !== undefined) set.bodyFat = bodyFat;
  await BodyMetric.findOneAndUpdate(
    { user: userId, date: day },
    set,
    { upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  return syncProfileFromMetrics(userId);
};

// old name, kept for callers that only care about the weight
const syncProfileWeight = syncProfileFromMetrics;

module.exports = { syncProfileFromMetrics, syncProfileWeight, recordWeight, isTooFarAhead, utcToday };
