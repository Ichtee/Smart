const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getMyMealPlans, createMealPlan, updateMealPlan, deleteMealPlan } = require('../controllers/mealPlanController');

router.use(protect);

router.route('/').get(getMyMealPlans).post(createMealPlan);
router.route('/:id').put(updateMealPlan).delete(deleteMealPlan);

module.exports = router;
