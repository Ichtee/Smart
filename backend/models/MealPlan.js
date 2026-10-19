const mongoose = require('mongoose');

// A saved meal plan (thực đơn): 1-7 days of foods per meal. Always owned by one user.
const daySchema = new mongoose.Schema({
  name: { type: String, required: true },
  // { 'Bữa Sáng': MealItem[], ... }, validated by utils/mealPlan.js (same shape as a nutrition log's meals)
  meals: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

const mealPlanSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  targetCalories: { type: Number, default: null },
  days: [daySchema],
}, { timestamps: true });

module.exports = mongoose.model('MealPlan', mealPlanSchema);
