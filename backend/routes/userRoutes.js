const express = require('express');
const router = express.Router();
const { registerUser, loginUser, logoutUser, checkVerificationToken, completeRegistration, resendVerification, getProfile, updateProfile, getAllUsers, deleteUser, deleteMyAccount, exportMyData, updateUserRoleAndStatus, forgotPassword, resetPassword } = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');
const { loginLimiter, registerLimiter, emailFlowLimiter } = require('../middleware/rateLimiter');

router.post('/register', registerLimiter, registerUser);
router.post('/login', loginLimiter, loginUser);
router.post('/logout', logoutUser);
router.get('/verify/:token', checkVerificationToken);
router.post('/verify/:token', emailFlowLimiter, completeRegistration);
router.post('/resend-verification', emailFlowLimiter, resendVerification);
router.post('/forgot-password', loginLimiter, forgotPassword);
router.post('/reset-password/:token', emailFlowLimiter, resetPassword);
router.post('/reset-password', emailFlowLimiter, resetPassword);

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.get('/me/export', protect, exportMyData);
router.delete('/me', protect, loginLimiter, deleteMyAccount);

// Admin routes
router.get('/', protect, admin, getAllUsers);
router.put('/:id', protect, admin, updateUserRoleAndStatus);
router.delete('/:id', protect, admin, deleteUser);

module.exports = router;

