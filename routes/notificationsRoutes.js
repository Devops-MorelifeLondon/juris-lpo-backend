const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const { markNotificationAsRead, getNotifications } = require('../controllers/notificationController');

// All routes require authentication
router.use(protect);

// Get all notifications for the authenticated user
router.route('/')
  .get(getNotifications);

// Mark a specific notification as read
router.route('/:notificationId/read')
  .patch(markNotificationAsRead);

module.exports = router;
