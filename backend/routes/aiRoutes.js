const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { aiLimiter } = require('../middleware/rateLimiter');
const { chat, parseMeal, generateRoutine } = require('../controllers/aiController');

router.use(protect, aiLimiter);

router.post('/chat', chat);
router.post('/meal', parseMeal);
router.post('/routine', generateRoutine);

module.exports = router;
