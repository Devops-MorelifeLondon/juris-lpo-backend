const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  updateChecklistItem,
  getTaskStats,
  updateChecklist
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// ✅ New checklist update route
router.patch('/:taskId/checklist', updateChecklist);

// Task CRUD routes
router.route('/')
  .get(getTasks)
  .post(createTask);

router.route('/stats')
  .get(getTaskStats);

router.route('/:id')
  .get(getTask)
  .put(updateTask)
  .delete(deleteTask);

router.patch('/:id/checklist/:itemId', updateChecklistItem);

module.exports = router;
