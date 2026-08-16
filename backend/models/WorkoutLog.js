const mongoose = require('mongoose');

const workoutLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  routineId: {
    type: String,
    default: 'ppl'
  },
  routineName: {
    type: String,
    default: ''
  },
  dayName: {
    type: String,
    default: ''
  },
  dayIndex: {
    type: Number,
    default: 0
  },
  selectedIds: [{
    type: String
  }],
  completedIds: [{
    type: String
  }],
  detailsMap: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  exercises: [{
    id: String,
    name: String,
    sets: Number,
    reps: String,
    muscle: String,
    normMuscle: String,
    completed: Boolean
  }],
  isSaved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Ensure a single workout log per user per date
workoutLogSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('WorkoutLog', workoutLogSchema);
