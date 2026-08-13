const express = require('express');
const router = express.Router();
const {
  getRoutines,
  createRoutine,
  updateRoutine,
  deleteRoutine
} = require('../controllers/routineController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').get(getRoutines).post(protect, admin, createRoutine);
router.route('/:id').put(protect, admin, updateRoutine).delete(protect, admin, deleteRoutine);

module.exports = router;
