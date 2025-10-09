// routes/attorney.auth.routes.js
const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
  updatePassword,
  completeProfile,
  updateProfile,
  deleteAccount,
  googlelogin
} = require('../controllers/attorney.auth.controller');

const { protect, requireCompleteProfile, requireVerifiedEmail } = require('../middleware/attorney.auth');
const { 
  validateRegistration, 
  validateLogin, 
  validateProfileCompletion,
  validateEmail,
  validatePasswordChange 
} = require('../middleware/validation');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

// Public routes with rate limiting
router.post('/register', register);
router.post('/google-login', googlelogin);
router.post('/login', login);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', passwordResetLimiter, validateEmail, forgotPassword);
router.put('/reset-password/:token', resetPassword);

// Protected routes (require authentication)
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/complete-profile', protect, validateProfileCompletion, completeProfile);
router.put('/update-profile', protect, updateProfile);
router.put('/update-password', protect, validatePasswordChange, updatePassword);
router.delete('/delete-account', protect, deleteAccount);

module.exports = router;
