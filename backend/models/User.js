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
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String
  },
  // TTL index field — MongoDB auto-deletes unverified accounts when this date passes
  // Set to Date.now() + 10min on register, cleared on verify so verified users are never deleted
  verificationTokenExpires: {
    type: Date
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
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

// TTL index: MongoDB automatically deletes documents when verificationTokenExpires date passes.
// Cleared after email verification so verified accounts are never auto-deleted.
userSchema.index({ verificationTokenExpires: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('User', userSchema);
