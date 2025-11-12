const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const trainingController = require('../controllers/trainingController');
const { protect } = require('../middleware/auth');

// Storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/training'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    allowedMimes.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Invalid file type.'), false);
  },
});

router.post('/upload', protect, upload.single('file'), trainingController.uploadDocument);
router.get('/history', protect, trainingController.getUploadHistory);

module.exports = router;
