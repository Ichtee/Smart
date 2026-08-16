const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getNutritionLog,
  saveNutritionLog
} = require('../controllers/nutritionController');

router.use(protect);

router.route('/')
  .get(getNutritionLog)
  .post(saveNutritionLog);

module.exports = router;
