const BodyMetric = require('../models/BodyMetric');
const User = require('../models/User');
const { isValidDate } = require('./dateRange');

const utcToday = () => new Date().toISOString().slice(0, 10);

/** A measurement may not be dated more than a day ahead of UTC (clients in UTC+14 are still "today"). */
const isTooFarAhead = (date) => date > new Date(Date.now() + 86400000).toISOString().slice(0, 10);

/**
 * The profile weight is always the weight of the most recent measurement, so TDEE and calorie targets
 * follow the latest weigh-in, while correcting an old entry never changes the current weight.
 */
const syncProfileWeight = async (userId) => {
  const latest = await BodyMetric.findOne({ user: userId }).sort({ date: -1 });
  if (latest) await User.updateOne({ _id: userId }, { weight: latest.weight });
  return latest ? latest.weight : null;
};

/** Upsert the weight of one day (used when the profile/onboarding form changes the weight). */
const recordWeight = async (userId, weight, date) => {
  const day = isValidDate(date) && !isTooFarAhead(date) ? date : utcToday();
  await BodyMetric.findOneAndUpdate(
    { user: userId, date: day },
    { user: userId, date: day, weight },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  return syncProfileWeight(userId);
};

module.exports = { syncProfileWeight, recordWeight, isTooFarAhead, utcToday };
