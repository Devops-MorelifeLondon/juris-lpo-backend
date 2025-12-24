const express = require('express');
const router = express.Router();
const taskController = require('../controllers/adminTaskController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);
router.use(restrictTo('admin', 'root'));

// Route for fetching tasks (used by TaskAssignment.jsx)
router.get('/', taskController.getTasks);
// Add this to your existing admin task routes
router.get('/:id', taskController.getTaskById);
router.get('/:id/logs', taskController.getTaskLogs);

module.exports = router;