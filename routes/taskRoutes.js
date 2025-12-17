const express = require('express');
const router = express.Router();
const multer = require('multer');

// Configure Multer to use memory storage
// This allows us to access file.buffer in the S3 upload function
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // Optional: Limit file size to 5MB (adjust as needed)
  }
});

const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  updateChecklistItem,
  getTaskStats,
  updateChecklist,
  getPresignedDownloadUrl
} = require('../controllers/taskController');

const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// ✅ New checklist update route
router.patch('/:taskId/checklist', updateChecklist);
router.get('/download-url', (req, res, next) => {
    console.log("HIT /download-url route"); // Add this debug log
    next();
}, getPresignedDownloadUrl);

// Task CRUD routes
router.route('/')
  .get(getTasks)
  // Add upload.array('documents') middleware here
  // 'documents' matches the key used in the Frontend FormData
  .post(upload.array('documents'), createTask);

router.route('/stats')
  .get(getTaskStats);
  

router.route('/:id')
  .get(getTask)
  // Add upload.array('documents') here as well to allow adding files on update
  .put(upload.array('documents'), updateTask)
  .delete(deleteTask);

router.patch('/:id/checklist/:itemId', updateChecklistItem);

module.exports = router;