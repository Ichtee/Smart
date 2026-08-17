const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  muscle: {
    type: String,
    required: true
  },
  defaultSets: {
    type: Number,
    default: 1
  },
  defaultReps: {
    type: String,
    default: '10'
  },
  equipment: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  videoUrl: {
    type: String,
    default: ''
  },
  secondaryMuscles: [{
    type: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Exercise', exerciseSchema);
