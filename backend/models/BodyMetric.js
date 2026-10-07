const mongoose = require('mongoose');

// One body measurement per user per day (weight is required, the rest optional).
const bodyMetricSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  weight: { type: Number, required: true, min: 10, max: 500 }, // kg
  bodyFat: { type: Number, min: 2, max: 70, default: null },   // %
  waist: { type: Number, min: 30, max: 250, default: null },   // cm
}, { timestamps: true });

bodyMetricSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('BodyMetric', bodyMetricSchema);
