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
  // Set when the owner of the email completes sign-up (see completeRegistration), so a pending
  // account has no password. Every verified account must have one.
  password: {
    type: String,
    required: [function () { return this.isEmailVerified; }, 'Please add a password']
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  // Baked into every JWT; bumping it signs the account out everywhere (password change/reset, lock).
  tokenVersion: {
    type: Number,
    default: 0
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
  // kcal/day added to the goal-based calorie target (set by the weight-trend advice on the body page)
  calorieAdjustment: {
    type: Number,
    min: -500,
    max: 500,
    default: 0
  },
  // How fast the goal is pursued (sets the calorie deficit/surplus on the client)
  goalPace: {
    type: String,
    enum: ['Chậm', 'Vừa', 'Nhanh', ''],
    default: 'Vừa'
  },
  // kg the user wants to reach (optional)
  targetWeight: {
    type: Number,
    min: 10,
    max: 500,
    default: null
  },
  // % body fat of the latest measurement that has one (kept in sync by syncProfileFromMetrics)
  bodyFat: {
    type: Number,
    min: 2,
    max: 70,
    default: null
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
  },
  // free = limited AI use; pro = no AI limits. Everyone signs up as free (payment to upgrade comes later; an admin can set it now).
  plan: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free'
  },
  lastActiveRoutineId: {
    type: String,
    default: 'ppl'
  },
  lastActiveRoutineName: {
    type: String,
    default: ''
  },
  lastActiveDayIndex: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// TTL index: MongoDB automatically deletes documents when verificationTokenExpires date passes.
// Cleared after email verification so verified accounts are never auto-deleted.
userSchema.index({ verificationTokenExpires: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('User', userSchema);
