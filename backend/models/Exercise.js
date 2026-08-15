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
    default: 3
  },
  defaultReps: {
    type: String,
    default: '10-12'
  },
  equipment: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Exercise', exerciseSchema);
