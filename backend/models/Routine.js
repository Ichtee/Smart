const mongoose = require('mongoose');

const targetSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  count: { type: Number, required: true }
}, { _id: false });

const workoutExerciseSchema = new mongoose.Schema({
  exerciseName: { type: String, required: true },
  muscle: { type: String, required: true, default: 'chest' },
  secondaryMuscles: [{ type: String }],
  sets: { type: Number, required: true, default: 3 },
  repsRange: { type: String, required: true, default: '8-12' },
  rir: { type: String, default: '1' },
  restTimeSeconds: { type: Number, default: 180 },
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
    default: 3
  },
  generalNotes: [{
    type: String
  }],
  schedule: [scheduleDaySchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Routine', routineSchema);

