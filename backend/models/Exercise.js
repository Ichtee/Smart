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
    default: 1,
    min: [1, 'Số hiệp tối thiểu là 1'],
    max: [50, 'Số hiệp tối đa là 50']
  },
  defaultReps: {
    type: String,
    default: '10',
    minlength: [1, 'Số lần không được để trống'],
    maxlength: [20, 'Số lần không được quá 20 ký tự']
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
  }],
  // demo photos (free-exercise-db), shown when there is no video
  images: [{
    type: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Exercise', exerciseSchema);
