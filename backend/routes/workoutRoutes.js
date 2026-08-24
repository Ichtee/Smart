const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getWorkoutLog,
  saveWorkoutLog,
  deleteWorkoutLog,
  getStreakHistory,
  getAllWorkoutLogs
} = require('../controllers/workoutController');

router.use(protect);

router.route('/')
  .get(getWorkoutLog)
  .post(saveWorkoutLog)
  .delete(deleteWorkoutLog);

router.get('/streak', getStreakHistory);
router.get('/logs', getAllWorkoutLogs);

module.exports = router;
