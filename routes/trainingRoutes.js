const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const trainingController = require('../controllers/trainingController');

// Generate Signed URL (for upload)
router.post('/generate-upload-url', protect, trainingController.generateUploadUrl);

// Save metadata after upload
router.post('/save-metadata', protect, trainingController.saveMetadata);

// Fetch history
router.get('/history', protect, trainingController.getUploadHistory);

// Generate download URL
router.get('/file-url', protect, trainingController.getPresignedDownloadUrl);

module.exports = router;
