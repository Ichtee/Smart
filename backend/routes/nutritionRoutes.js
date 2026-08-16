const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getNutritionLog,
  saveNutritionLog,
  getAllNutritionLogs
} = require('../controllers/nutritionController');

router.use(protect);

router.get('/logs', getAllNutritionLogs);

router.route('/')
  .get(getNutritionLog)
  .post(saveNutritionLog);

module.exports = router;
