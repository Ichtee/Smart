const express = require('express');
const router = express.Router();
const { registerUser, loginUser, verifyEmail, getProfile, updateProfile, getAllUsers, deleteUser, updateUserRoleAndStatus } = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter');

router.post('/register', registerLimiter, registerUser);
router.post('/login', loginLimiter, loginUser);
router.get('/verify/:token', verifyEmail);

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

// Admin routes
router.get('/', protect, admin, getAllUsers);
router.put('/:id', protect, admin, updateUserRoleAndStatus);
router.delete('/:id', protect, admin, deleteUser);

module.exports = router;

