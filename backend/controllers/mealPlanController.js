const mongoose = require('mongoose');
const MealPlan = require('../models/MealPlan');
const User = require('../models/User');
const { cleanMealPlan, MAX_MEAL_PLANS_PER_USER } = require('../utils/mealPlan');

const NOT_FOUND = { message: 'Không tìm thấy thực đơn.' };

const toPlan = (doc) => {
  const { _id, name, description, targetCalories, days, updatedAt } = doc.toObject ? doc.toObject() : doc;
  return { id: String(_id), name, description, targetCalories, days, updatedAt };
};

// @desc    The current user's meal plans, newest first
// @route   GET /api/meal-plans
// @access  Private
const getMyMealPlans = async (req, res) => {
  try {
    const plans = await MealPlan.find({ owner: req.user._id }).sort({ updatedAt: -1 });
    res.status(200).json(plans.map(toPlan));
  } catch (error) {
    console.error('getMyMealPlans error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Save a meal plan
// @route   POST /api/meal-plans
// @access  Private
const createMealPlan = async (req, res) => {
  try {
    const { plan, error } = cleanMealPlan(req.body);
    if (error) return res.status(400).json({ message: error });

    if (await MealPlan.countDocuments({ owner: req.user._id }) >= MAX_MEAL_PLANS_PER_USER) {
      return res.status(400).json({ message: `Bạn chỉ có thể lưu tối đa ${MAX_MEAL_PLANS_PER_USER} thực đơn.` });
    }
    const created = await MealPlan.create({ ...plan, owner: req.user._id });
    res.status(201).json(toPlan(created));
  } catch (error) {
    console.error('createMealPlan error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Replace one of the current user's meal plans
// @route   PUT /api/meal-plans/:id
// @access  Private (owner)
const updateMealPlan = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json(NOT_FOUND);
    const existing = await MealPlan.findOne({ _id: req.params.id, owner: req.user._id });
    if (!existing) return res.status(404).json(NOT_FOUND);

    const { plan, error } = cleanMealPlan(req.body);
    if (error) return res.status(400).json({ message: error });

    existing.set(plan);
    await existing.save();
    res.status(200).json(toPlan(existing));
  } catch (error) {
    console.error('updateMealPlan error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete one of the current user's meal plans (and stop using it if it was the active one)
// @route   DELETE /api/meal-plans/:id
// @access  Private (owner)
const deleteMealPlan = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json(NOT_FOUND);
    const result = await MealPlan.deleteOne({ _id: req.params.id, owner: req.user._id });
    if (result.deletedCount === 0) return res.status(404).json(NOT_FOUND);

    await User.updateOne({ _id: req.user._id, activeMealPlanId: String(req.params.id) }, { $set: { activeMealPlanId: '' } });
    res.status(200).json({ message: 'Đã xóa thực đơn.' });
  } catch (error) {
    console.error('deleteMealPlan error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getMyMealPlans, createMealPlan, updateMealPlan, deleteMealPlan };
