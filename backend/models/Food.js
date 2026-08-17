const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null = System Global Food, ObjectId = User Custom Food
  },
  isCustom: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    required: [true, 'Tên món ăn là bắt buộc'],
    trim: true
  },
  servingSize: {
    type: String,
    default: '1 phần'
  },
  calories: {
    type: Number,
    required: [true, 'Lượng Calo là bắt buộc'],
    min: [0, 'Calo không thể âm']
  },
  protein: {
    type: Number,
    default: 0
  },
  carbs: {
    type: Number,
    default: 0
  },
  fat: {
    type: Number,
    default: 0
  },
  category: {
    type: String,
    enum: ['Bữa Sáng', 'Bữa Trưa', 'Bữa Tối', 'Ăn Vặt', 'Tất cả'],
    default: 'Tất cả'
  },
  image: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Create text index for search
foodSchema.index({ name: 'text' });

module.exports = mongoose.model('Food', foodSchema);
