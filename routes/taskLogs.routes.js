// routes/taskLog.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const taskLogController = require('../controllers/taskLogController');

// Protect all routes
router.use(protect);

// GET /api/tasklogs/:taskId/logs - Get logs for a task
router.get('/:taskId/logs', taskLogController.getTaskLogs);

// POST /api/tasklogs/:taskId/logs - Create new log
router.post('/:taskId/logs', taskLogController.createTaskLog);

// PUT /api/tasklogs/:taskId/logs/:logId - Update log
router.put('/:taskId/logs/:logId', taskLogController.updateTaskLog);

// DELETE /api/tasklogs/:taskId/logs/:logId - Delete log
router.delete('/:taskId/logs/:logId', taskLogController.deleteTaskLog);

module.exports = router;
