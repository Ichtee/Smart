const mongoose = require('mongoose');

const nutritionLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  waterGlasses: {
    type: Number,
    default: 0
  },
  mlPerGlass: {
    type: Number,
    default: 250
  },
  meals: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      'Bữa Sáng': [],
      'Bữa Trưa': [],
      'Bữa Tối': [],
      'Ăn Vặt': []
    }
  }
}, {
  timestamps: true
});

// Ensure a single nutrition log per user per date
nutritionLogSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('NutritionLog', nutritionLogSchema);
