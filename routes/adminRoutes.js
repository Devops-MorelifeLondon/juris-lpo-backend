const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');

// Public login
router.post('/login', adminController.login);

// Protected routes
router.use(protect);
router.use(restrictTo('root', 'admin'));

// Add these to your adminRoutes.js
router.get('/stats',  adminController.getDashboardStats);
router.patch('/:id', restrictTo('root'), adminController.updateAdmin);
router.delete('/:id', restrictTo('root'), adminController.deleteAdmin);
router.get('/list', adminController.getAdmins);

// ROOT ONLY: Creating other admins
router.post('/create-admin', restrictTo('root'), adminController.createAdmin);

module.exports = router;