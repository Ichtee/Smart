const mongoose = require('mongoose');

const targetSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  count: { type: Number, required: true }
}, { _id: false });

const workoutExerciseSchema = new mongoose.Schema({
  // Link to Exercise._id so renaming an exercise doesn't break routines (name kept as fallback/display)
  exerciseId: { type: String, default: '' },
  exerciseName: { type: String, required: true },
  muscle: { type: String, required: true, default: 'chest' },
  secondaryMuscles: [{ type: String }],
  sets: { type: Number, required: true, default: 3, min: [1, 'Số hiệp tối thiểu là 1'], max: [50, 'Số hiệp tối đa là 50'] },
  repsRange: { type: String, required: true, default: '10' },
  rir: { type: String, default: '1' },
  restTimeSeconds: { type: Number, default: 180, min: [0, 'Thời gian nghỉ không thể âm'], max: [600, 'Thời gian nghỉ tối đa 10 phút'] },
  isOptional: { type: Boolean, default: false },
  requiresWarmup: { type: Boolean, default: false },
  warmupNotes: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { _id: false });

const scheduleDaySchema = new mongoose.Schema({
  day: { type: String, required: true },
  name: { type: String, required: true },
  isRestDay: { type: Boolean, default: false },
  targets: [targetSchema],
  exercises: [workoutExerciseSchema]
}, { _id: false });

const routineSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'Custom'
  },
  description: {
    type: String,
    default: ''
  },
  frequencyDaysPerWeek: {
    type: Number,
    default: 3,
    min: [1, 'Tần suất tối thiểu 1 ngày/tuần'],
    max: [7, 'Tần suất tối đa 7 ngày/tuần']
  },
  generalNotes: [{
    type: String
  }],
  schedule: [scheduleDaySchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Routine', routineSchema);

