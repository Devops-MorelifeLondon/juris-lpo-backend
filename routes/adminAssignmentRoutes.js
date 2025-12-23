const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/adminAssignmentController');
// Middleware to ensure user is an Admin
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);
router.use(restrictTo('admin', 'root')); // Only Admin can perform these assignments

// Get list of compatible paralegals for a specific task
router.get('/candidates/:taskId', assignmentController.getAssignmentCandidates);

// Execute the assignment
router.patch('/:taskId', assignmentController.assignTaskToParalegal);

module.exports = router;