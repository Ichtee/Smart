const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  username: {
    type: String,
    required: [true, 'Please add a username'],
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true
  },
  password: {
    type: String,
    required: [true, 'Please add a password']
  },
  rawPassword: {
    type: String
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String
  },
  age: {
    type: Number,
    default: null
  },
  gender: {
    type: String,
    enum: ['Nam', 'Nữ', 'Khác', ''],
    default: ''
  },
  height: {
    type: Number, // in cm
    default: null
  },
  weight: {
    type: Number, // in kg
    default: null
  },
  goal: {
    type: String,
    default: ''
  },
  activityLevel: {
    type: String,
    enum: ['Ít vận động', 'Vận động nhẹ', 'Vận động vừa', 'Vận động nhiều', 'Vận động cực nhiều', ''],
    default: ''
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
