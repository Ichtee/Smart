const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { aiLimiter, routineLimiter, mealPlanLimiter } = require('../middleware/rateLimiter');
const { chat, parseMeal, generateRoutine, generateMealPlan } = require('../controllers/aiController');

router.use(protect, aiLimiter);

router.post('/chat', chat);
router.post('/meal', parseMeal);
router.post('/routine', routineLimiter, generateRoutine);
router.post('/meal-plan', mealPlanLimiter, generateMealPlan);

module.exports = router;
