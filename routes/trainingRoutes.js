const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const trainingController = require('../controllers/trainingController');

router.post('/generate-file-upload-url', protect, trainingController.generateFileUploadUrl);
router.post('/generate-video-upload-url', protect, trainingController.generateVideoUploadUrl);

router.post('/save-metadata', protect, trainingController.saveMetadata);

router.get('/history', protect, trainingController.getUploadHistory);

router.get('/file-url', protect, trainingController.getPresignedDownloadUrl);

router.get("/paralegal-assigned", protect, trainingController.getAssignedDocuments);

// NEW: For Attorneys to monitor progress
router.get("/attorney-assigned", protect, trainingController.getAttorneyDocuments);


module.exports = router;
