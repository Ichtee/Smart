const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getBodyMetrics, saveBodyMetric, deleteBodyMetric } = require('../controllers/bodyMetricController');

router.use(protect);

router.route('/')
  .get(getBodyMetrics)
  .post(saveBodyMetric)
  .delete(deleteBodyMetric);

module.exports = router;
