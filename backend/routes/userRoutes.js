const express = require('express');
const router = express.Router();
const { registerUser, loginUser, logoutUser, verifyEmail, resendVerification, getProfile, updateProfile, getAllUsers, deleteUser, updateUserRoleAndStatus, forgotPassword, resetPassword } = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter');

router.post('/register', registerLimiter, registerUser);
router.post('/login', loginLimiter, loginUser);
router.post('/logout', logoutUser);
router.get('/verify/:token', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', loginLimiter, forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/reset-password', resetPassword);

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

// Admin routes
router.get('/', protect, admin, getAllUsers);
router.put('/:id', protect, admin, updateUserRoleAndStatus);
router.delete('/:id', protect, admin, deleteUser);

module.exports = router;

