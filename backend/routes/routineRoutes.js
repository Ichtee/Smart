const express = require('express');
const router = express.Router();
const {
  getRoutines,
  createRoutine,
  updateRoutine,
  deleteRoutine
} = require('../controllers/routineController');

router.route('/').get(getRoutines).post(createRoutine);
router.route('/:id').put(updateRoutine).delete(deleteRoutine);

module.exports = router;
