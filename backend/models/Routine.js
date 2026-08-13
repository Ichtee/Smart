const mongoose = require('mongoose');

const targetSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  count: { type: Number, required: true }
}, { _id: false });

const scheduleDaySchema = new mongoose.Schema({
  day: { type: String, required: true },
  name: { type: String, required: true },
  targets: [targetSchema]
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
  schedule: [scheduleDaySchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Routine', routineSchema);
