const express = require('express');
const router = express.Router();
const {
  getRoutines,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  createMyRoutine,
  updateMyRoutine,
  deleteMyRoutine
} = require('../controllers/routineController');
const { protect, optionalAuth, admin } = require('../middleware/authMiddleware');

router.route('/').get(optionalAuth, getRoutines).post(protect, admin, createRoutine);

// Routines created by regular users (declared before /:id so "mine" is not read as an id)
router.post('/mine', protect, createMyRoutine);
router.route('/mine/:id').put(protect, updateMyRoutine).delete(protect, deleteMyRoutine);

router.route('/:id').put(protect, admin, updateRoutine).delete(protect, admin, deleteRoutine);

module.exports = router;
