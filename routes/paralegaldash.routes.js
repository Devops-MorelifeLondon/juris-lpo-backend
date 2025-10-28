// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/paralegalDashController');
const {protect} = require('../middleware/auth');

/**
 * Paralegal Dashboard Routes
 * COMPLETE functionality using only Task model
 */

// === CORE DASHBOARD ENDPOINTS ===
router.get('/stats', protect, dashboardController.getDashboardStats); // Dashboard statistics
router.get('/tasks', protect, dashboardController.getAssignedTasks); // Assigned tasks
router.get('/available-tasks', protect, dashboardController.getAvailableTasks); // Tasks to accept

// === TASK ACCEPTANCE ENDPOINTS ===
router.post('/tasks/:taskId/accept', protect, dashboardController.acceptTask); // Accept available task
router.post('/tasks/:taskId/decline', protect, dashboardController.declineTask); // Decline available task

// === HISTORY & TRACKING ===
router.get('/history', protect, dashboardController.getTaskHistory); // All task interactions

module.exports = router;

